#!/bin/bash
# Rodada 71 — sobe o Pipeline da equipe (pagina escondida /equipe com login)
# para o site institucional (landing-dicaslgbt).
#
# Envia SO estes arquivos:
#   - landing-dicaslgbt/public/equipe-app/   (pipeline.html + supabase.js)
#   - landing-dicaslgbt/next.config.ts       (rota /equipe, noindex, e os
#                                             links curtos /cadastro e
#                                             /cadastro-evento)
#   - supabase-migration/041_pipeline_equipe.sql
#   - .gitignore                              (impede subir a 042, que tem
#                                             telefones reais de leads)
# NAO envia mais nada (o resto das suas alteracoes pendentes fica de fora).
#
# Rode no Terminal do seu Mac (nao no Claude). So faz git add/commit/push
# - o deploy acontece pela integracao Vercel<->GitHub.
set -e

cd ~/Projetos/meu-app-isolado

echo "=== Adicionando so os arquivos do Pipeline ==="
git add .gitignore \
        landing-dicaslgbt/next.config.ts \
        landing-dicaslgbt/public/equipe-app \
        supabase-migration/041_pipeline_equipe.sql

echo ""
echo "=== Conferencia de seguranca ==="
if git diff --cached --name-only | grep -q "042_pipeline_dados_iniciais"; then
  echo "ERRO: o arquivo 042 (dados reais) entrou no commit. Cancelando."
  git reset -q
  exit 1
fi
echo "OK: o arquivo 042 (dados reais de leads) NAO esta no commit."

echo ""
echo "=== O que vai ser enviado ==="
git diff --cached --stat

echo ""
read -p "Enviar agora? (s/N) " resp
if [ "$resp" != "s" ] && [ "$resp" != "S" ]; then
  git reset -q
  echo "Cancelado. Nada foi enviado."
  exit 0
fi

echo ""
echo "=== Commit ==="
git commit -m "Pipeline da equipe: pagina /equipe com login (Supabase), migration 041, links curtos /cadastro"

echo ""
echo "=== Push ==="
git push

echo ""
echo "Pronto. Em alguns instantes confira no dashboard da Vercel (projeto"
echo "landing-dicaslgbt) se o deploy ficou 'Ready' e depois abra:"
echo "  https://www.dicaslgbt.com.br/equipe"
echo "Lembre: antes de entrar, rode a 041 e cadastre os usuarios no Supabase."
