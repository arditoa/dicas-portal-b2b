-- Complemento ao 001_migrar_para_locais.sql, depois de desenhar as páginas
-- de cadastro do portal que faltavam (/cadastro/local, /cadastro/evento,
-- /cadastro/institucional, /contato).

-- 1) "eventos" não podia ser cadastrado sem login (a policy original exigia
-- auth.uid() is not null), mas o fluxo real da Andrea é o mesmo dos locais:
-- Etapa 1 pública, sem login, nasce "pendente" — só a Etapa 2 (depois de
-- aprovado) tem login. Corrigindo pra igualar à regra de "locais".
drop policy if exists "eventos_insert_autenticado" on public.eventos;
drop policy if exists "eventos_insert_qualquer_um" on public.eventos;
create policy "eventos_insert_qualquer_um" on public.eventos
  for insert with check (true); -- trigger before_insert_eventos já sanitiza os campos sensíveis

-- 2) Nova tabela pra "Parceiro Institucional" (Home, botão "Falar com o
-- time") e "Institucional / ONG" (Onboarding pós-cadastro) — os dois
-- levam pra formulários parecidos mas com propósitos ligeiramente
-- diferentes (marca/negócio com comissão por indicação vs. organização/ONG
-- de apoio), por isso o campo "origem" abaixo distingue as duas telas na
-- mesma tabela em vez de criar duas tabelas quase iguais.
do $$ begin
  create type public.origem_lead_institucional as enum ('parceiro_institucional', 'institucional_ong', 'contato_geral');
exception when duplicate_object then null; end $$;

create table if not exists public.leads_institucionais (
  id uuid primary key default gen_random_uuid(),
  origem public.origem_lead_institucional not null default 'contato_geral',
  nome_organizacao text not null,
  nome_contato text,
  email text,
  whatsapp text,
  mensagem text,
  status text not null default 'novo' check (status in ('novo', 'em_contato', 'fechado', 'descartado')),
  created_at timestamptz not null default now()
);

alter table public.leads_institucionais enable row level security;

drop policy if exists "leads_institucionais_insert_publico" on public.leads_institucionais;
create policy "leads_institucionais_insert_publico" on public.leads_institucionais
  for insert with check (true); -- formulário público, sem login

drop policy if exists "leads_institucionais_select_admin" on public.leads_institucionais;
create policy "leads_institucionais_select_admin" on public.leads_institucionais
  for select using (public.is_admin());

drop policy if exists "leads_institucionais_update_admin" on public.leads_institucionais;
create policy "leads_institucionais_update_admin" on public.leads_institucionais
  for update using (public.is_admin()) with check (public.is_admin());
