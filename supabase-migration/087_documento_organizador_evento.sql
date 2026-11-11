-- 087 — CPF/CNPJ do organizador de festa, SÓ PARA CONTROLE da equipe (não aparece no app nem para o público).
-- Fica numa tabela à parte, sem leitura pública (a tabela eventos é pública depois de aprovada), e só o admin lê.
-- O formulário grava pelo RPC abaixo (anônimo ou logado), que só aceita evento ainda pendente.
-- Seguro rodar mais de uma vez.

create table if not exists public.eventos_documentos (
  evento_id uuid primary key references public.eventos(id) on delete cascade,
  documento text not null check (documento ~ '^[0-9]{11}$' or documento ~ '^[0-9]{14}$'),
  created_at timestamptz not null default now()
);

alter table public.eventos_documentos enable row level security;
revoke all on table public.eventos_documentos from anon, authenticated;

drop policy if exists "eventos_documentos_so_admin" on public.eventos_documentos;
create policy "eventos_documentos_so_admin" on public.eventos_documentos
  for all using (public.is_admin()) with check (public.is_admin());

create or replace function public.cadastro_evento_definir_documento(p_id uuid, p_documento text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  d text := regexp_replace(coalesce(p_documento, ''), '\D', '', 'g');
begin
  if length(d) not in (11, 14) then
    return false;
  end if;
  if not exists (
    select 1 from public.eventos e
    where e.id = p_id
      and e.status = 'pendente'
      and (e.criado_por is null or e.criado_por = auth.uid())
  ) then
    return false;
  end if;
  insert into public.eventos_documentos (evento_id, documento)
  values (p_id, d)
  on conflict (evento_id) do update set documento = excluded.documento;
  return true;
end;
$$;

grant execute on function public.cadastro_evento_definir_documento(uuid, text) to anon, authenticated;

-- Conferência: deve listar a tabela com RLS ligada.
select tablename, rowsecurity from pg_tables where schemaname = 'public' and tablename = 'eventos_documentos';
