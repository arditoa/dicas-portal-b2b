#!/bin/bash
# Abre o app no Expo Go para voce ver e testar no celular.
#
# Uso (Terminal do Mac):
#   bash ~/Projetos/meu-app-isolado/abrir-no-expo-go.sh            # mesma rede Wi-Fi
#   bash ~/Projetos/meu-app-isolado/abrir-no-expo-go.sh tunel      # se o QR nao conectar
#
# Depois que aparecer o QR code no Terminal:
#   - iPhone: abra a Camera e aponte para o QR (abre no Expo Go)
#   - Android: abra o app Expo Go e toque em "Scan QR code"
# O celular e o Mac precisam estar na MESMA rede Wi-Fi (ou use o modo "tunel").
# Para parar: Ctrl + C.
#
# O que NAO funciona no Expo Go (precisa de build de teste pelo EAS):
#   - notificacoes push (o resto da tela Notificacoes abre normalmente)
#   - chave propria do Google Maps no Android
set -e
cd ~/Projetos/meu-app-isolado

if ! command -v node >/dev/null 2>&1; then
  echo "ERRO: Node.js nao encontrado. Instale em https://nodejs.org e rode de novo."
  exit 1
fi

# instala as dependencias so se ainda nao estiverem instaladas
if [ ! -d node_modules ] || [ ! -d node_modules/expo-notifications ]; then
  echo "=== Instalando dependencias (so na primeira vez) ==="
  npm install
fi

# conferencia rapida das variaveis do Supabase (nao mostra os valores)
if ! grep -q "^EXPO_PUBLIC_SUPABASE_URL=." .env 2>/dev/null || ! grep -q "^EXPO_PUBLIC_SUPABASE_ANON_KEY=." .env 2>/dev/null; then
  echo "AVISO: o arquivo .env nao tem EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY."
  echo "       O app abriria sem dados. Corrija o .env antes de continuar."
  exit 1
fi

echo ""
echo "=== Iniciando o Expo (cache limpo) ==="
if [ "$1" = "tunel" ] || [ "$1" = "tunnel" ]; then
  npx expo start --clear --tunnel
else
  npx expo start --clear
fi
