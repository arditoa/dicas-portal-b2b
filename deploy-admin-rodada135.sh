#!/bin/bash
# Rodada 135 — /admin reorganizado (fichas, fotos com destino, festas da marca com flier, etiquetas iguais às do app,
# menu em 5 grupos), "Relação com a comunidade LGBT+" no portal e card de festa com o flier sem cobrir o texto.
# Uso: bash ~/Projetos/meu-app-isolado/deploy-admin-rodada135.sh
cd "$(dirname "$0")" || exit 1

echo "=== 1/3 Conferindo o portal (TypeScript) ==="
(cd portal-b2b-lgbt && npx tsc --noEmit) || { echo "Erro de codigo. Nada foi enviado."; exit 1; }
echo "OK."

echo ""
echo "=== 2/3 Banco ==="
echo "Rode no SQL Editor do Supabase, cada uma inteira e uma vez, nesta ordem: 092, 093, 095 (ja rodadas), 094 e 096"
echo "(faz copia de seguranca antes; a conferencia no fim deve dar tudo zero)."
read -p "A 097 ja esta no Supabase (conferido). Enviar? (s/n) " ok
[ "$ok" = "s" ] || { echo "Rode a 097 no SQL Editor do Supabase e execute este script de novo. Nada foi enviado."; exit 0; }

echo ""
echo "=== 3/3 Enviando ==="
git add portal-b2b-lgbt/src/app/admin/page.tsx portal-b2b-lgbt/src/app/dashboard/perfil/page.tsx \
  portal-b2b-lgbt/src/app/api/aprovar-evento/route.ts portal-b2b-lgbt/src/components/PainelVitrine.tsx "src/app/(tabs)/events.tsx" src/components/SubcategoriaBanners.tsx "src/app/business/[id].tsx" portal-b2b-lgbt/src/components/EditorTopoInstitucional.tsx portal-b2b-lgbt/src/components/PainelCategorias.tsx portal-b2b-lgbt/src/components/PainelDestinos.tsx portal-b2b-lgbt/src/components/PainelRoteiros.tsx portal-b2b-lgbt/src/components/PainelPontosProximos.tsx portal-b2b-lgbt/src/components/PainelValidacaoHospedagem.tsx portal-b2b-lgbt/src/components/PosicaoLocal.tsx portal-b2b-lgbt/src/components/PainelRodizio.tsx portal-b2b-lgbt/src/components/EditorCaixasHome.tsx portal-b2b-lgbt/src/components/PainelCaixasHome.tsx "src/app/secao/[tipo].tsx" supabase-migration/097_caixas_da_home.sql \
  portal-b2b-lgbt/src/app/dashboard/destaques/page.tsx portal-b2b-lgbt/src/lib/taxonomia.ts src/lib/taxonomia.ts \
  portal-b2b-lgbt/src/components/BannerDestaqueAdmin.tsx "src/app/category/[id].tsx" src/components/ListaPadrao.tsx src/lib/destaque.ts portal-b2b-lgbt/src/lib/destaque.ts \
  portal-b2b-lgbt/src/components/DestaqueFestaPlano.tsx portal-b2b-lgbt/src/app/dashboard/eventos/page.tsx supabase-migration/093_festa_do_plano.sql supabase-migration/094_banners_parceiros_em_categorias.sql \
  portal-b2b-lgbt/src/components/PainelBanners.tsx src/lib/banners.ts \
  src/lib/estiloBanner.ts portal-b2b-lgbt/src/lib/estiloBanner.ts portal-b2b-lgbt/src/components/EditorEstiloBanner.tsx src/lib/vitrine.ts supabase-migration/095_estilo_do_banner.sql supabase-migration/096_banner_home_separado.sql \
  portal-b2b-lgbt/src/components/VariantesBanner.tsx portal-b2b-lgbt/src/components/EditorBannerCompleto.tsx portal-b2b-lgbt/src/components/PainelMapaApp.tsx \
  "src/app/(tabs)/profile.tsx" src/components/PerfilFotoStatus.tsx src/components/CadastroExtras.tsx src/app/onboarding.tsx src/components/CarrosselAnuncios.tsx \
  src/components/CarrosselAnuncios.tsx src/components/VitrineCategoria.tsx "src/app/(tabs)/index.tsx" "src/app/evento/[id].tsx" \
  supabase-migration/092_limpeza_controles_antigos.sql
git diff --cached --shortstat
read -p "Subir agora? (s/n) " r
if [ "$r" = "s" ]; then
  git commit -m "Admin reorganizado: fichas com fotos e destino, festas da marca com flier, etiquetas iguais ao app, menu em 5 grupos e limpeza dos controles antigos; card de festa sem texto sobre o flier

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01XXn2U9kUmg5UdfLj4as6mF" && git push && {
    echo ""
    echo "Enviado! A Vercel publica o portal em 1 a 2 minutos."
    echo "O card de festa do app entra no proximo build da Apple; para ver ja na versao web: bash subir-app-web.sh"
  }
else
  git reset -q; echo "Cancelado."
fi
