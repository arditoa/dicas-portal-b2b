-- ============================================================================
-- 022 — protect_admin_fields_eventos() passa a reconhecer a Service Role
-- Key, igual a 012 já fez pra locais
-- ============================================================================
-- Contexto: pedido da Andrea pra também gerar login automático (senha por
-- WhatsApp) pro organizador de evento/festa quando aprovado, igual já
-- acontece com locais desde a Rodada 22 (012). Isso exige criar a conta de
-- autenticação (auth.admin.createUser) a partir de uma API route no
-- servidor, com a service_role key -- só o servidor pode fazer isso.
--
-- Só que a aprovação do evento também grava `status` e `criado_por` na
-- mesma chamada, e caiu bem no MESMO buraco que a 012 já resolveu pra
-- `locais`: o gatilho `protect_admin_fields_eventos()` (criado na 001)
-- só reconhece `is_admin()` -- que depende de `auth.uid()`, sempre NULL
-- numa chamada feita com a service_role key (não tem sessão de usuário
-- nenhuma). Sem este fix, uma API route feita com a service_role key
-- pareceria funcionar (responde 200, sem erro) mas o gatilho reverteria
-- silenciosamente `status` e `criado_por` de volta pro valor antigo --
-- exatamente o tipo de bug que não avisa que falhou, reproduzido e
-- confirmado no harness local antes deste fix.
--
-- A service_role key só existe numa variável de ambiente do lado do
-- servidor (nunca no navegador) -- é tão confiável quanto um admin
-- logado, então este ajuste libera ela também, ao lado do is_admin() que
-- já existia. Mesma receita exata da 012.
-- ============================================================================

create or replace function public.protect_admin_fields_eventos()
returns trigger as $$
begin
  if pg_trigger_depth() > 1 then
    return new;
  end if;
  if not (public.is_admin() or auth.role() = 'service_role') then
    new.status := old.status;
    new.plano_destaque := old.plano_destaque;
    new.criado_por := old.criado_por;
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;
