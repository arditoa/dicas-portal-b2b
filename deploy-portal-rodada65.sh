#!/bin/bash
# Rodadas 63–65 — publica no portal: aba "Destinos" no /admin, cadastro
# completo de hospedagem, validação de hospedagens e locais próximos, e as
# tags novas no cadastro de evento.
# Rode no Terminal do Mac:  bash ~/Projetos/meu-app-isolado/deploy-portal-rodada65.sh
# Ele faz git add/commit/push; a Vercel publica sozinha pelo GitHub.
set -e
cd ~/Projetos/meu-app-isolado

# Inclui também as telas da Rodada 61 (Pacotes e roteiros, Produtos,
# Serviços) que estavam prontas na pasta mas ainda não tinham sido publicadas.
git add portal-b2b-lgbt/src

git commit -m "Rodadas 61-65: pacotes/produtos, aba Destinos no admin, cadastro completo de hospedagem, validacao e tags de eventos"
git push

echo ""
echo "Pronto. Em 1-2 minutos confira na Vercel se o deploy do portal ficou 'Ready'."
