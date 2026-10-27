#!/bin/bash
# Rodada 98 — publica TUDO que está pendente (rodadas 91 a 98): app + portal + migrations.
#  Novidades: categoria Educação, filtros em Hospedagem/Passeios/Pacotes, degradê nas páginas de destino,
#  Membros Fundadores em cartão largo, página e card do Museu, Pacotes separado de Agências.
# ANTES: no SQL Editor do Supabase, uma de cada vez, nesta ordem (as que já rodou, pule):
#   047, 048, 049, 050_banners_app, 051_banner_museu, 052_pacotes_agencias, 053_categoria_educacao (SOZINHA), 054_pacotes_destino_duracao, 055_arte_destaque_home, 056_status_aberto (SOZINHA), 057_bucket_avatares
cd "$(dirname "$0")" || exit 1
git add src portal-b2b-lgbt/src supabase-migration ':!src/assets/images/*(2).png' \
  package.json package-lock.json app.json deploy-rodada98.sh
git status --short | grep -E '^(A|M)'
read -p "Subir? (s/n) " r
if [ "$r" = "s" ]; then
  git commit -m "App: categoria Educacao, filtros em Hospedagem/Passeios/Pacotes, degrade nos destinos, vitrine de artes na Home (fundadores), pagina e card do Museu, Pacotes separado de Agencias; portal: Educacao, pacotes com destino/duracao/estilo, liberacao de pacotes; abertura com missao e objetivo, foto e status opcionais no perfil; migrations 050 a 057

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01RJ3r6vr1pLNorHoYNCwK1d" && git push
fi
