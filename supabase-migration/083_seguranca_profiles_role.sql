-- 083 — Segurança: ninguém vira admin sozinho + fecha funções expostas ao público sem login.
-- Seguro rodar mais de uma vez. Rode no SQL Editor do Supabase (projeto Dicas LGBT / production).
--
-- PROBLEMA: a policy "profiles_update_own" deixa cada usuário atualizar a PRÓPRIA linha de profiles, e a coluna
-- `role` (usuario | parceiro | admin) faz parte dessa linha. Sem trava, qualquer pessoa logada poderia mandar
-- um PATCH pelo REST do Supabase com {"role":"admin"} e virar administradora (is_admin() lê essa coluna).
-- O app e o portal nunca alteram `role` pelo cliente (só avatar, status de relacionamento etc.), então a trava abaixo
-- não quebra nada. Quem pode mudar `role`: admin logado, ou o SQL Editor / service_role (auth.uid() nulo).

create or replace function public.protect_profiles_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role then
    -- auth.uid() nulo = SQL Editor do Supabase ou service_role (servidor): permitido.
    if auth.uid() is not null and not public.is_admin() then
      raise exception 'Somente administradores podem alterar o papel (role) de um usuário.' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profiles_role on public.profiles;
create trigger protect_profiles_role
  before update on public.profiles
  for each row execute function public.protect_profiles_role();

-- Ninguém de fora cria linha de profiles já como admin/parceiro (o cadastro cria como 'usuario' por trigger do Auth).
create or replace function public.protect_profiles_role_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from 'usuario'::public.user_role and auth.uid() is not null and not public.is_admin() then
    new.role := 'usuario';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profiles_role_insert on public.profiles;
create trigger protect_profiles_role_insert
  before insert on public.profiles
  for each row execute function public.protect_profiles_role_insert();

-- Funções SECURITY DEFINER que só fazem sentido para quem tem login: tira a permissão de "anon" (visitante sem conta).
revoke execute on function public.contar_visitas_periodo(uuid, uuid) from public, anon;
revoke execute on function public.confirmar_checkins_pendentes() from public, anon;
grant execute on function public.contar_visitas_periodo(uuid, uuid) to authenticated;
grant execute on function public.confirmar_checkins_pendentes() to authenticated;
