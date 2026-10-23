-- 049: regras do Membro Fundador iguais no app e no portal.
-- 1) Plano Fundador ATIVO liga o selo "Membro Fundador" sozinho (antes só valia o toggle
--    manual do /admin, então quem pagava não aparecia no topo da Home nem na lista de fundadores).
--    O gatilho só LIGA: tirar o selo (ou conceder de cortesia) continua manual no /admin.
-- 2) Só admin cria/edita o selo "Fundador": o dono do local não pode se autopromover pela API.
begin;

create or replace function public.sync_selo_fundador()
returns trigger as $$
begin
  if new.plano_comercial = 'fundador' and coalesce(new.plano_comercial_status, '') = 'ativo' then
    update public.local_badges set ativo = true
      where local_id = new.id and rotulo ilike '%fundador%';
    if not found then
      insert into public.local_badges (local_id, rotulo, cor_tag, ativo)
      values (new.id, 'Membro Fundador', 'dourado', true);
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists locais_sync_selo_fundador on public.locais;
create trigger locais_sync_selo_fundador
  after insert or update of plano_comercial, plano_comercial_status on public.locais
  for each row execute function public.sync_selo_fundador();

-- Quem já está com plano Fundador ativo e ainda não tem o selo.
update public.local_badges b set ativo = true
  from public.locais l
  where b.local_id = l.id and b.rotulo ilike '%fundador%'
    and l.plano_comercial = 'fundador' and coalesce(l.plano_comercial_status, '') = 'ativo';
insert into public.local_badges (local_id, rotulo, cor_tag, ativo)
  select l.id, 'Membro Fundador', 'dourado', true
  from public.locais l
  where l.plano_comercial = 'fundador' and coalesce(l.plano_comercial_status, '') = 'ativo'
    and not exists (select 1 from public.local_badges b where b.local_id = l.id and b.rotulo ilike '%fundador%');

-- Selo Fundador: só admin escreve.
drop policy if exists "badges_write_dono_ou_admin" on public.local_badges;
create policy "badges_write_dono_ou_admin" on public.local_badges
  for all using (
    public.is_admin()
    or (rotulo not ilike '%fundador%'
        and exists (select 1 from public.locais l where l.id = local_id and l.owner_id = auth.uid()))
  ) with check (
    public.is_admin()
    or (rotulo not ilike '%fundador%'
        and exists (select 1 from public.locais l where l.id = local_id and l.owner_id = auth.uid()))
  );

commit;
