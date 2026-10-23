-- 047: oferta do bloco "Destaques" da Home (parceiro patrocinado que gira a cada hora).
-- O app escolhe o parceiro entre os locais pagos; esta tabela só guarda a OFERTA
-- (texto, validade e tipo de botão). Sem linha ativa e dentro da validade, o
-- bloco mostra o local sem oferta (botão "Ver local").
begin;

create table if not exists public.destaque_hora_ofertas (
  local_id   uuid primary key references public.locais(id) on delete cascade,
  oferta     text not null check (char_length(oferta) between 3 and 80),
  oferta_ate timestamptz not null,
  botao      text not null default 'ver_local' check (botao in ('ver_local','como_chegar','garantir','ver_beneficio')),
  ativo      boolean not null default true,
  criado_em  timestamptz not null default now()
);

alter table public.destaque_hora_ofertas enable row level security;

drop policy if exists "destaque_hora_select" on public.destaque_hora_ofertas;
create policy "destaque_hora_select" on public.destaque_hora_ofertas
  for select using (ativo and oferta_ate > now());

drop policy if exists "destaque_hora_admin_select" on public.destaque_hora_ofertas;
create policy "destaque_hora_admin_select" on public.destaque_hora_ofertas
  for select using (public.is_admin());

drop policy if exists "destaque_hora_admin_insert" on public.destaque_hora_ofertas;
create policy "destaque_hora_admin_insert" on public.destaque_hora_ofertas
  for insert with check (public.is_admin());

drop policy if exists "destaque_hora_admin_update" on public.destaque_hora_ofertas;
create policy "destaque_hora_admin_update" on public.destaque_hora_ofertas
  for update using (public.is_admin());

drop policy if exists "destaque_hora_admin_delete" on public.destaque_hora_ofertas;
create policy "destaque_hora_admin_delete" on public.destaque_hora_ofertas
  for delete using (public.is_admin());

commit;
