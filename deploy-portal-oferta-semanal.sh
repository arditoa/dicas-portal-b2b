#!/bin/bash
# Portal — Intermediário publica 1 oferta por semana (roda a cada 4h), Starter sai, preços novos
# (Intermediário R$359, Premium R$499, Fundador R$349,90 x 12, 12 vagas).
# ANTES de subir: rode no SQL Editor do Supabase o arquivo supabase-migration/066_oferta_semanal_intermediario.sql
cd "$(dirname "$0")" || exit 1
git add supabase-migration/066_oferta_semanal_intermediario.sql \
  portal-b2b-lgbt/src/app/dashboard/cupons/page.tsx \
  portal-b2b-lgbt/src/app/dashboard/destaques/page.tsx \
  portal-b2b-lgbt/src/app/dashboard/page.tsx \
  portal-b2b-lgbt/src/app/admin/page.tsx \
  portal-b2b-lgbt/src/app/planos/page.tsx \
  portal-b2b-lgbt/src/components/PainelVitrine.tsx
git status --short | grep -E '^(A|M)'
read -p "Subir? (s/n) " r
if [ "$r" = "s" ]; then
  git commit -m "Portal: oferta semanal do Intermediario, Starter removido e precos novos

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01RJ3r6vr1pLNorHoYNCwK1d" && git push
fi
