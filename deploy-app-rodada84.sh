#!/bin/bash
# Rodada 84 — Home volta ao modelo anterior + carrossel de anuncios (Copa, Embratur, Camara LGBT). Guarda no GitHub o codigo do APP e do PORTAL (inclui o push):
#   - app: src/, app.json, app.config.js, package.json e package-lock.json
#   - portal: portal-b2b-lgbt/src (aba "Avisos", Roteiros etc.)
#   - supabase-migration/ (migrations 031 a 044 que ainda nao estavam no git)
#   - scripts de deploy e scripts/
# NAO envia: dist/, backups (.tgz), pastas .tmp-claude*, o arquivo
# .tsconfig.check.json, as copias "icone ... (2).png", .env* nem a migration 042.
#
# O portal (Vercel) sobe sozinho com o push. O app so vira build depois,
# pelo EAS.
set -e
cd ~/Projetos/meu-app-isolado

# 1) arquivos temporarios nunca entram no git
for linha in ".tmp-claude/" ".tmp-claude-*.tgz" ".backup-*.tgz" ".tsconfig.check.json"; do
  grep -qxF "$linha" .gitignore || echo "$linha" >> .gitignore
done

echo "=== Adicionando app, portal e migrations ==="
git add .gitignore app.json app.config.js package.json package-lock.json \
        src portal-b2b-lgbt/src supabase-migration scripts \
        deploy-*.sh
# copias duplicadas do icone (nao usadas no codigo)
git reset -q -- "src/assets/images/"*"cone-dicasapp-semfundo (2).png" 2>/dev/null || true

echo ""
echo "=== Conferencia de seguranca ==="
if git diff --cached --name-only | grep -q -i -E "(^|/)\.env|\.csv$|042_pipeline_dados_iniciais|\.tgz$|\.tmp-claude|^dist/|service_role|google-services\.json"; then
  echo "ERRO: entrou no commit um arquivo que nao deveria (env, csv, 042, backup, dist ou chave). Cancelando."
  git diff --cached --name-only | grep -i -E "(^|/)\.env|\.csv$|042_pipeline_dados_iniciais|\.tgz$|\.tmp-claude|^dist/|service_role|google-services\.json"
  git reset -q
  exit 1
fi
echo "OK: nenhum arquivo sensivel no commit."

echo ""
echo "=== Resumo ==="
git diff --cached --shortstat
echo "Arquivos novos:  $(git diff --cached --name-status | grep -c '^A')"
echo "Arquivos alterados: $(git diff --cached --name-status | grep -c '^M')"
echo ""
git diff --cached --name-status | grep '^A' | head -40
echo ""
read -p "Enviar agora? (s/N) " resp
if [ "$resp" != "s" ] && [ "$resp" != "S" ]; then
  git reset -q
  echo "Cancelado. Nada foi enviado."
  exit 0
fi

git commit -m "App: Home volta ao modelo anterior (cartao do fundador com foto, caixas 2x2 com contador, Membros Fundadores e Recomendados) e carrossel de anuncios no lugar do aviso da Copa (Copa 2027, Embratur, Camara LGBT); Em Alta nas paginas de experiencia"
git push

echo ""
echo "Pronto. Codigo guardado no GitHub. Para ver no celular: bash ~/Projetos/meu-app-isolado/abrir-no-expo-go.sh  |  Para a versao web: bash ~/Projetos/meu-app-isolado/subir-app-web.sh"
