-- ============================================================================
-- 044 — Notificações push (v1: aceite do usuário + envio manual pelo /admin)
-- ============================================================================
-- Guarda: (1) o aparelho de quem aceitou receber avisos, (2) as preferências
-- por tipo (festas, cupons, lembretes, novidades — TODAS começam desligadas;
-- o usuário liga uma a uma, exigência da Apple 4.5.4 para push de marketing)
-- e (3) o histórico do que o /admin enviou.
-- Quem envia: a função "enviar-push" (Edge Function), só para admin.
-- Excluir a conta apaga aparelhos e preferências em cascata (profiles → on
-- delete cascade), então a exclusão de conta continua completa.
-- Seguro rodar mais de uma vez.
-- ============================================================================

begin;

create table if not exists public.push_dispositivos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  token text not null unique,
  plataforma text check (plataforma in ('ios', 'android')),
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index if not exists push_dispositivos_user_idx on public.push_dispositivos (user_id) where ativo;

create table if not exists public.push_preferencias (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  festas boolean not null default false,
  cupons boolean not null default false,
  lembretes boolean not null default false,
  novidades boolean not null default false,
  consentido_em timestamptz,
  atualizado_em timestamptz not null default now()
);

create table if not exists public.push_envios (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('festas', 'cupons', 'lembretes', 'novidades')),
  titulo text not null,
  corpo text not null,
  rota text,
  so_teste boolean not null default false,
  enviado_por uuid references auth.users(id) on delete set null,
  total integer not null default 0,
  aceitos integer not null default 0,
  erros integer not null default 0,
  criado_em timestamptz not null default now()
);

-- ─── Regras de acesso ────────────────────────────────────────────────────
alter table public.push_dispositivos enable row level security;
alter table public.push_preferencias enable row level security;
alter table public.push_envios enable row level security;

drop policy if exists "push_dispositivos_proprio" on public.push_dispositivos;
create policy "push_dispositivos_proprio" on public.push_dispositivos
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "push_preferencias_proprio" on public.push_preferencias;
create policy "push_preferencias_proprio" on public.push_preferencias
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "push_envios_admin" on public.push_envios;
create policy "push_envios_admin" on public.push_envios
  for select to authenticated using (public.is_admin());

revoke all on public.push_dispositivos, public.push_preferencias, public.push_envios from anon, authenticated;
grant select, insert, update, delete on public.push_dispositivos to authenticated;
grant select, insert, update, delete on public.push_preferencias to authenticated;
grant select on public.push_envios to authenticated;

-- ─── O app registra o aparelho (um mesmo aparelho pode trocar de conta) ──
create or replace function public.registrar_push_token(p_token text, p_plataforma text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Faça login para ativar os avisos.';
  end if;
  if p_token is null or length(p_token) < 10 then
    raise exception 'Token inválido.';
  end if;
  insert into public.push_dispositivos (user_id, token, plataforma, ativo, atualizado_em)
  values (auth.uid(), p_token, case when p_plataforma in ('ios','android') then p_plataforma end, true, now())
  on conflict (token) do update
    set user_id = auth.uid(),
        plataforma = excluded.plataforma,
        ativo = true,
        atualizado_em = now();
end;
$$;
revoke all on function public.registrar_push_token(text, text) from public, anon;
grant execute on function public.registrar_push_token(text, text) to authenticated;

-- ─── Resumo para o /admin: quantos aparelhos ativos aceitaram cada tipo ──
create or replace function public.push_resumo()
returns table (tipo text, aparelhos bigint)
language sql
security definer
stable
set search_path = public
as $$
  select t.tipo, count(distinct d.id)
  from (values ('festas'), ('cupons'), ('lembretes'), ('novidades')) as t(tipo)
  left join public.push_preferencias p on
    (t.tipo = 'festas' and p.festas) or (t.tipo = 'cupons' and p.cupons) or
    (t.tipo = 'lembretes' and p.lembretes) or (t.tipo = 'novidades' and p.novidades)
  left join public.push_dispositivos d on d.user_id = p.user_id and d.ativo
  where public.is_admin()
  group by t.tipo;
$$;
revoke all on function public.push_resumo() from public, anon;
grant execute on function public.push_resumo() to authenticated;

-- ─── Usada só pela Edge Function (chave de serviço): tokens de um tipo ───
create or replace function public.push_tokens_para(p_tipo text)
returns table (token text)
language sql
security definer
stable
set search_path = public
as $$
  select distinct d.token
  from public.push_dispositivos d
  join public.push_preferencias p on p.user_id = d.user_id
  where d.ativo
    and ((p_tipo = 'festas' and p.festas) or (p_tipo = 'cupons' and p.cupons) or
         (p_tipo = 'lembretes' and p.lembretes) or (p_tipo = 'novidades' and p.novidades));
$$;
revoke all on function public.push_tokens_para(text) from public, anon, authenticated;
grant execute on function public.push_tokens_para(text) to service_role;

commit;
