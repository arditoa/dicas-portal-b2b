-- ============================================================================
-- 035 — Ajustes exigidos pela Apple para a nova versão (Home estilo Uber)
-- ============================================================================
-- 1) Exclusão de conta DE VERDADE dentro do app (App Store 5.1.1(v)).
--    Antes o botão "Excluir Minha Conta" só registrava um pedido em
--    solicitacoes_exclusao_conta pra alguém processar à mão. A Apple exige
--    que o próprio app apague a conta. Esta função apaga as avaliações do
--    usuário (conteúdo público dele), o perfil (cascata em favoritos,
--    cupons resgatados, check-ins, listas VIP, bloqueios, indicações...) e
--    o usuário de autenticação. Locais/eventos que ele cadastrou NÃO são
--    apagados (owner_id/criado_por já são "on delete set null").
--
-- 2) "Avise-me" das categorias Em breve e do card Brasil 2027
--    (App Store 2.1: nada de botão que não faz nada). Cada toque grava um
--    interesse real, que o /admin pode consultar pra saber o que abrir
--    primeiro e quem avisar.
--
-- Idempotente: pode rodar mais de uma vez.
-- ============================================================================

create or replace function public.excluir_minha_conta()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Faça login para excluir sua conta.';
  end if;

  delete from public.avaliacoes where user_id = v_uid;
  delete from public.profiles where id = v_uid;
  delete from auth.users where id = v_uid;
end;
$$;

revoke all on function public.excluir_minha_conta() from public;
revoke all on function public.excluir_minha_conta() from anon;
grant execute on function public.excluir_minha_conta() to authenticated;

create table if not exists public.avisos_interesse (
  user_id uuid not null references public.profiles(id) on delete cascade,
  -- slug da categoria (ex.: 'lazer', 'beleza', 'mais18') ou de uma
  -- campanha (ex.: 'brasil2027').
  alvo text not null check (char_length(alvo) between 2 and 40),
  created_at timestamptz not null default now(),
  primary key (user_id, alvo)
);

alter table public.avisos_interesse enable row level security;

drop policy if exists "avisos_interesse_dono" on public.avisos_interesse;
create policy "avisos_interesse_dono" on public.avisos_interesse
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "avisos_interesse_admin_le" on public.avisos_interesse;
create policy "avisos_interesse_admin_le" on public.avisos_interesse
  for select using (public.is_admin());

grant select, insert, delete on public.avisos_interesse to authenticated;
grant all on public.avisos_interesse to service_role;
