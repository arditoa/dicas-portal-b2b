-- 121 — Foto com a moldura da marca (15/11/2026). Rode depois da 119.
-- A foto NUNCA sobe para o servidor: fica no celular da pessoa, que decide compartilhar ou salvar.
-- Aqui só contamos quantas fotos foram tiradas e quantas foram compartilhadas em cada ação de marca
-- (nenhuma imagem, nenhum nome). O número entra no resultado da ação (equipe Dicas e a casa dona da ação).
-- Seguro rodar mais de uma vez.

create table if not exists public.acoes_marca_fotos (
  id bigint generated always as identity primary key,
  acao_id uuid not null references public.acoes_marca(id) on delete cascade,
  user_id uuid default auth.uid() references public.profiles(id) on delete set null,
  tipo text not null check (tipo in ('foto', 'compartilhou', 'salvou')),
  created_at timestamptz not null default now()
);
alter table public.acoes_marca_fotos enable row level security;
-- Ninguém lê nem grava direto: só pelas funções abaixo.

create or replace function public.registrar_foto_marca(p_acao uuid, p_tipo text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_tipo not in ('foto', 'compartilhou', 'salvou') then raise exception 'Tipo inválido.'; end if;
  if not exists (select 1 from public.acoes_marca where id = p_acao and ativa) then return; end if;
  insert into public.acoes_marca_fotos (acao_id, user_id, tipo) values (p_acao, auth.uid(), p_tipo);
end;
$$;
revoke execute on function public.registrar_foto_marca(uuid, text) from public, anon;
grant execute on function public.registrar_foto_marca(uuid, text) to authenticated;

create or replace function public.fotos_da_acao(p_acao uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_local uuid;
begin
  select local_id into v_local from public.acoes_marca where id = p_acao;
  if not found then raise exception 'Ação não encontrada.'; end if;
  if not public.is_admin() and (v_local is null or not public.pode_no_local(v_local, 'resultados')) then
    raise exception 'Sem acesso ao resultado desta ação.' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'fotos',         (select count(*) from public.acoes_marca_fotos where acao_id = p_acao and tipo = 'foto'),
    'compartilhadas',(select count(*) from public.acoes_marca_fotos where acao_id = p_acao and tipo = 'compartilhou'),
    'salvas',        (select count(*) from public.acoes_marca_fotos where acao_id = p_acao and tipo = 'salvou'),
    'pessoas',       public.rel_n((select count(distinct user_id) from public.acoes_marca_fotos where acao_id = p_acao and tipo = 'foto'))
  );
end;
$$;
revoke execute on function public.fotos_da_acao(uuid) from public, anon;
grant execute on function public.fotos_da_acao(uuid) to authenticated;

-- Conferência
select to_regclass('public.acoes_marca_fotos') as tabela;
