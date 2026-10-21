#!/bin/bash
# Rodada 82 — Pipeline da equipe (/equipe): abas "Painel" e "Materiais" + cidade no lead.
#
# Envia SO estes arquivos:
#   - landing-dicaslgbt/public/equipe-app/pipeline.html
#   - supabase-migration/046_pipeline_painel_materiais.sql
# Rode no Terminal do seu Mac. O deploy acontece pela integracao Vercel<->GitHub.
set -e
cd ~/Projetos/meu-app-isolado

git add landing-dicaslgbt/public/equipe-app/pipeline.html \
        supabase-migration/046_pipeline_painel_materiais.sql

if git diff --cached --name-only | grep -q -i -E "\.csv$|042_pipeline_dados_iniciais"; then
  echo "ERRO: arquivo com dados reais entrou no commit. Cancelando."; git reset -q; exit 1
fi

echo "=== O que vai ser enviado ==="
git diff --cached --stat
read -p "Enviar agora? (s/N) " resp
if [ "$resp" != "s" ] && [ "$resp" != "S" ]; then git reset -q; echo "Cancelado."; exit 0; fi

git commit -m "Pipeline da equipe: abas Painel (dashboard por categoria, fase, cidade, equipe e numeros do app) e Materiais oficiais; cidade no lead; migration 046"
git push

echo ""
echo "Pronto. Antes de abrir, rode a 046 no SQL Editor do Supabase."
echo "Depois: https://www.dicaslgbt.com.br/equipe  (abas Painel e Materiais)"
