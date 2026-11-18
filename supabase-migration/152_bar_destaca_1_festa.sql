-- 152 · Regra nova de destaque (16/11/2026):
--   • Casas da categoria Festas & Eventos (produtoras): até 4 festas destacadas por mês (como antes).
--   • Bares e demais categorias (Fundador/Premium): os 4 destaques do mês continuam, mas só 1 pode ser FESTA;
--     os outros vão para a Agenda da semana (que agora aparece em Bares › Agenda, não no carrossel de Festas).
-- A equipe Dicas (admin) passa do limite. Seguro rodar mais de uma vez.
create or replace function public.destacar_festa_do_plano(p_evento uuid, p_ligar boolean)
returns json language plpgsql security definer set search_path to 'public' as $function$
declare
  ev record;
  usadas int;
  festas_mes int;
  limite constant int := 4;
  eh_festas boolean;
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
    if not public.marca_tem_festa_do_plano(ev.local_id) then
      raise exception 'Destaque de festa do plano é para marcas Fundador ou Premium.';
    end if;
    if 'plano_festa' = any(coalesce(ev.destaque_secoes, '{}')) then
      return json_build_object('ok', true, 'usadas', public.festas_do_plano_no_mes(ev.local_id, ev.data_inicio), 'limite', limite);
    end if;
    usadas := public.festas_do_plano_no_mes(ev.local_id, ev.data_inicio);
    if usadas >= limite and not public.is_admin() then
      raise exception 'Seu plano já usou os % destaques deste mês.', limite;
    end if;
    -- Fora da categoria Festas & Eventos: no máximo 1 festa por mês (os outros destaques são da agenda).
    select (l.categoria::text = 'eventos' or exists (select 1 from public.local_categorias_extra x where x.local_id = l.id and x.categoria::text = 'eventos'))
      into eh_festas from public.locais l where l.id = ev.local_id;
    if not coalesce(eh_festas, false) and not public.is_admin() then
      select count(*) into festas_mes from public.eventos e
       where e.local_id = ev.local_id and 'plano_festa' = any(e.destaque_secoes) and e.status <> 'cancelado'
         and date_trunc('month', e.data_inicio at time zone 'America/Sao_Paulo') = date_trunc('month', ev.data_inicio at time zone 'America/Sao_Paulo');
      if festas_mes >= 1 then
        raise exception 'Bares e outras categorias destacam 1 festa por mês. Use os outros destaques na Agenda da semana.';
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
