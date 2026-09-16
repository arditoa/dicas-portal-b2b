-- Pedido da Andrea depois de testar o fluxo antigo de aprovação: pedir
-- e-mail no cadastro (que o bar não usa no dia a dia) e depois fazer o
-- parceiro preencher o CNPJ de novo em /vincular ficou confuso ("preencher
-- duas vezes"). A partir de agora, aprovar um local no /admin já cria a
-- conta de login do parceiro automaticamente, usando o WhatsApp que ele
-- já informou no próprio cadastro (nunca precisa de e-mail) e uma senha
-- gerada na hora — sem precisar de /vincular pra esse fluxo.
--
-- Criar uma conta de autenticação (supabase.auth.admin.createUser) só é
-- possível a partir do servidor, com a service_role key — chave que nunca
-- é exposta no navegador (fica só numa variável de ambiente do lado do
-- servidor no Vercel). Como a aprovação grava status/owner_id na mesma
-- chamada, ela bate no mesmo gatilho de proteção que reverte edições sem
-- uma sessão de admin reconhecida (o motivo exato do "aprovar no Table
-- Editor do Supabase volta pra pendente" que a Andrea encontrou). A
-- service_role key já é, por natureza, tão confiável quanto um admin
-- logado (só existe no servidor) — então este ajuste libera ela também,
-- ao lado do is_admin() que já existia.

create or replace function public.protect_admin_fields_locais()
returns trigger as $$
begin
  if pg_trigger_depth() > 1 then
    return new;
  end if;
  if not (public.is_admin() or auth.role() = 'service_role') then
    new.status := old.status;
    new.safe_space := old.safe_space;
    new.plano_destaque := old.plano_destaque;
    new.destaque_ate := old.destaque_ate;
    new.owner_id := old.owner_id;
    new.rating_media := old.rating_media;
    new.rating_total := old.rating_total;
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;
