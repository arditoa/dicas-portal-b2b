#!/bin/bash
# Rodada 72 — sobe a aba "Clientes B2C" do Pipeline da equipe (/equipe).
#
# Envia SO estes arquivos:
#   - landing-dicaslgbt/public/equipe-app/pipeline.html  (pipeline com a aba nova)
#   - supabase-migration/043_pipeline_clientes_b2c.sql   (tabela + modelos de mensagem)
# NAO envia a lista de clientes (CSV com telefones reais): ela fica fora do git
# e e importada direto no Supabase.
#
# Rode no Terminal do seu Mac (nao no Claude). So faz git add/commit/push
# - o deploy acontece pela integracao Vercel<->GitHub.
set -e

cd ~/Projetos/meu-app-isolado

echo "=== Adicionando so os arquivos da aba Clientes B2C ==="
git add landing-dicaslgbt/public/equipe-app/pipeline.html \
        supabase-migration/043_pipeline_clientes_b2c.sql

echo ""
echo "=== Conferencia de seguranca ==="
if git diff --cached --name-only | grep -q -i -E "\.csv$|042_pipeline_dados_iniciais|clientes_b2c_para_importar"; then
  echo "ERRO: um arquivo com dados reais (CSV ou 042) entrou no commit. Cancelando."
  git reset -q
  exit 1
fi
echo "OK: nenhum CSV nem dado real de clientes/leads esta no commit."

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
git commit -m "Pipeline da equipe: aba Clientes B2C (WhatsApp, aniversariantes, modelos de mensagem), migration 043"

echo ""
echo "=== Push ==="
git push

echo ""
echo "Pronto. Em instantes confira na Vercel (landing-dicaslgbt) se ficou 'Ready' e abra:"
echo "  https://www.dicaslgbt.com.br/equipe   (aba Clientes B2C)"
echo "Antes de usar: rode a 043 no SQL Editor e importe o CSV no Table Editor."
