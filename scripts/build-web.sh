#!/bin/bash
# Gera a versão web do app e prepara a pasta ~/dicas-app-web (link do time).
#
# Por que este script existe: o `expo export` coloca as fontes dos ícones em
# assets/node_modules/..., e a Vercel IGNORA qualquer pasta "node_modules"
# no deploy. Resultado: no link, todos os ícones viravam quadradinhos.
# Aqui a pasta é renomeada para assets/vendor e o código é ajustado.
#
# Uso (no Terminal do Mac):
#   cd ~/Projetos/meu-app-isolado && bash scripts/build-web.sh
#   cd ~/dicas-app-web && npx vercel --prod
set -e
SAIDA="${TMPDIR:-/tmp}/dicas-web-build"
DESTINO="$HOME/dicas-app-web"
rm -rf "$SAIDA"
npx expo export --platform web --output-dir "$SAIDA"
mv "$SAIDA/assets/node_modules" "$SAIDA/assets/vendor"
for f in "$SAIDA"/_expo/static/js/web/*.js; do
  sed -i.bak 's#/assets/node_modules/#/assets/vendor/#g' "$f" && rm -f "$f.bak"
done
rm -rf "$DESTINO/_expo" "$DESTINO/assets"
cp -R "$SAIDA/_expo" "$SAIDA/assets" "$DESTINO/"
cp "$SAIDA/index.html" "$SAIDA/favicon.ico" "$SAIDA/metadata.json" "$DESTINO/"
echo "Pronto. Agora rode: cd $DESTINO && npx vercel --prod"
