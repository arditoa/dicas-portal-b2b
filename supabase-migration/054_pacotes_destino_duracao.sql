-- Pacotes: destino e duração próprios (para filtrar na tela Pacotes do app).
-- Antes o pacote usava a cidade da agência; agora a agência informa para onde é a viagem.
alter table public.pacotes_turismo add column if not exists destino text;
alter table public.pacotes_turismo add column if not exists duracao_texto text;
-- `tags` (estilo do pacote) já existe desde a migration 036.
