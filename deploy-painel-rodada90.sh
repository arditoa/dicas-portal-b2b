#!/bin/bash
# Rodada 90 — Locais redesenhado (filtros à esquerda), regras do portal iguais às do app,
# Membro Fundador automático pelo plano e limites do app para 100+ locais.
# ANTES: rode supabase-migration/049_fundador_automatico_e_selo_protegido.sql no SQL Editor do Supabase.
cd "$(dirname "$0")" || exit 1
git add supabase-migration/049_fundador_automatico_e_selo_protegido.sql \
  portal-b2b-lgbt/src/app/admin/page.tsx portal-b2b-lgbt/src/components/PainelVisaoGeral.tsx \
  "src/app/(tabs)/index.tsx" "src/app/category/[id].tsx" "src/app/experience/[tag].tsx" "src/app/secao/[tipo].tsx"
git status --short | grep -E '^(A|M)'
read -p "Subir? (s/n) " r
if [ "$r" = "s" ]; then
  git commit -m "Portal: Locais com filtros laterais e etiquetas; regras de vitrine iguais as do app (prazo, plano ativo); Membro Fundador automatico pelo plano (migration 049); app: limites para 100+ locais

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01RJ3r6vr1pLNorHoYNCwK1d" && git push
fi
