#!/bin/bash
# Rodada 89 — Painel de gestão novo (menu lateral + Visão geral) e medição anônima de tempo por tela no app.
# ANTES: rode supabase-migration/048_uso_telas.sql no SQL Editor do Supabase (e a 047, se ainda não rodou).
cd "$(dirname "$0")" || exit 1
git add supabase-migration/048_uso_telas.sql \
  src/lib/usoTelas.ts \
  "src/app/(tabs)/index.tsx" "src/app/(tabs)/explore.tsx" "src/app/(tabs)/events.tsx" "src/app/(tabs)/tourism.tsx" "src/app/(tabs)/profile.tsx" \
  "src/app/category/[id].tsx" "src/app/business/[id].tsx" "src/app/secao/[tipo].tsx" "src/app/experience/[tag].tsx" \
  "src/app/evento/[id].tsx" src/app/busca.tsx "src/app/destino/[slug].tsx" "src/app/roteiro/[slug].tsx" \
  portal-b2b-lgbt/src/app/admin/page.tsx portal-b2b-lgbt/src/components/PainelVisaoGeral.tsx \
  landing-dicaslgbt/src/app/privacidade/page.tsx
git status --short | grep -E '^(A|M)'
read -p "Subir? (s/n) " r
if [ "$r" = "s" ]; then
  git commit -m "Portal: menu lateral e Visao geral (carteira, uso das telas, ranking de locais); app: tempo por tela anonimo; privacidade; migration 048

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01RJ3r6vr1pLNorHoYNCwK1d" && git push
fi
