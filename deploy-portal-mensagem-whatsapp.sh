#!/bin/bash
# Mensagem de aprovacao no WhatsApp (assinada pelo Emerson, texto neutro, com senha provisoria,
# lancamento do app em 03/12 e convite para chamar sempre).
# Envia SO este arquivo: portal-b2b-lgbt/src/app/admin/page.tsx
# O portal (Vercel) sobe sozinho com o push.
set -e
cd ~/Projetos/meu-app-isolado

git add portal-b2b-lgbt/src/app/admin/page.tsx

echo "=== O que vai ser enviado ==="
git diff --cached --stat
read -p "Enviar agora? (s/N) " resp
if [ "$resp" != "s" ] && [ "$resp" != "S" ]; then git reset -q; echo "Cancelado."; exit 0; fi

git commit -m "Portal: mensagem de aprovacao no WhatsApp assinada pelo Emerson, com senha provisoria, lancamento do app em 03/12 e convite para contato"
git push

echo ""
echo "Pronto. Quando a Vercel terminar (Ready), aprove um cadastro de teste ou use 'Enviar acesso' para ver a nova mensagem."
