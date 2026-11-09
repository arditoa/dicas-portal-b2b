#!/bin/bash
# Rodada 94 — publica TUDO que está pendente (rodadas 91 a 94):
#  app: Home no estilo Trip, fundadores com título, serviços fora do Em Alta, chips por categoria,
#       Conta com cores, Dicas úteis em cores do Brasil, carrossel de banners (Home e Trip);
#  portal: aba "Banners e parceiros" + regras iguais ao app.
# ANTES: rode no SQL Editor do Supabase (nesta ordem, se ainda não rodou): 047, 048, 049, 050_banners_app.sql, 051_banner_museu.sql e 052_pacotes_agencias.sql
cd "$(dirname "$0")" || exit 1
git add supabase-migration/050_banners_app.sql supabase-migration/051_banner_museu.sql supabase-migration/052_pacotes_agencias.sql \
  src/app/pacotes.tsx src/app/roteiros.tsx \
  portal-b2b-lgbt/src/app/dashboard/page.tsx portal-b2b-lgbt/src/app/dashboard/pacotes/page.tsx \
  src/lib/apoiadores.ts "src/app/apoiador/[slug].tsx" \
  src/lib/banners.ts src/components/CarrosselAnuncios.tsx src/components/ListaPadrao.tsx src/components/FundoCaixaDegrade.tsx \
  src/lib/destaque.ts src/lib/i18n.tsx \
  "src/app/(tabs)/index.tsx" "src/app/(tabs)/tourism.tsx" "src/app/(tabs)/profile.tsx" "src/app/secao/[tipo].tsx" \
  portal-b2b-lgbt/src/lib/destaque.ts portal-b2b-lgbt/src/components/PainelBanners.tsx portal-b2b-lgbt/src/app/admin/page.tsx
git status --short | grep -E '^(A|M)'
read -p "Subir? (s/n) " r
if [ "$r" = "s" ]; then
  git commit -m "App: Home no estilo Trip, servicos fora do Em Alta, chips por categoria, carrossel de banners (Home e Trip), pagina do Museu da Diversidade (apoio cultural); portal: aba Banners e parceiros; tela Pacotes separada de Agencias, degrade em Experiencias; portal: liberacao 'pode subir pacotes'; migrations 050, 051 e 052

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01RJ3r6vr1pLNorHoYNCwK1d" && git push
fi
