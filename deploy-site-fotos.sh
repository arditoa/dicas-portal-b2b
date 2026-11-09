#!/bin/bash
# Rodada 85 — fotos reais no site (www.dicaslgbt.com.br): home, Lista Antecipada e Sobre.
# Envia SO estes arquivos (nao mexe na pagina de privacidade nem no pipeline):
#   - landing-dicaslgbt/public/fotos/*.jpg
#   - landing-dicaslgbt/src/lib/fotos.ts
#   - landing-dicaslgbt/src/components/FotoTile.tsx
#   - landing-dicaslgbt/src/app/page.tsx, lista-antecipada/page.tsx, sobre/page.tsx
# O site (Vercel) sobe sozinho com o push.
set -e
cd ~/Projetos/meu-app-isolado

git add landing-dicaslgbt/public/fotos \
        landing-dicaslgbt/src/lib/fotos.ts \
        landing-dicaslgbt/src/components/FotoTile.tsx \
        landing-dicaslgbt/src/app/page.tsx \
        landing-dicaslgbt/src/app/lista-antecipada/page.tsx \
        landing-dicaslgbt/src/app/sobre/page.tsx

echo "=== O que vai ser enviado ==="
git diff --cached --stat
read -p "Enviar agora? (s/N) " resp
if [ "$resp" != "s" ] && [ "$resp" != "S" ]; then git reset -q; echo "Cancelado."; exit 0; fi

git commit -m "Site: fotos reais da dupla (topo da Lista Antecipada, fundo da home, galerias, Dicas Lab e Sobre), com o app na tela do celular"
git push

echo ""
echo "Pronto. Quando a Vercel terminar (Ready), confira: / , /lista-antecipada e /sobre (use janela anonima)."
