-- Pacotes de viagem: só quem for liberado pode cadastrar.
-- locais.pode_subir_pacotes = "este local (agência/operadora) pode subir pacotes".
-- A liberação automática vale para turismo cuja subcategoria indica agência/operadora/pacote/tour,
-- e para quem já tem pacote cadastrado. Depois a equipe liga/desliga em /admin > Catálogo > "Pode subir pacotes".
begin;

alter table public.locais add column if not exists pode_subir_pacotes boolean not null default false;

update public.locais
   set pode_subir_pacotes = true
 where categoria = 'turismo'
   and (subcategoria ~* '(ag[eê]ncia|operadora|pacote|tour|viagem)'
        or exists (select 1 from public.pacotes_turismo p where p.local_id = locais.id));

-- Escrita: dono liberado ou admin. Leitura pública continua como estava.
drop policy if exists "pacotes_turismo_write_dono_ou_admin" on public.pacotes_turismo;
create policy "pacotes_turismo_write_dono_ou_admin" on public.pacotes_turismo
  for all using (
    exists (select 1 from public.locais l where l.id = local_id and ((l.owner_id = auth.uid() and l.pode_subir_pacotes) or public.is_admin()))
  ) with check (
    exists (select 1 from public.locais l where l.id = local_id and ((l.owner_id = auth.uid() and l.pode_subir_pacotes) or public.is_admin()))
  );

commit;
