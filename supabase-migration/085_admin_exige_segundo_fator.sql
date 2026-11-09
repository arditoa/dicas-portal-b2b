-- 085 — OPCIONAL, SÓ DEPOIS de cadastrar o app autenticador (segundo fator) e conseguir entrar no /admin com o código.
-- Faz o BANCO exigir o segundo fator: is_admin() passa a valer só para sessões em nível "aal2" (senha + código).
-- Efeito: mesmo que alguém roube a senha de uma conta admin e fale direto com a API do Supabase (sem passar pelo portal),
-- não consegue agir como admin sem o código do celular.
--
-- ATENÇÃO (para não se trancar para fora):
--  1) Antes de rodar, entre no /admin, faça o cadastro do segundo fator e confirme que o painel abre normalmente.
--  2) Todo admin precisa ter o seu app autenticador; quem não tiver perde os poderes de admin até cadastrar.
--  3) Se algo der errado, o SQL Editor continua funcionando (roda como dono do banco). Para desfazer, rode o bloco
--     "REVERTER" no final deste arquivo.
-- Seguro rodar mais de uma vez.

create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
  )
  and coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2';
$$;

-- REVERTER (só se precisar voltar ao comportamento anterior; não rode junto com o bloco acima):
-- create or replace function public.is_admin()
-- returns boolean language sql security definer stable set search_path = public as $$
--   select exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin');
-- $$;
