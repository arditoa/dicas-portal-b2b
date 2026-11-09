#!/bin/bash
# Rodada 87 — Home nova (categorias > fundadores > Hoje > Destaques) + oferta no portal.
# ANTES: rode a migration supabase-migration/047_destaque_hora.sql no SQL Editor do Supabase.
cd "$(dirname "$0")" || exit 1
git add "src/app/(tabs)/index.tsx" src/components/DestaqueHora.tsx src/components/FundoCaixaDegrade.tsx src/lib/i18n.tsx \
  supabase-migration/047_destaque_hora.sql \
  portal-b2b-lgbt/src/components/PainelDestaqueHora.tsx portal-b2b-lgbt/src/app/admin/page.tsx
git status --short | grep -E '^(A|M)'
read -p "Subir? (s/n) " r
if [ "$r" = "s" ]; then
  git commit -m "App: Home reestruturada (categorias, fundadores, pilula Hoje e bloco Destaques com rodizio de 1 hora); portal: oferta do Destaques; migration 047

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01RJ3r6vr1pLNorHoYNCwK1d" && git push
fi
