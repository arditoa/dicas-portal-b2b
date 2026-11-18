#!/bin/bash
# Rodada 134 — sobe só a escolha "Relação com a comunidade LGBT+" no portal
# (Minha Página + /admin). Não precisa de migration nem de nova versão do app.
# Uso: bash ~/Projetos/meu-app-isolado/deploy-lugar-lgbt.sh
cd "$(dirname "$0")" || exit 1
echo "=== Conferindo o portal (TypeScript) ==="
(cd portal-b2b-lgbt && npx tsc --noEmit) || { echo "Erro de codigo. Nada foi enviado."; exit 1; }
git add portal-b2b-lgbt/src/app/dashboard/perfil/page.tsx portal-b2b-lgbt/src/app/admin/page.tsx
git diff --cached --shortstat
read -p "Subir agora? (s/n) " r
if [ "$r" = "s" ]; then
  git commit -m "Portal: parceiro e admin escolhem a relação com a comunidade LGBT+ (selo Lugar LGBT+ no app)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01XXn2U9kUmg5UdfLj4as6mF" && git push && echo "Enviado! A Vercel publica em 1 a 2 minutos."
else
  git reset -q; echo "Cancelado."
fi
