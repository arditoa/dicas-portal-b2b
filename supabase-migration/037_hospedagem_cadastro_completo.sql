-- Rodada 64 — Cadastro completo de hospedagem (passo a passo no portal) e
-- validação pela equipe. Rodar DEPOIS da 036.
--
--   1) hospedagem_perfil  — dados públicos da hospedagem: Cadastur, check-in/
--      out, idiomas, políticas, formas de pagamento, canais de reserva e o %
--      de cadastro completo (usado pra ordenar: cadastro mais completo aparece
--      antes). Leitura pública quando o local está aprovado.
--   2) hospedagem_validacao — parte PRIVADA (dono + equipe): compromissos de
--      acolhimento, comprovante, aceite do termo, envio para validação e o
--      checklist da equipe. O parceiro não consegue se aprovar sozinho.
--   3) Ao aprovar, o selo "Verificado pelo Dicas" entra automaticamente em
--      locais.atributos.diversidade (e sai se a aprovação for retirada).
--   4) hospedagem_espacos ganha capacidade, camas, preço "a partir de" e
--      características do quarto.
--   5) Bucket privado `documentos-hospedagem` para comprovantes.

begin;

-- 1) Perfil público ---------------------------------------------------------
create table if not exists public.hospedagem_perfil (
  local_id uuid primary key references public.locais(id) on delete cascade,
  cadastur_numero text,
  cadastur_validade date,
  total_quartos integer,
  checkin_hora text,
  checkout_hora text,
  idiomas text[] not null default '{}',
  idade_minima integer,
  cancelamento_tipo text check (cancelamento_tipo is null or cancelamento_tipo in ('flexivel', 'moderada', 'rigida', 'nao_reembolsavel', 'personalizada')),
  cancelamento_texto text,
  regras_casa text,
  formas_pagamento text[] not null default '{}',
  link_reserva text,
  whatsapp_reserva text,
  email_reserva text,
  site text,
  completude integer not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.hospedagem_perfil enable row level security;

drop policy if exists "hospedagem_perfil_select" on public.hospedagem_perfil;
create policy "hospedagem_perfil_select" on public.hospedagem_perfil
  for select using (
    exists (select 1 from public.locais l where l.id = local_id and (l.status = 'aprovado' or l.owner_id = auth.uid() or public.is_admin()))
  );

drop policy if exists "hospedagem_perfil_write" on public.hospedagem_perfil;
create policy "hospedagem_perfil_write" on public.hospedagem_perfil
  for all using (
    exists (select 1 from public.locais l where l.id = local_id and (l.owner_id = auth.uid() or public.is_admin()))
  ) with check (
    exists (select 1 from public.locais l where l.id = local_id and (l.owner_id = auth.uid() or public.is_admin()))
  );

-- 2) Validação (privada) ----------------------------------------------------
create table if not exists public.hospedagem_validacao (
  local_id uuid primary key references public.locais(id) on delete cascade,
  compromissos text[] not null default '{}',
  comprovante_path text,
  termo_aceito_em timestamptz,
  termo_aceito_por uuid,
  status text not null default 'rascunho' check (status in ('rascunho', 'enviado', 'ajustes', 'aprovado')),
  enviado_em timestamptz,
  checklist_equipe text[] not null default '{}',
  observacao_equipe text,
  validado_em timestamptz,
  validado_por uuid,
  updated_at timestamptz not null default now()
);

alter table public.hospedagem_validacao enable row level security;

drop policy if exists "hospedagem_validacao_dono_admin" on public.hospedagem_validacao;
create policy "hospedagem_validacao_dono_admin" on public.hospedagem_validacao
  for all using (
    exists (select 1 from public.locais l where l.id = local_id and (l.owner_id = auth.uid() or public.is_admin()))
  ) with check (
    exists (select 1 from public.locais l where l.id = local_id and (l.owner_id = auth.uid() or public.is_admin()))
  );

-- Parceiro só pode deixar como 'rascunho' ou 'enviado' e não mexe no que é
-- da equipe (status, checklist e observação da equipe ficam protegidos).
create or replace function public.hospedagem_validacao_proteger()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.updated_at := now();
  if public.is_admin() then
    if new.status = 'aprovado' and (tg_op = 'INSERT' or old.status is distinct from 'aprovado') then
      new.validado_em := now();
      new.validado_por := auth.uid();
    end if;
    return new;
  end if;

  if tg_op = 'UPDATE' then
    new.checklist_equipe := old.checklist_equipe;
    new.observacao_equipe := old.observacao_equipe;
    new.validado_em := old.validado_em;
    new.validado_por := old.validado_por;
  else
    new.checklist_equipe := '{}';
    new.observacao_equipe := null;
    new.validado_em := null;
    new.validado_por := null;
  end if;

  if new.status not in ('rascunho', 'enviado') then
    new.status := case when tg_op = 'UPDATE' then old.status else 'rascunho' end;
  end if;
  if new.status = 'enviado' and (tg_op = 'INSERT' or old.status is distinct from 'enviado') then
    new.enviado_em := now();
  end if;
  if new.termo_aceito_em is not null and (tg_op = 'INSERT' or old.termo_aceito_em is null) then
    new.termo_aceito_por := auth.uid();
  end if;
  return new;
