-- 138 — Instagram da casa (16/11/2026): a casa conecta o próprio Instagram (conta profissional) e puxa o flyer
-- de um post direto para a festa, sem baixar e subir de novo. Rode depois da 137. Seguro rodar mais de uma vez.
--
-- * Login oficial do Instagram ("Business Login for Instagram", permissão instagram_business_basic: só ler o perfil e os posts).
-- * O token fica só no servidor (tabela sem acesso pela API do app). A casa vê só "conectado como @usuario".
-- * Quem conecta: o dono ou quem tem a permissão 'festa' (ex.: social media).
-- * Para casas de fora (que não são testadoras do app na Meta) funcionar, a Meta precisa aprovar o app (App Review + verificação da empresa).

create table if not exists public.ig_contas (
  local_id uuid primary key references public.locais(id) on delete cascade,
  ig_user_id text not null,
  username text,
  access_token text not null,
  expira_em timestamptz,
  conectado_por uuid,
  conectado_em timestamptz not null default now(),
  renovado_em timestamptz
);
alter table public.ig_contas enable row level security;  -- só o servidor (service_role)

create table if not exists public.ig_oauth_estados (
  estado text primary key,
  local_id uuid not null references public.locais(id) on delete cascade,
  user_id uuid not null,
  criado_em timestamptz not null default now()
);
alter table public.ig_oauth_estados enable row level security;  -- só o servidor

create or replace function public.pode_instagram_da_casa(p_local uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_admin() or exists (select 1 from public.locais where id = p_local and owner_id = auth.uid()) or public.pode_no_local(p_local, 'festa');
$$;
revoke all on function public.pode_instagram_da_casa(uuid) from public, anon;
grant execute on function public.pode_instagram_da_casa(uuid) to authenticated;

create or replace function public.ig_iniciar_conexao(p_local uuid)
returns text language plpgsql security definer set search_path = public as $$
declare v_estado text := encode(extensions.gen_random_bytes(18), 'hex');
begin
  if not public.pode_instagram_da_casa(p_local) then
    raise exception 'Só o dono ou quem cuida das festas conecta o Instagram.' using errcode = '42501';
  end if;
  delete from public.ig_oauth_estados where criado_em < now() - interval '1 day';
  insert into public.ig_oauth_estados (estado, local_id, user_id) values (v_estado, p_local, auth.uid());
  return v_estado;
end; $$;
revoke execute on function public.ig_iniciar_conexao(uuid) from public, anon;
grant execute on function public.ig_iniciar_conexao(uuid) to authenticated;

create or replace function public.ig_status_da_casa(p_local uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select case when public.pode_instagram_da_casa(p_local) then
    coalesce((select jsonb_build_object('conectado', true, 'username', username, 'desde', conectado_em,
                                        'vencido', expira_em is not null and expira_em < now())
                from public.ig_contas where local_id = p_local), jsonb_build_object('conectado', false))
  end;
$$;
revoke execute on function public.ig_status_da_casa(uuid) from public, anon;
grant execute on function public.ig_status_da_casa(uuid) to authenticated;

create or replace function public.ig_desconectar(p_local uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.pode_instagram_da_casa(p_local) then raise exception 'Sem acesso.' using errcode = '42501'; end if;
  delete from public.ig_contas where local_id = p_local;
end; $$;
revoke execute on function public.ig_desconectar(uuid) from public, anon;
grant execute on function public.ig_desconectar(uuid) to authenticated;
