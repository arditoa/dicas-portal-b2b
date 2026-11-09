#!/bin/bash
# Página do local: "Sobre", horário com "aberto agora" e programação da semana (texto + flyer).
# ANTES de subir: rode no SQL Editor do Supabase o arquivo supabase-migration/067_sobre_e_programacao_semanal.sql
cd "$(dirname "$0")" || exit 1
git add supabase-migration/067_sobre_e_programacao_semanal.sql \
  "src/app/business/[id].tsx" \
  portal-b2b-lgbt/src/app/dashboard/perfil/page.tsx
git status --short | grep -E '^(A|M)'
read -p "Subir? (s/n) " r
if [ "$r" = "s" ]; then
  git commit -m "Pagina do local: Sobre, horario aberto agora e programacao da semana

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01RJ3r6vr1pLNorHoYNCwK1d" && git push
fi
