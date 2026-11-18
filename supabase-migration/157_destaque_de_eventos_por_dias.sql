-- 157 · Destaque de eventos por dias (aprovado pela Andrea em 18/11/2026). Substitui as regras de 152/153.
--   Qualquer categoria (bar, loja, restaurante…) pode subir eventos. Sem destaque: quantos quiser.
--   Destaque incluído no plano, contado em "vagas" no mês da data do evento:
--     • Fundador/Premium de qualquer categoria ............ 1 vaga · até 7 dias
--     • Intermediário da categoria Festas (R$199/mês) ..... 2 vagas · até 7 dias cada
--     • Fundador/Premium da categoria Festas .............. 4 vagas · 7 dias (1 vaga) ou 15 dias (2 vagas)
--       → 4 eventos × 7 dias, ou 2 × 15 dias, ou 1 × 15 + 2 × 7. A casa escolhe.
--     • Intermediário de outras categorias e Gratuito ...... 0 (podem comprar avulso)
--   Avulso (qualquer casa, a equipe liga): R$129 por 7 dias ou R$199 por 21 dias → destaque_secoes 'patrocinado'.
--   A janela termina no dia do evento: destaque_inicio (a casa escolhe) até a data do evento.
--   Trava por dia: no máximo 24 eventos em destaque no mesmo dia e 6 avulsos. Fundador/Premium de Festas sempre entram.
-- A equipe Dicas (admin) passa dos limites do plano. Seguro rodar mais de uma vez.

alter table public.eventos add column if not exists destaque_inicio date;
alter table public.eventos add column if not exists destaque_dias int;

-- Dia do evento (Brasília) e início efetivo da janela (eventos antigos sem início: véspera).
create or replace function public.evento_dia(p_inicio timestamptz)
returns date language sql immutable as $$ select (p_inicio at time zone 'America/Sao_Paulo')::date $$;

-- Quantos destaques cobrem um dia: total e só avulsos.
create or replace function public.destaques_na_data(p_data date)
returns json language sql stable security definer set search_path = public as $$
  select json_build_object(
    'total', count(*) filter (where destaque_secoes && array['plano_festa', 'patrocinado']),
    'avulsas', count(*) filter (where 'patrocinado' = any(destaque_secoes) and not ('plano_festa' = any(destaque_secoes)))
  )
  from public.eventos
  where status = 'aprovado'
    and p_data between coalesce(destaque_inicio, public.evento_dia(data_inicio) - 1) and public.evento_dia(data_inicio);
$$;
grant execute on function public.destaques_na_data(date) to anon, authenticated;

-- Cota de destaque de eventos do local: vagas por mês e máximo de dias por destaque.
create or replace function public.cota_eventos_do_local(p_local uuid)
returns json language plpgsql stable security definer set search_path = public as $$
declare
  eh_festas boolean;
  plano_cheio boolean;
  inter boolean;
begin
  select (l.categoria::text = 'eventos' or exists (select 1 from public.local_categorias_extra x where x.local_id = l.id and x.categoria::text = 'eventos'))
    into eh_festas from public.locais l where l.id = p_local;
  plano_cheio := public.marca_tem_festa_do_plano(p_local);
  inter := public.marca_tem_festa_intermediaria(p_local);
  if plano_cheio and coalesce(eh_festas, false) then return json_build_object('vagas', 4, 'max_dias', 15, 'tipo', 'festas_premium'); end if;
  if inter then return json_build_object('vagas', 2, 'max_dias', 7, 'tipo', 'festas_intermediario'); end if;
  if plano_cheio then return json_build_object('vagas', 1, 'max_dias', 7, 'tipo', 'premium'); end if;
  return json_build_object('vagas', 0, 'max_dias', 0, 'tipo', 'nenhum');
end;
$$;
grant execute on function public.cota_eventos_do_local(uuid) to authenticated;

-- Vagas de eventos usadas no mês de uma data (15 dias = 2 vagas).
create or replace function public.vagas_eventos_no_mes(p_local uuid, p_data timestamptz)
returns int language sql stable security definer set search_path = public as $$
  select coalesce(sum(case when coalesce(e.destaque_dias, 7) > 7 then 2 else 1 end), 0)::int
    from public.eventos e
   where e.local_id = p_local and 'plano_festa' = any(e.destaque_secoes) and e.status <> 'cancelado'
     and date_trunc('month', e.data_inicio at time zone 'America/Sao_Paulo') = date_trunc('month', p_data at time zone 'America/Sao_Paulo');
$$;
grant execute on function public.vagas_eventos_no_mes(uuid, timestamptz) to authenticated;

drop function if exists public.destacar_festa_do_plano(uuid, boolean);
drop function if exists public.destacar_festa_do_plano(uuid, boolean, int, date);
create function public.destacar_festa_do_plano(p_evento uuid, p_ligar boolean, p_dias int default 7, p_inicio date default null)
returns json language plpgsql security definer set search_path to 'public' as $function$
declare
  ev record;
  cota json;
  vagas int;
  max_dias int;
  dias int;
  custo int;
  usadas int;
  dia_ev date;
  ini date;
  d date;
  eh_festas_premium boolean;
  na_data json;
