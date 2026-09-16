-- Achado no mesmo dia da migration 011: a mesma lacuna de GRANT de nível
-- de tabela que afetava anon/authenticated também afeta service_role
-- (a chave "secret" usada pela rota /api/aprovar-local, Rodada 22) — o
-- erro "permission denied for table profiles" (Postgres 42501) confirma.
-- Num projeto Supabase criado do jeito padrão, service_role já vem com
-- acesso total a tudo em public por bootstrap automático da plataforma;
-- este projeto nunca recebeu esse bootstrap (mesma causa-raiz da 011).
--
-- service_role já é, por natureza, uma chave 100% confiável — só existe
-- no servidor, nunca no navegador — então não há necessidade de excluir
-- as tabelas "_legacy_*" aqui como a 011 fez para anon/authenticated: dar
-- acesso total a service_role nessas tabelas antigas não expõe nada a
-- usuário nenhum (RLS nem entra em jogo pra este papel).

grant usage on schema public to service_role;

do $$
declare
  r record;
begin
  for r in select tablename from pg_tables where schemaname = 'public'
  loop
    execute format('grant all privileges on table public.%I to service_role', r.tablename);
  end loop;
end $$;

grant usage, select on all sequences in schema public to service_role;

alter default privileges in schema public
  grant all privileges on tables to service_role;
alter default privileges in schema public
  grant usage, select on sequences to service_role;
