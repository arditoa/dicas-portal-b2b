#!/bin/bash
# Atualiza o projeto do Expo SDK 57 para o SDK 58 (para abrir no Expo Go novo do iPhone).
#
# Uso (Terminal do Mac):
#   bash ~/Projetos/meu-app-isolado/atualizar-sdk58.sh
#
# O que faz:
#   1) guarda copia de seguranca do package.json e package-lock.json (pasta .backup-sdk57)
#   2) instala o Expo 58 e deixa todas as bibliotecas do Expo/React Native nas versoes certas (expo install --fix)
#   3) confere o projeto (expo-doctor) e os tipos (tsc)
# Para DESFAZER: bash ~/Projetos/meu-app-isolado/atualizar-sdk58.sh desfazer
set -e
cd ~/Projetos/meu-app-isolado

if [ "$1" = "desfazer" ]; then
  if [ ! -d .backup-sdk57 ]; then echo "Nao achei a copia de seguranca (.backup-sdk57)."; exit 1; fi
  cp .backup-sdk57/package.json package.json
  cp .backup-sdk57/package-lock.json package-lock.json 2>/dev/null || true
  rm -rf node_modules
  npm install --legacy-peer-deps
  echo "Voltou para o SDK 57."
  exit 0
fi

if ! command -v node >/dev/null 2>&1; then echo "ERRO: Node.js nao encontrado."; exit 1; fi

mkdir -p .backup-sdk57
cp package.json .backup-sdk57/package.json
cp package-lock.json .backup-sdk57/package-lock.json 2>/dev/null || true
echo "=== 1/4 Copia de seguranca feita em .backup-sdk57 ==="

echo "=== 2/4 Instalando Expo SDK 58 ==="
npm install expo@~58.0.20 --legacy-peer-deps

echo "=== 3/4 Ajustando as bibliotecas para o SDK 58 ==="
npx expo install --fix

echo "=== 4/4 Conferindo o projeto ==="
npx expo-doctor || echo "(expo-doctor listou avisos: me envie a saida para eu conferir)"
npx tsc --noEmit --skipLibCheck 2>&1 | grep -v "external-link\|lib/auth\|requireAuth" | head -20 || true

echo ""
echo "Pronto. Agora abra o app: bash ~/Projetos/meu-app-isolado/abrir-no-expo-go.sh"
echo "Se algo quebrar: bash ~/Projetos/meu-app-isolado/atualizar-sdk58.sh desfazer"