begin
  select e.id, e.local_id, e.status, e.data_inicio, e.data_fim, e.destaque_secoes, e.destaque_dias
    into ev from public.eventos e where e.id = p_evento;
  if ev.id is null then raise exception 'Evento não encontrado.'; end if;
  if ev.local_id is null then raise exception 'O evento precisa estar ligado a um local.'; end if;
  if not public.is_admin() and not exists (select 1 from public.locais l where l.id = ev.local_id and l.owner_id = auth.uid()) then
    raise exception 'Só o dono do local pode destacar este evento.';
  end if;

  cota := public.cota_eventos_do_local(ev.local_id);
  vagas := (cota->>'vagas')::int;
  max_dias := (cota->>'max_dias')::int;
  eh_festas_premium := cota->>'tipo' = 'festas_premium';

  if p_ligar then
    if ev.status <> 'aprovado' then raise exception 'O evento precisa estar aprovado.'; end if;
    if coalesce(ev.data_fim, ev.data_inicio) < now() then raise exception 'Este evento já aconteceu.'; end if;
    if vagas = 0 and not public.is_admin() then
      raise exception 'O destaque de evento incluído é para Fundador e Premium (e Intermediário de Festas). Fale com a equipe para um destaque avulso: R$129 por 7 dias ou R$199 por 21 dias.';
    end if;
    dias := case when coalesce(p_dias, 7) > 7 then 15 else 7 end;
    if dias > greatest(max_dias, 7) and not public.is_admin() then
      raise exception 'Seu plano destaca por até % dias.', max_dias;
    end if;
    custo := case when dias > 7 then 2 else 1 end;
    usadas := public.vagas_eventos_no_mes(ev.local_id, ev.data_inicio)
              - case when 'plano_festa' = any(coalesce(ev.destaque_secoes, '{}')) then (case when coalesce(ev.destaque_dias, 7) > 7 then 2 else 1 end) else 0 end;
    if usadas + custo > vagas and not public.is_admin() then
      raise exception 'Seu plano já usou % de % destaques de eventos neste mês.', usadas, vagas;
    end if;
    dia_ev := public.evento_dia(ev.data_inicio);
    -- Janela: termina no dia do evento; começa na data escolhida (ou o máximo de dias antes), nunca antes de hoje.
    ini := greatest(coalesce(p_inicio, dia_ev - (dias - 1)), dia_ev - (dias - 1), (now() at time zone 'America/Sao_Paulo')::date);
    if ini > dia_ev then ini := dia_ev; end if;
    -- Trava por dia (24), menos para Fundador/Premium de Festas e a equipe.
    if not public.is_admin() and not eh_festas_premium then
      d := ini;
      while d <= dia_ev loop
        na_data := public.destaques_na_data(d);
        if (na_data->>'total')::int >= 24 and not ('plano_festa' = any(coalesce(ev.destaque_secoes, '{}'))) then
          raise exception 'O dia % já tem 24 eventos em destaque. Escolha começar depois ou fale com a equipe.', to_char(d, 'DD/MM');
        end if;
        d := d + 1;
      end loop;
    end if;
  end if;

  perform set_config('dicas.festa_do_plano', 'on', true);
  update public.eventos
     set destaque_secoes = case
           when p_ligar then array(select distinct x from unnest(coalesce(destaque_secoes, '{}') || array['plano_festa']) x)
           else array(select x from unnest(coalesce(destaque_secoes, '{}')) x where x <> 'plano_festa')
         end,
         destaque_inicio = case when p_ligar then ini else null end,
         destaque_dias = case when p_ligar then dias else null end
   where id = p_evento;
  perform set_config('dicas.festa_do_plano', 'off', true);

  return json_build_object('ok', true, 'usadas', public.vagas_eventos_no_mes(ev.local_id, ev.data_inicio), 'limite', vagas,
                           'inicio', ini, 'dias', dias);
end;
$function$;
grant execute on function public.destacar_festa_do_plano(uuid, boolean, int, date) to authenticated;

-- Só a função acima (ou a equipe) muda a janela do destaque.
create or replace function public.proteger_janela_destaque()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.is_admin() or auth.role() = 'service_role' or current_setting('dicas.festa_do_plano', true) = 'on' then
    return new;
  end if;
  new.destaque_inicio := old.destaque_inicio;
  new.destaque_dias := old.destaque_dias;
  return new;
end;
$$;
drop trigger if exists trg_proteger_janela_destaque on public.eventos;
create trigger trg_proteger_janela_destaque before update on public.eventos
  for each row execute function public.proteger_janela_destaque();

-- Dicas Trip (18/11): ícone Roteiros escondido (só Agências). Repetido aqui caso a 156 já tenha rodado.
insert into public.subcategoria_config (categoria, chave, ativo, atualizado_em) values ('turismo', 'roteiros', false, now())
on conflict (categoria, chave) do update set ativo = false, atualizado_em = now();

notify pgrst, 'reload schema';
