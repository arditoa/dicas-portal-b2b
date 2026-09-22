-- 029: logo do local + "bairro para exibir" (locais).
--
-- Dois campos novos, opcionais, 100% cosméticos — nenhum dos dois entra
-- em RLS/trigger novo (protect_admin_fields_locais, migration 024, não
-- lista nenhum dos dois, então o dono do local já pode editar os dois
-- sozinho, igual nome/descrição/foto de capa).
--
-- logo_url — pedido da Andrea: "Membro Fundador, deixar o admin do
-- portal subir o logo do local." Antes só existia foto_capa_url (a foto
-- do ambiente, usada em quase todo card) — o botão "Subir logo" que já
-- existia no /admin, de forma confusa, gravava nela. Agora é um campo
-- de verdade, separado, usado especificamente pelos avatares redondos do
-- banner "Membro Fundador" na Home do app (com fallback pra
-- foto_capa_url quando o local ainda não tiver logo próprio — ver
-- fundadorLogos em src/app/(tabs)/index.tsx). Upload pelo mesmo bucket
-- "fotos-locais" de sempre, path `${id}/logo-...`.
--
-- bairro_exibicao — pedido da Andrea: "criar no portal a opção do local
-- escolher o bairro como aparece na aba principal (desde que não afete a
-- localização). Por exemplo, Augusta fica melhor que Consolação." Texto
-- livre, opcional, SÓ de apresentação — nunca usado por
-- buscarCoordenadas/geocodificação (que continua lendo só `bairro`, o
-- campo oficial). O app usa bairro_exibicao || bairro || cidade em todo
-- lugar que hoje mostra o bairro na Home (ver bairroExibicao() em
-- (tabs)/index.tsx).

begin;

alter table public.locais
  add column if not exists logo_url text;
comment on column public.locais.logo_url is
  'Logo do local (separado de foto_capa_url) — usado nos avatares do banner "Membro Fundador" da Home. Opcional.';

alter table public.locais
  add column if not exists bairro_exibicao text;
comment on column public.locais.bairro_exibicao is
  'Bairro opcional só de apresentação (ex: "Augusta" em vez de "Consolação") — nunca usado pra geocodificação, só pro texto mostrado no app.';

commit;
