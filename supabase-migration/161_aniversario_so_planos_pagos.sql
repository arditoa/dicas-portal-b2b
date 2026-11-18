-- 161 · Presente de aniversário só para casas Fundador, Premium e Intermediário (decisão da Andrea, 18/11/2026).
--   O aviso continua automático (cron 'aniversariantes-11h', 11h de Brasília): ninguém precisa enviar nada.
--   Casa Gratuita com o presente ligado deixa de aparecer para o público e de disparar o aviso.
-- Seguro rodar mais de uma vez.

create or replace function public.local_tem_plano_pago(p_local uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.locais l where l.id = p_local
     and l.plano_comercial::text in ('fundador', 'premium', 'intermediario')
     and coalesce(l.plano_comercial_status::text, 'ativo') = 'ativo')
  or exists (select 1 from public.local_badges b where b.local_id = p_local and b.ativo and b.rotulo ilike '%fundador%');
$$;
grant execute on function public.local_tem_plano_pago(uuid) to authenticated;

create or replace function public.meus_presentes_aniversario()
returns jsonb language sql stable security definer set search_path = public as $$
  with eu as (
    select p.id, p.birth_date, (now() at time zone 'America/Sao_Paulo')::date as hoje from public.profiles p where p.id = auth.uid() and p.birth_date is not null
  ), niver as (
    select eu.*, public.aniversario_no_ano(eu.birth_date, extract(year from eu.hoje)::int) as dia from eu
  )
  select coalesce(jsonb_agg(jsonb_build_object('local_id', a.local_id, 'casa', l.nome, 'presente', a.presente, 'regra', a.regra,
           'ate', n.dia + a.dias, 'pego_em', r.pego_em) order by l.nome), '[]'::jsonb)
    from niver n
    join public.aniversario_casa a on a.ativo
    join public.locais l on l.id = a.local_id and l.status = 'aprovado' and public.local_tem_plano_pago(l.id)
    left join public.aniversario_resgates r on r.local_id = a.local_id and r.user_id = n.id and r.ano = extract(year from n.dia)::int
   where n.hoje between n.dia and n.dia + a.dias
     and public.esteve_na_casa(n.id, a.local_id);
$$;
revoke execute on function public.meus_presentes_aniversario() from public, anon;
grant execute on function public.meus_presentes_aniversario() to authenticated;

create or replace function public.avisar_aniversariantes()
returns integer language plpgsql security definer set search_path = public as $$
declare r record; tokens text[]; n int := 0; hoje date := (now() at time zone 'America/Sao_Paulo')::date;
begin
  for r in
    select p.id, count(*) as casas, min(l.nome) as uma
      from public.profiles p
      join public.aniversario_casa a on a.ativo
      join public.locais l on l.id = a.local_id and l.status = 'aprovado' and public.local_tem_plano_pago(l.id)
     where p.birth_date is not null and public.aniversario_no_ano(p.birth_date, extract(year from hoje)::int) = hoje
       and public.esteve_na_casa(p.id, a.local_id)
     group by p.id
  loop
    if exists (select 1 from public.lembretes_enviados where chave = 'niver:' || r.id || ':' || hoje) then continue; end if;
    select array_agg(distinct d.token) into tokens from public.push_dispositivos d join public.push_preferencias pp on pp.user_id = d.user_id
     where d.user_id = r.id and d.ativo and pp.cupons;
    if tokens is not null then
      perform public.enviar_push_expo(tokens, 'Feliz aniversário! 🎂',
        case when r.casas = 1 then 'O ' || r.uma || ' tem um presente para você. Toque para ver.' else r.casas || ' casas têm presente para você. Toque para ver.' end,
        '/(tabs)/profile', 'cupons');
      n := n + 1;
    end if;
    insert into public.lembretes_enviados (chave) values ('niver:' || r.id || ':' || hoje) on conflict do nothing;
  end loop;
  return n;
end; $$;
revoke all on function public.avisar_aniversariantes() from public, anon, authenticated;

notify pgrst, 'reload schema';
