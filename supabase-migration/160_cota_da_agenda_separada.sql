-- 160 · Cotas separadas (18/11/2026): a agenda da semana tem a cota dela e os eventos têm a deles (157).
--   • Agenda destacada (bares Fundador/Premium): 4 por mês.
--   • Evento em destaque: 1 por mês × 7 dias (Festas: 4 vagas — ver 157).
--   Antes, festas e agenda dividiam os mesmos 4. Agora festas_do_plano_no_mes conta SÓ a agenda
--   (o nome continua por compatibilidade com destacar_agenda_do_plano).
-- Seguro rodar mais de uma vez.
create or replace function public.festas_do_plano_no_mes(p_local uuid, p_data timestamptz)
returns integer
language sql stable security definer set search_path = public
as $$
  select count(*)::int from public.destaques_agenda d
   where d.local_id = p_local
     and date_trunc('month', d.data_inicio::timestamp) = date_trunc('month', p_data at time zone 'America/Sao_Paulo');
$$;
grant execute on function public.festas_do_plano_no_mes(uuid, timestamptz) to authenticated;
notify pgrst, 'reload schema';
