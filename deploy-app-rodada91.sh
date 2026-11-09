#!/bin/bash
# Rodada 91 — degradê nas telas Escolha pela experiência e Trip; selo de Fundador do topo da Home
# vira estrela dourada com borda ouro (sem texto cortado); serviços (fotógrafo/beleza/lojas) saem do Em Alta
# da Home e ganham bloco próprio; chips por categoria nas listas.
cd "$(dirname "$0")" || exit 1
git add "src/app/(tabs)/index.tsx" "src/app/(tabs)/tourism.tsx" "src/app/(tabs)/profile.tsx" "src/app/secao/[tipo].tsx" src/components/FundoCaixaDegrade.tsx src/components/ListaPadrao.tsx src/lib/destaque.ts src/lib/i18n.tsx portal-b2b-lgbt/src/lib/destaque.ts
git status --short | grep -E '^(A|M)'
read -p "Subir? (s/n) " r
if [ "$r" = "s" ]; then
  git commit -m "App: degrade em Experiencia e Trip; selo Fundador do topo vira estrela dourada; servicos fora do Em Alta com bloco proprio; chips por categoria

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01RJ3r6vr1pLNorHoYNCwK1d" && git push
fi
