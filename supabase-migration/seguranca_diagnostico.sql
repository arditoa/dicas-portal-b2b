-- DIAGNÓSTICO DE SEGURANÇA — só LÊ, não altera nada. Rode no SQL Editor do Supabase, um bloco por vez,
-- e me mande o resultado (print ou texto) de cada um. Isso mostra o estado REAL do banco, que pode ser diferente das migrations.

-- 1) Quem é admin hoje? (deve ser só você e quem você autorizou)
select p.id, u.email, p.role, p.created_at
from public.profiles p
join auth.users u on u.id = p.id
where p.role = 'admin'
order by p.created_at;

-- 2) Tabelas do schema public SEM Row Level Security (o resultado ideal é vazio)
select c.relname as tabela
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity
order by 1;

-- 3) Policies de ESCRITA que liberam geral (using true / with check true). Esperado: só inserts de métrica/analytics.
select schemaname, tablename, policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname = 'public'
  and cmd in ('INSERT', 'UPDATE', 'DELETE', 'ALL')
  and (coalesce(qual, '') in ('true', '(true)') or coalesce(with_check, '') in ('true', '(true)'))
order by tablename, cmd;

-- 4) A trava do papel de admin está ativa? (deve aparecer protect_profiles_role depois da migration 083)
select tgname, tgenabled
from pg_trigger
where tgrelid = 'public.profiles'::regclass and not tgisinternal
order by 1;

-- 5) Buckets de arquivos: quais são públicos e quais não
select id, name, public, file_size_limit, allowed_mime_types
from storage.buckets
order by name;

-- 6) Funções SECURITY DEFINER que o visitante SEM login (anon) consegue executar — revise cada uma
select p.proname as funcao, pg_get_function_identity_arguments(p.oid) as argumentos
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.prosecdef
  and has_function_privilege('anon', p.oid, 'execute')
order by 1;

-- 7) Tabelas em que o visitante SEM login (anon) pode escrever (grants). Esperado: só analytics/cadastro rápido.
select table_name, string_agg(privilege_type, ', ' order by privilege_type) as permissoes
from information_schema.role_table_grants
where table_schema = 'public' and grantee = 'anon' and privilege_type in ('INSERT', 'UPDATE', 'DELETE')
group by table_name
order by table_name;

-- 8) Extensões e usuários sem e-mail confirmado (sinal de cadastros em massa/robôs)
select count(*) filter (where email_confirmed_at is null) as sem_confirmacao,
       count(*) as total,
       max(created_at) as ultimo_cadastro
from auth.users;
