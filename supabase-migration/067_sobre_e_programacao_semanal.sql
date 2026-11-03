-- Rodada 123 — página do local: "Sobre" (já existe: locais.descricao) +
-- programação da semana escrita e/ou em imagem (flyer) enviada pelo próprio
-- bar. O dono já consegue editar estas colunas pela RLS de locais
-- (locais_update_dono_ou_admin), então não precisa de política nova.
alter table public.locais
  add column if not exists programacao_texto text,
  add column if not exists programacao_imagem_url text;

comment on column public.locais.programacao_texto is
  'Programação da semana escrita pelo local (uma linha por dia/atração). Exibida no app só para plano Premium/Fundador ativo.';
comment on column public.locais.programacao_imagem_url is
  'Flyer/imagem da programação da semana (bucket fotos-locais, caminho <local_id>/programacao-*). Exibida no app só para plano Premium/Fundador ativo.';
