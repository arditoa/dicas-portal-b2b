#!/bin/bash
# Rodada 73 — ajustes para publicar o app nas lojas:
#   - site: pagina /redefinir-senha (link do e-mail "Esqueci minha senha")
#   - site: texto da pagina /excluir-conta alinhado com o app
#   - app: "Esqueci minha senha", erros de login em portugues,
#          chave do Google Maps do Android via variavel de ambiente
# So faz git add/commit/push. O site sobe pela Vercel; o app so muda no
# proximo build do EAS.
set -e
cd ~/Projetos/meu-app-isolado

# So os arquivos do SITE (o app tem varias alteracoes pendentes de rodadas
# anteriores e vai junto no proximo commit/build do app).
git add landing-dicaslgbt/src/app/redefinir-senha \
        landing-dicaslgbt/src/app/excluir-conta/page.tsx \
        landing-dicaslgbt/src/app/privacidade/page.tsx \
        supabase-migration/044_push_notificacoes.sql \
        supabase-functions

echo "=== O que vai ser enviado ==="
git diff --cached --stat
echo ""
read -p "Enviar agora? (s/N) " resp
if [ "$resp" != "s" ] && [ "$resp" != "S" ]; then
  git reset -q
  echo "Cancelado. Nada foi enviado."
  exit 0
fi
git commit -m "Site: /redefinir-senha, texto da exclusao de conta e da politica de privacidade (push); migration 044 e funcao enviar-push"
git push
echo ""
echo "Pronto. Confira na Vercel (landing-dicaslgbt) e depois abra:"
echo "  https://www.dicaslgbt.com.br/redefinir-senha   (deve mostrar 'Link invalido ou expirado' sem o link do e-mail)"