end $$;

drop trigger if exists hospedagem_validacao_proteger on public.hospedagem_validacao;
create trigger hospedagem_validacao_proteger before insert or update on public.hospedagem_validacao
  for each row execute function public.hospedagem_validacao_proteger();

-- 3) Selo automático --------------------------------------------------------
create or replace function public.hospedagem_validacao_selo()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  atual jsonb;
  div jsonb;
begin
  select coalesce(atributos, '{}'::jsonb) into atual from public.locais where id = new.local_id;
  div := coalesce(atual -> 'diversidade', '[]'::jsonb);
  div := coalesce((select jsonb_agg(x) from jsonb_array_elements_text(div) x where x <> 'verificado_pelo_dicas'), '[]'::jsonb);
  if new.status = 'aprovado' then
    div := div || '["verificado_pelo_dicas"]'::jsonb;
  end if;
  update public.locais set atributos = jsonb_set(atual, '{diversidade}', div, true) where id = new.local_id;
  return new;
end $$;

drop trigger if exists hospedagem_validacao_selo on public.hospedagem_validacao;
create trigger hospedagem_validacao_selo after insert or update of status on public.hospedagem_validacao
  for each row execute function public.hospedagem_validacao_selo();

-- O parceiro não consegue marcar os selos da equipe por conta própria.
create or replace function public.locais_proteger_selos()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  div jsonb;
  tinha boolean;
begin
  if public.is_admin() or current_setting('role', true) = 'service_role' then
    return new;
  end if;
  -- chamadas internas (trigger do selo acima) rodam como definer: pg_trigger_depth() > 1
  if pg_trigger_depth() > 1 then
    return new;
  end if;
  tinha := coalesce(old.atributos -> 'diversidade', '[]'::jsonb) ? 'verificado_pelo_dicas';
  div := coalesce(new.atributos -> 'diversidade', '[]'::jsonb);
  div := coalesce((select jsonb_agg(x) from jsonb_array_elements_text(div) x where x not in ('verificado_pelo_dicas', 'parceiro_fundador')), '[]'::jsonb);
  if tinha then
    div := div || '["verificado_pelo_dicas"]'::jsonb;
  end if;
  if coalesce(old.atributos -> 'diversidade', '[]'::jsonb) ? 'parceiro_fundador' then
    div := div || '["parceiro_fundador"]'::jsonb;
  end if;
  new.atributos := jsonb_set(coalesce(new.atributos, '{}'::jsonb), '{diversidade}', div, true);
  return new;
end $$;

drop trigger if exists locais_proteger_selos on public.locais;
create trigger locais_proteger_selos before update of atributos on public.locais
  for each row execute function public.locais_proteger_selos();

-- 4) Detalhes dos quartos / espaços ------------------------------------------
alter table public.hospedagem_espacos add column if not exists capacidade integer;
alter table public.hospedagem_espacos add column if not exists camas text;
alter table public.hospedagem_espacos add column if not exists preco_de numeric(10, 2);
alter table public.hospedagem_espacos add column if not exists caracteristicas text[] not null default '{}';

-- 5) Comprovantes (bucket privado; pasta = id do local) ----------------------
insert into storage.buckets (id, name, public)
values ('documentos-hospedagem', 'documentos-hospedagem', false)
on conflict (id) do nothing;

drop policy if exists "documentos_hospedagem_dono_admin_select" on storage.objects;
create policy "documentos_hospedagem_dono_admin_select" on storage.objects
  for select using (
    bucket_id = 'documentos-hospedagem' and (
      public.is_admin() or exists (
        select 1 from public.locais l where l.id::text = (storage.foldername(name))[1] and l.owner_id = auth.uid()
      )
    )
  );

drop policy if exists "documentos_hospedagem_dono_insert" on storage.objects;
create policy "documentos_hospedagem_dono_insert" on storage.objects
  for insert with check (
    bucket_id = 'documentos-hospedagem' and exists (
      select 1 from public.locais l where l.id::text = (storage.foldername(name))[1] and (l.owner_id = auth.uid() or public.is_admin())
    )
  );

commit;
