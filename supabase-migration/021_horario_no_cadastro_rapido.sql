-- ============================================================================
-- 021 — RPC pra gravar horário de funcionamento já no cadastro rápido
-- (anônimo, mesma janela de segurança da foto)
-- ============================================================================
-- Contexto: a 020 criou a coluna `locais.horario_funcionamento`, editável
-- pelo dono via UPDATE normal (RLS de locais_update_dono_ou_admin já
-- cobre). Mas no CADASTRO RÁPIDO, quem preenche o horário ainda está
-- anônimo (auth.uid() nulo) — e a policy de update exige
-- `owner_id = auth.uid()`, que nunca bate pra `null = null`. Um simples
-- `.update(...)` depois do `cadastro_rapido_criar_local` (017) silenciosamente
-- não gravaria nada (RLS bloqueia, sem erro nenhum pro cliente — o tipo de
-- bug mais traiçoeiro, porque não avisa que falhou).
--
-- Solução: mesma receita da 017 pra foto — uma função SECURITY DEFINER
-- restrita à mesma janela seguraadmin (`status = 'pendente' and
-- owner_id is null`), chamada como um passo extra depois de criar o
-- local, exatamente como `cadastro_rapido_definir_foto_local` já faz.
-- ============================================================================

create or replace function public.cadastro_rapido_definir_horario_local(
  p_id uuid,
  p_horario jsonb
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.locais
    set horario_funcionamento = coalesce(p_horario, '{}'::jsonb)
    where id = p_id
      and status = 'pendente'
      and owner_id is null;

  return found;
end;
$$;

grant execute on function public.cadastro_rapido_definir_horario_local(uuid, jsonb) to anon, authenticated;
