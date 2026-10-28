-- 060 — Chamada do banner rotativo de destaque: o banner não mostra o nome do local, mostra uma CHAMADA
-- (ex.: "Conheça o nosso queridinho drink de Lichia"); tocar abre a página do local.
-- O dono do local e o admin podem editar. Rode no SQL Editor do Supabase (seguro rodar mais de uma vez).
begin;

create table if not exists public.destaque_chamada (
  local_id uuid primary key references public.locais(id) on delete cascade,
  chamada text not null check (char_length(chamada) between 1 and 90),
  cta text not null default 'Conhecer' check (char_length(cta) <= 24),
  imagem_url text,                         -- opcional; sem imagem, o banner usa a foto do local
  ativo boolean not null default true,
  escrito_por text not null default 'equipe',   -- 'equipe' (admin) ou 'local' (dono)
  updated_at timestamptz not null default now()
);
alter table public.destaque_chamada enable row level security;

drop policy if exists "dest_cham_select" on public.destaque_chamada;
create policy "dest_cham_select" on public.destaque_chamada for select to anon, authenticated
  using (ativo and exists (select 1 from public.locais l where l.id = local_id and l.status = 'aprovado'));
drop policy if exists "dest_cham_select_dono" on public.destaque_chamada;
create policy "dest_cham_select_dono" on public.destaque_chamada for select to authenticated
  using (exists (select 1 from public.locais l where l.id = local_id and l.owner_id = auth.uid()));
drop policy if exists "dest_cham_admin" on public.destaque_chamada;
create policy "dest_cham_admin" on public.destaque_chamada for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
drop policy if exists "dest_cham_insert_dono" on public.destaque_chamada;
create policy "dest_cham_insert_dono" on public.destaque_chamada for insert to authenticated
  with check (exists (select 1 from public.locais l where l.id = local_id and l.owner_id = auth.uid()));
drop policy if exists "dest_cham_update_dono" on public.destaque_chamada;
create policy "dest_cham_update_dono" on public.destaque_chamada for update to authenticated
  using (exists (select 1 from public.locais l where l.id = local_id and l.owner_id = auth.uid()))
  with check (exists (select 1 from public.locais l where l.id = local_id and l.owner_id = auth.uid()));

-- O dono edita só o texto e o botão; imagem e "ativo" são da equipe. Quem escreveu fica registrado.
create or replace function public.touch_destaque_chamada()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    if tg_op = 'INSERT' then
      new.imagem_url := null;
      new.ativo := true;
    else
      new.local_id := old.local_id;
      new.imagem_url := old.imagem_url;
      new.ativo := old.ativo;
    end if;
    new.escrito_por := 'local';
  end if;
  new.updated_at := now();
  return new;
end;
$$;
drop trigger if exists before_write_destaque_chamada on public.destaque_chamada;
create trigger before_write_destaque_chamada before insert or update on public.destaque_chamada
  for each row execute function public.touch_destaque_chamada();

commit;
