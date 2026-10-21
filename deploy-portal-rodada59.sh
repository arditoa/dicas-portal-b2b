#!/bin/bash
# Rodada 59 — sobe as correções de preço e vagas do plano Fundador no portal-b2b-lgbt.
# Rode este script no Terminal do seu Mac (não no Claude). Ele só faz
# git add/commit/push — o deploy em si acontece pela integração
# Vercel↔GitHub que já está publicando o portal há várias rodadas.
set -e

cd ~/Projetos/meu-app-isolado

echo "=== O que vai ser enviado (só arquivos do portal-b2b-lgbt) ==="
git status portal-b2b-lgbt/

echo ""
echo "=== Adicionando ==="
git add portal-b2b-lgbt/src/app/planos/page.tsx
git add portal-b2b-lgbt/src/app/admin/page.tsx
git add portal-b2b-lgbt/src/app/dashboard/page.tsx

echo ""
echo "=== Commit ==="
git commit -m "Rodada 59: corrige preco e vagas do plano Fundador (R\$3.490/12x R\$349, 10 vagas)"

echo ""
echo "=== Push ==="
git push

echo ""
echo "Pronto. Confira em alguns instantes no dashboard da Vercel se o deploy do"
echo "portal (projeto ligado ao repositorio) ficou 'Ready' antes de considerar"
echo "publicado."
