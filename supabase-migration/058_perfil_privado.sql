-- Perfil privado (opcional): orientação sexual, identidade de gênero, pronomes e gostos.
-- Dados pessoais SENSÍVEIS (LGPD art. 11): só a própria pessoa lê e escreve (RLS), sem leitura por
-- admin ou parceiros. Só são gravados com consentimento específico (consentimento_sensivel_em).
-- Rode no SQL Editor (pode rodar junto com as demais; não usa ADD VALUE de enum).
create table if not exists public.perfil_privado (
  user_id uuid primary key references auth.users(id) on delete cascade,
  orientacao_sexual text check (orientacao_sexual is null or char_length(orientacao_sexual) <= 40),
  identidade_genero text check (identidade_genero is null or char_length(identidade_genero) <= 40),
  pronomes text check (pronomes is null or char_length(pronomes) <= 40),
  gostos jsonb not null default '{}'::jsonb,
  consentimento_sensivel_em timestamptz,
  atualizado_em timestamptz not null default now()
);

alter table public.perfil_privado enable row level security;

drop policy if exists "perfil_privado_select_own" on public.perfil_privado;
create policy "perfil_privado_select_own" on public.perfil_privado
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "perfil_privado_insert_own" on public.perfil_privado;
create policy "perfil_privado_insert_own" on public.perfil_privado
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "perfil_privado_update_own" on public.perfil_privado;
create policy "perfil_privado_update_own" on public.perfil_privado
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "perfil_privado_delete_own" on public.perfil_privado;
create policy "perfil_privado_delete_own" on public.perfil_privado
  for delete to authenticated using (auth.uid() = user_id);

comment on table public.perfil_privado is
  'Dados opcionais e sensíveis do perfil (orientação, identidade, pronomes, gostos). Só o dono lê/escreve.';
