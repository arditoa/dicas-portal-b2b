-- ============================================================================
-- 076 — Subcategoria no CADASTRO RÁPIDO (anônimo), com texto livre
-- ============================================================================
-- Pedido da Andrea: o cadastro do site precisa ter categoria + subcategoria e um
-- campo em branco para o parceiro escrever a subcategoria quando ela ainda não
-- existir na lista do app.
--
-- Mesma receita da foto (017) e do horário (021): quem cadastra ainda está
-- anônimo, e a policy de UPDATE de `locais` exige dono (owner_id = auth.uid()),
-- então um .update() direto falharia em silêncio. Esta função SECURITY DEFINER
-- só mexe em local PENDENTE e SEM DONO — a mesma janela segura das outras duas.
-- O texto vai para `locais.subcategoria`, igual ao cadastro completo
-- (/cadastro/local) já faz com "Outros".
-- Seguro rodar mais de uma vez. Pode rodar inteira de uma vez.
-- ============================================================================

create or replace function public.cadastro_rapido_definir_subcategoria_local(
  p_id uuid,
  p_subcategoria text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_texto text := nullif(btrim(coalesce(p_subcategoria, '')), '');
begin
  if v_texto is null then
    return false;
  end if;
  -- evita texto gigante vindo de chamada direta à API
  v_texto := left(v_texto, 60);

  update public.locais
     set subcategoria = v_texto
   where id = p_id
     and status = 'pendente'
     and owner_id is null;

  return found;
end;
$$;

grant execute on function public.cadastro_rapido_definir_subcategoria_local(uuid, text) to anon, authenticated;
