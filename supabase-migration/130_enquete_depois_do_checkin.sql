-- 130 — Quem fez check-in recebe a enquete da casa (15/11/2026). Rode depois da 129.
-- Quem esteve numa casa nos últimos 3 dias (check-in pelo app, "Estou aqui" de uma ação de marca ou entrada
-- pela Lista VIP) e ainda não respondeu a enquete no ar dessa casa, vê o convite na Home e na Conta:
-- "Você esteve no Vezpa: responda e ganhe 1 caipirinha". O prêmio continua saindo NA CASA (na hora ou na próxima visita).
-- Seguro rodar mais de uma vez.

create or replace function public.enquete_pendente_para_mim()
returns jsonb language sql stable security definer set search_path = public as $$
  with visitas as (
    select c.local_id, coalesce(c.validado_em, c.created_at) as quando
      from public.checkins c
     where c.user_id = auth.uid() and c.cancelado_em is null and c.created_at > now() - interval '3 days'
    union all
    select p.local_id, p.created_at
      from public.acoes_marca_presencas p
     where p.user_id = auth.uid() and p.local_id is not null and p.created_at > now() - interval '3 days'
    union all
    select e.local_id, coalesce(s.check_in_em, e.data_inicio)
      from public.listas_vip_solicitacoes s
      join public.listas_vip l on l.id = s.lista_vip_id
      join public.eventos e on e.id = l.evento_id
     where s.user_id = auth.uid() and s.status::text = 'check_in' and e.local_id is not null
       and coalesce(s.check_in_em, e.data_inicio) > now() - interval '3 days'
  )
  select jsonb_build_object('local_id', q.local_id, 'local', lo.nome, 'enquete_id', q.id, 'premio', q.premio, 'titulo', q.titulo)
    from (
      select distinct on (en.id) en.*, v.quando
        from visitas v
        join public.enquetes_casa en on en.local_id = v.local_id
       where en.ativa and (now() at time zone 'America/Sao_Paulo')::date between en.inicio and en.fim
         and public.local_premium_ativo(en.local_id)
         and not exists (select 1 from public.enquetes_respostas r where r.enquete_id = en.id and r.user_id = auth.uid())
         and (en.limite_total is null or (select count(*) from public.enquetes_respostas r where r.enquete_id = en.id and r.premio_em is not null) < en.limite_total)
       order by en.id, v.quando desc
    ) q
    join public.locais lo on lo.id = q.local_id
   order by q.quando desc
   limit 1;
$$;
revoke execute on function public.enquete_pendente_para_mim() from public, anon;
grant execute on function public.enquete_pendente_para_mim() to authenticated;

-- Conferência
select to_regprocedure('public.enquete_pendente_para_mim()') as funcao;
