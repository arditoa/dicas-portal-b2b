#!/bin/bash
# DEPLOY COMPLETO - Dicas LGBT+ (portal + app + banco + build da Apple)
#
# Uso (Terminal do Mac):
#   cd ~/Projetos/meu-app-isolado
#   ./deploy-completo-apple.sh
#
# O que faz, em ordem (pergunta antes de cada passo importante):
#   1/5 Confere o portal (TypeScript) - se tiver erro, para e nada e enviado
#   2/5 Pergunta se as migrations 058 a 078 ja foram rodadas no Supabase
#   3/5 Separa os arquivos (app + portal + migrations) e protege contra arquivo indevido
#   4/5 Commit + push para o GitHub (a Vercel publica o portal sozinha)
#   5/5 Build iOS de producao (EAS) e envio para a App Store Connect
cd "$(dirname "$0")" || exit 1

MSG_COMMIT="Cupom com dias da semana e horario (ex.: Ter a Qui ate 21h), check-in bloqueado fora da janela; rodizio 12 vagas e 10/30 min; Em Alta com todas as categorias; nomes sem caixa alta no cadastro

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01RJ3r6vr1pLNorHoYNCwK1d"

echo "=== 1/5 Conferindo o portal (TypeScript) ==="
if ! (cd portal-b2b-lgbt && npx tsc --noEmit); then
  echo ""
  echo "O portal tem erro de codigo. Corrija antes de subir (nada foi enviado)."
  exit 1
fi
echo "OK: sem erros."

echo ""
echo "=== 2/5 Banco de dados (Supabase) ==="
echo "Rode no SQL Editor do Supabase, uma por vez e em ordem, as migrations pendentes 058 a 078"
echo "(069 e 070 sozinhas). As novas desta rodada: 077 (rodizio 12 vagas / 10 min) e 078 (cupom com dias e horario)."
read -p "Ja rodou todas as migrations pendentes? (s/n) " ok
if [ "$ok" != "s" ]; then
  echo "Sem problema: rode as migrations e execute este script de novo. Nada foi enviado."
  exit 0
fi

echo ""
echo "=== 3/5 Separando os arquivos ==="
# -u = so arquivos ja versionados que mudaram (nao leva imagens soltas); depois os arquivos novos desta rodada.
git add -u src portal-b2b-lgbt/src
git add src/lib/janelaCupom.ts portal-b2b-lgbt/src/lib/janelaCupom.ts \
  supabase-migration/05[89]*.sql supabase-migration/06*.sql supabase-migration/07[0-8]*.sql \
  deploy-completo-apple.sh deploy-portal-parceiro.sh deploy-subcategorias.sh
if git diff --cached --name-only | grep -q -i -E "(^|/)\.env|\.csv$|042_pipeline_dados_iniciais|\.tgz$|^dist/|service_role|google-services\.json|\.bak$"; then
  echo "ERRO: entrou no commit um arquivo que nao deveria (env, csv, backup, dist ou chave). Cancelando."
  git reset -q
  exit 1
fi
git status --short | grep -E '^(A|M)'
echo ""
git diff --cached --shortstat

echo ""
read -p "=== 4/5 Subir agora para o GitHub (portal publica sozinho na Vercel)? (s/n) " r
if [ "$r" = "s" ]; then
  if git diff --cached --quiet; then
    echo "Nada novo para commitar (tudo ja foi enviado antes). Seguindo para o build."
  else
    git commit -m "$MSG_COMMIT" || { echo "Falha no commit."; exit 1; }
  fi
  git push || { echo "Falha no push. Corrija e rode de novo."; exit 1; }
  echo ""
  echo "Enviado! A Vercel publica o portal em 1 a 2 minutos."
  echo "Teste em Meus Cupons: criar cupom com dias da semana e 'Ate as' 21:00."
else
  git reset -q
  echo "Cancelado. Nada foi enviado."
  exit 0
fi

echo ""
echo "=== 5/5 Build iOS (Apple) ==="
if grep -q "MODO_DEMONSTRACAO = true" src/lib/demo.ts; then
  echo "ATENCAO: src/lib/demo.ts esta com MODO_DEMONSTRACAO = true (mostra vagas vazias de demonstracao)."
  echo "Para a loja precisa ser false."
  read -p "Trocar para false agora, so neste computador, para o build? (s/n) " d
  if [ "$d" = "s" ]; then
    sed -i.bak 's/MODO_DEMONSTRACAO = true/MODO_DEMONSTRACAO = false/' src/lib/demo.ts && rm -f src/lib/demo.ts.bak
    echo "Trocado para false."
  else
    echo "Build cancelado. Troque manualmente para false e rode o build: eas build --platform ios --profile production"
    exit 0
  fi
fi

EAS="eas"
command -v eas >/dev/null 2>&1 || EAS="npx --yes eas-cli"

read -p "Gerar o build iOS de producao agora? Pode pedir login da Apple/Expo no Terminal. (s/n) " b
if [ "$b" != "s" ]; then
  echo "Ok. Quando quiser: $EAS build --platform ios --profile production"
  exit 0
fi
$EAS build --platform ios --profile production || { echo "O build falhou. Veja a mensagem acima."; exit 1; }

echo ""
read -p "Enviar o build para a App Store Connect (TestFlight) agora? (s/n) " e
if [ "$e" = "s" ]; then
  $EAS submit --platform ios --latest
else
  echo "Ok. Quando quiser: $EAS submit --platform ios --latest"
fi
echo ""
echo "Pronto. Depois, no App Store Connect: conferir o build no TestFlight e enviar para revisao."
