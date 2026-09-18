-- Rodada 24 — tags de experiência escolhidas pelo próprio parceiro no
-- portal ("Pet Friendly", "Parklet", "Aniversário", etc. — mesma lista de
-- chips "Escolha pela experiência" da Home do app, ver
-- src/app/(tabs)/index.tsx) + tags livres digitadas por ele. Não é a
-- mesma coisa que `publico_tags` (RLS/filtro de público real) — essa aqui
-- é descritiva, mostrada no perfil do local e usada como tag de
-- destaque/venda dos planos (ver /planos: "3 tags — Top 5" no Premium).
--
-- Coluna aberta (mesmo padrão de `publico_tags`/`descricao`/`fotos`
-- desde a Rodada 16): a RLS `locais_update_dono_ou_admin` já deixa o
-- dono escrever qualquer coluna fora da lista travada por
-- `protect_admin_fields_locais` (status/safe_space/plano_destaque/...),
-- então não precisa de trigger novo pra permitir a escrita. O limite de
-- quantidade por plano (3 tags no Premium/Fundador, 0 nos demais — como
-- já promete `/planos`) é aplicado só na tela do portal, não no banco —
-- mesmo grau de confiança já usado hoje pro limite de cupons por plano
-- (nenhum dos dois é travado por RLS/trigger; ver Rodada 16). Se um dia
-- quiser travar isso de verdade no banco, é um trigger pequeno a mais,
-- comparando array_length(new.tags,1) contra o plano/status atual.

alter table public.locais
  add column if not exists tags text[] not null default '{}'::text[];
