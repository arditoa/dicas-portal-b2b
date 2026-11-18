#!/bin/bash
# Cadastro de parceiro: aviso claro do que falta preencher (lista junto do botão, campos em vermelho,
# dica "toque em uma das opções" na Relação com a comunidade LGBT+). Só o portal; sem migration.
# Uso: bash ~/Projetos/meu-app-isolado/deploy-cadastro-feedback.sh
cd "$(dirname "$0")" || exit 1
echo "=== Conferindo o portal (TypeScript) ==="
(cd portal-b2b-lgbt && npx tsc --noEmit) || { echo "Erro de codigo. Nada foi enviado."; exit 1; }
git add portal-b2b-lgbt/src/components/cadastro/FormularioLocal.tsx
git diff --cached --shortstat
read -p "Subir o portal agora? (s/n) " r
if [ "$r" = "s" ]; then
  git commit -m "Portal: cadastro de parceiro mostra o que falta preencher (lista junto do botão, campos em vermelho e dica na relação com a comunidade LGBT+)

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01RJ3r6vr1pLNorHoYNCwK1d" && git push && echo "Enviado! A Vercel publica o portal em 1 a 2 minutos."
else
  git reset -q; echo "Cancelado."; exit 0
fi
echo ""
read -p "Gerar tambem a versao WEB do app para o time ver? (s/n) " w
if [ "$w" = "s" ]; then
  bash subir-app-web.sh
fi
