-- Complemento ao 001_migrar_para_locais.sql: o desenho original de "locais"
-- não previa CNPJ — mas o cadastro real de parceiro (portal, com busca de
-- endereço via CNPJ) sempre dependeu disso pra funcionar e evitar cadastro
-- duplicado. Adicionando agora, de forma aditiva (não afeta nada que já
-- existe).
alter table if exists public.locais add column if not exists cnpj text;

-- Índice único PARCIAL (só entre os que têm CNPJ preenchido) — permite
-- várias linhas com cnpj nulo (ex.: evento cadastrado sem CNPJ de empresa),
-- mas impede duas linhas com o MESMO CNPJ preenchido.
create unique index if not exists idx_locais_cnpj_unico
  on public.locais (cnpj)
  where cnpj is not null;
