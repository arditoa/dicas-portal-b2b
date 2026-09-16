-- Corrige uma lacuna encontrada só agora, no primeiro teste real de
-- cadastro anônimo em produção: as tabelas do schema public nunca
-- receberam o GRANT de nível de tabela pros papéis anon/authenticated
-- (o "permission denied for table locais", Postgres 42501/42501, que
-- aparece ANTES de qualquer política de RLS ser avaliada). O Supabase
-- normalmente concede isso automaticamente em projetos novos; neste
-- projeto isso não estava presente, provavelmente por causa do sistema
-- de chaves novo (sb_publishable_/sb_secret_) usado desde o início aqui.
--
-- Este grant é seguro: ele só libera a checagem de nível de TABELA, que
-- vem antes da RLS. A RLS (já testada em todas as rodadas anteriores)
-- continua sendo a proteção real linha a linha — sem ela, ninguém
-- anônimo conseguiria ver/gravar nada mesmo com este grant.
--
-- Deliberadamente NÃO aplicado nas tabelas "_legacy_*" (arquitetura
-- antiga, quarentenada desde a Rodada 9) — essas não têm RLS
-- reconfigurada, então dar grant nelas exporia os dados sem proteção
-- nenhuma.

grant usage on schema public to anon, authenticated;

do $$
declare
  r record;
begin
  for r in
    select tablename
    from pg_tables
    where schemaname = 'public'
      and tablename not like '\_legacy\_%'
  loop
    execute format(
      'grant select, insert, update, delete on table public.%I to anon, authenticated',
      r.tablename
    );
  end loop;
end $$;

-- Garante que qualquer tabela nova criada depois (por este mesmo usuário,
-- via SQL Editor) já nasça com o grant certo, sem precisar lembrar de
-- repetir este passo em toda migration futura.
alter default privileges in schema public
  grant select, insert, update, delete on tables to anon, authenticated;
