#!/bin/bash
# Rodada 58/59 — sobe o site institucional (landing-dicaslgbt) completo:
# paginas novas (sobre, app, dicas-trip, lancamento, entrar, termos,
# parceiro-fundador, privacidade), componentes compartilhados (Header,
# Footer, WaitlistForm, MobileFixedCta), constants.ts e os ajustes de
# preco/vagas/dominio/privacidade da Rodada 59.
#
# O projeto "landing-dicaslgbt" ja existe na Vercel (mesma equipe do
# portal) - isso so ATUALIZA o que ja esta publicado, nao cria nada novo.
#
# Rode no Terminal do seu Mac (nao no Claude). So faz git add/commit/push
# - o deploy acontece pela integracao Vercel<->GitHub.
set -e

cd ~/Projetos/meu-app-isolado

echo "=== O que vai ser enviado (so arquivos do landing-dicaslgbt) ==="
git status landing-dicaslgbt/

echo ""
echo "=== Adicionando ==="
git add landing-dicaslgbt/

echo ""
echo "=== Commit ==="
git commit -m "Rodada 58/59: site institucional completo (paginas do guia, preco/vagas Fundador, dominio, privacidade final)"

echo ""
echo "=== Push ==="
git push

echo ""
echo "Pronto. Confira em alguns instantes no dashboard da Vercel (projeto"
echo "landing-dicaslgbt) se o deploy ficou 'Ready'. Lembre de conferir tambem"
echo "se as variaveis de ambiente (WhatsApp, Instagram) ja estao cadastradas"
echo "la em Settings > Environment Variables antes de considerar publicado."
