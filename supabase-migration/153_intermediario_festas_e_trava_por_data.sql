-- 153 · Intermediário Festas (R$249/mês) + trava por data (aprovado pela Andrea em 16/11/2026).
--   • Intermediário da categoria Festas & Eventos: até 4 festas destacadas por mês, no ar na véspera e no dia.
--   • Trava por data: no máximo 24 destaques no mesmo dia (plano + Intermediário + avulsas), e no máximo 6 avulsas.
--     Fundador/Premium da categoria Festas sempre têm lugar. Quem pede depois de lotar vê "Data esgotada".
--   • Bares e demais categorias continuam com 1 festa por mês (152).
-- A equipe Dicas (admin) passa dos limites. Seguro rodar mais de uma vez.

create or replace function public.marca_tem_festa_intermediaria(p_local uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.locais l
     where l.id = p_local and l.plano_comercial::text = 'intermediario' and coalesce(l.plano_comercial_status::text, 'ativo') = 'ativo'
       and (l.categoria::text = 'eventos' or exists (select 1 from public.local_categorias_extra x where x.local_id = l.id and x.categoria::text = 'eventos'))
  );
$$;
grant execute on function public.marca_tem_festa_intermediaria(uuid) to authenticated;

-- Quantos destaques de festa caem numa data (horário de Brasília): total e só avulsas.
create or replace function public.destaques_na_data(p_data date)
returns json language sql stable security definer set search_path = public as $$
  select json_build_object(
    'total', count(*) filter (where destaque_secoes && array['plano_festa', 'patrocinado']),
    'avulsas', count(*) filter (where 'patrocinado' = any(destaque_secoes) and not ('plano_festa' = any(destaque_secoes)))
  )
  from public.eventos
  where status = 'aprovado' and (data_inicio at time zone 'America/Sao_Paulo')::date = p_data;
$$;
grant execute on function public.destaques_na_data(date) to anon, authenticated;

create or replace function public.destacar_festa_do_plano(p_evento uuid, p_ligar boolean)
returns json language plpgsql security definer set search_path to 'public' as $function$
declare
  ev record;
  usadas int;
  festas_mes int;
  limite constant int := 4;
  eh_festas boolean;
  plano_cheio boolean;
  intermediaria boolean;
  na_data json;
begin
  select e.id, e.local_id, e.status, e.data_inicio, e.data_fim, e.destaque_secoes
    into ev from public.eventos e where e.id = p_evento;
  if ev.id is null then raise exception 'Festa não encontrada.'; end if;
  if ev.local_id is null then raise exception 'A festa precisa estar ligada a uma marca com plano.'; end if;
  if not public.is_admin() and not exists (
    select 1 from public.locais l where l.id = ev.local_id and l.owner_id = auth.uid()
  ) then
    raise exception 'Só o dono da marca pode destacar esta festa.';
  end if;

  if p_ligar then
    if ev.status <> 'aprovado' then raise exception 'A festa precisa estar aprovada.'; end if;
    if coalesce(ev.data_fim, ev.data_inicio) < now() then raise exception 'Esta festa já aconteceu.'; end if;
    plano_cheio := public.marca_tem_festa_do_plano(ev.local_id);
    intermediaria := not plano_cheio and public.marca_tem_festa_intermediaria(ev.local_id);
    if not plano_cheio and not intermediaria then
      raise exception 'Destaque de festa é para Fundador, Premium ou Intermediário Festas.';
    end if;
    if 'plano_festa' = any(coalesce(ev.destaque_secoes, '{}')) then
      return json_build_object('ok', true, 'usadas', public.festas_do_plano_no_mes(ev.local_id, ev.data_inicio), 'limite', limite);
    end if;
    usadas := public.festas_do_plano_no_mes(ev.local_id, ev.data_inicio);
    if usadas >= limite and not public.is_admin() then
      raise exception 'Seu plano já usou os % destaques deste mês.', limite;
    end if;
    select (l.categoria::text = 'eventos' or exists (select 1 from public.local_categorias_extra x where x.local_id = l.id and x.categoria::text = 'eventos'))
      into eh_festas from public.locais l where l.id = ev.local_id;
    -- Fora da categoria Festas & Eventos: no máximo 1 festa por mês (152).
    if not coalesce(eh_festas, false) and not public.is_admin() then
      select count(*) into festas_mes from public.eventos e
       where e.local_id = ev.local_id and 'plano_festa' = any(e.destaque_secoes) and e.status <> 'cancelado'
         and date_trunc('month', e.data_inicio at time zone 'America/Sao_Paulo') = date_trunc('month', ev.data_inicio at time zone 'America/Sao_Paulo');
      if festas_mes >= 1 then
        raise exception 'Bares e outras categorias destacam 1 festa por mês. Use os outros destaques na Agenda da semana.';
      end if;
    end if;
    -- Trava por data: Fundador/Premium de Festas sempre entram; os demais só até 24 no dia.
    if not public.is_admin() and not (plano_cheio and coalesce(eh_festas, false)) then
      na_data := public.destaques_na_data((ev.data_inicio at time zone 'America/Sao_Paulo')::date);
      if (na_data->>'total')::int >= 24 then
        raise exception 'Data esgotada: já são 24 festas em destaque nesse dia. Escolha outra festa ou fale com a equipe.';
      end if;
    end if;
  end if;

  perform set_config('dicas.festa_do_plano', 'on', true);
  update public.eventos
     set destaque_secoes = case
       when p_ligar then array(select distinct x from unnest(coalesce(destaque_secoes, '{}') || array['plano_festa']) x)
       else array(select x from unnest(coalesce(destaque_secoes, '{}')) x where x <> 'plano_festa')
     end
   where id = p_evento;
  perform set_config('dicas.festa_do_plano', 'off', true);

  return json_build_object('ok', true, 'usadas', public.festas_do_plano_no_mes(ev.local_id, ev.data_inicio), 'limite', limite);
end;
$function$;
notify pgrst, 'reload schema';
