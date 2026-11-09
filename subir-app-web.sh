#!/bin/bash
# Sobe a versao WEB do app para o time ver (projeto Vercel proprio: dicas-app-web).
# Nao mexe no site (www.dicaslgbt.com.br) nem no portal parceiro.
#
# Uso (Terminal do Mac):
#   bash ~/Projetos/meu-app-isolado/subir-app-web.sh
#
# O que faz: confere pre-requisitos, gera a versao web (scripts/build-web.sh,
# que ja corrige os icones) e publica com a Vercel.
set -e
cd ~/Projetos/meu-app-isolado
DESTINO="$HOME/dicas-app-web"

echo "=== 1/4 Conferindo pre-requisitos ==="
if [ ! -d node_modules/expo-image-picker ]; then
  echo "Falta instalar o pacote de fotos. Rode: npx expo install expo-image-picker"
  exit 1
fi
if ! grep -q "^EXPO_PUBLIC_SUPABASE_URL=" .env 2>/dev/null || ! grep -q "^EXPO_PUBLIC_SUPABASE_ANON_KEY=" .env 2>/dev/null; then
  echo "O arquivo .env do app precisa ter EXPO_PUBLIC_SUPABASE_URL e EXPO_PUBLIC_SUPABASE_ANON_KEY."
  echo "Sem isso a versao web abre sem dados."
  exit 1
fi
echo "OK."

echo ""
echo "=== 2/4 Gerando a versao web (leva 1 a 3 minutos) ==="
mkdir -p "$DESTINO"
bash scripts/build-web.sh

echo ""
echo "=== 3/4 Conferindo a pasta de publicacao ==="
if [ ! -f "$DESTINO/vercel.json" ]; then
  echo '{"rewrites":[{"source":"/(.*)","destination":"/index.html"}]}' > "$DESTINO/vercel.json"
  echo "Criei vercel.json (abre as telas por link direto)."
fi
if [ ! -d "$DESTINO/.vercel" ]; then
  echo ""
  echo "ATENCAO: esta pasta ainda nao esta ligada a um projeto da Vercel."
  echo "Quando a Vercel perguntar, responda: criar projeto NOVO, nome: dicas-app-web."
  echo "NAO escolha o projeto do site nem o do portal parceiro."
  read -p "Continuar? (s/N) " r
  if [ "$r" != "s" ] && [ "$r" != "S" ]; then echo "Cancelado."; exit 0; fi
fi

echo ""
echo "=== 4/4 Publicando na Vercel ==="
cd "$DESTINO"
npx vercel --prod

echo ""
echo "Pronto. Mande ao time o endereco 'Production' que apareceu acima."
echo "Dica: na primeira abertura use uma janela anonima, para nao pegar versao antiga."
