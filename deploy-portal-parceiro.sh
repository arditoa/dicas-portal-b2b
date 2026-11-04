#!/bin/bash
# Sobe SO o portal do parceiro (B2B + admin) para o GitHub. A Vercel publica sozinha depois do push.
# Nao envia o app (src/), so portal-b2b-lgbt/src e as migrations 058 a 078.
#
# Uso (Terminal do Mac):
#   bash ~/Projetos/meu-app-isolado/deploy-portal-parceiro.sh
cd "$(dirname "$0")" || exit 1

echo "=== 1/4 Conferindo o portal (TypeScript) ==="
if ! (cd portal-b2b-lgbt && npx tsc --noEmit); then
  echo ""
  echo "O portal tem erro de codigo. Corrija antes de subir (nada foi enviado)."
  exit 1
fi
echo "OK: sem erros."

echo ""
echo "=== 2/4 Banco de dados ==="
echo "O portal novo usa tabelas e funcoes das migrations 058 a 078."
echo "Rode no SQL Editor do Supabase, uma por vez e em ordem (069 e 070 sozinhas)."
read -p "Ja rodou todas as migrations pendentes? (s/n) " ok
if [ "$ok" != "s" ]; then
  echo "Sem problema: rode as migrations e execute este script de novo. Nada foi enviado."
  exit 0
fi

echo ""
echo "=== 3/4 Separando os arquivos do portal ==="
git add portal-b2b-lgbt/src \
  supabase-migration/05[89]*.sql supabase-migration/06*.sql supabase-migration/07[0-8]*.sql
if git diff --cached --name-only | grep -q -i -E "(^|/)\.env|\.csv$|042_pipeline_dados_iniciais|\.tgz$|^dist/|service_role|google-services\.json"; then
  echo "ERRO: entrou no commit um arquivo que nao deveria (env, csv, backup, dist ou chave). Cancelando."
  git reset -q
  exit 1
fi
git status --short | grep -E '^(A|M)'
echo ""
git diff --cached --shortstat

echo ""
read -p "=== 4/4 Subir o portal agora? (s/n) " r
if [ "$r" = "s" ]; then
  git commit -m "Portal B2B e admin: categorias e vagas, posicao do local, agenda da semana em Eventos, fidelidade, cupons por plano, login com fundo animado, menu lateral, lembretes, cadastro único (local + festa) com subcategoria e sugestão de categoria

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01RJ3r6vr1pLNorHoYNCwK1d" && git push && {
    echo ""
    echo "Enviado! A Vercel publica o portal sozinha em 1 a 2 minutos."
    echo "Acompanhe em vercel.com (projeto do portal) e teste: Categorias, Agenda da semana, Fidelidade e Cupons."
  }
else
  git reset -q
  echo "Cancelado. Nada foi enviado."
fi
