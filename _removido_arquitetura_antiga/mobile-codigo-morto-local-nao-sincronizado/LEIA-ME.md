# Por que estes arquivos foram quarentenados aqui (15/09, direto no seu Mac)

Sua pasta local nunca tinha removido os arquivos que, rodada após rodada,
o Claude já tinha identificado como código morto (telas/serviços/contextos
sem nenhuma tela real apontando pra eles, superados por versões novas) —
porque cada zip entregue só ADICIONAVA/TROCAVA arquivos, nunca apagava os
antigos. Isso é uma causa real da sensação de "confusão" no projeto.

Nada foi apagado — só movido pra aqui, na mesma pasta onde o Claude já
guarda esse histórico do lado dele. Inclui, entre outros:

- **`page.tsx`** — o arquivo que estava quebrando a compilação do app
  inteiro (import do Next.js dentro do projeto Expo). Esse era o bug
  crítico da Rodada 19.
- Telas antigas de cadastro/gestão de parceiro DENTRO do app (hoje isso é
  feito pelo Portal B2B ou por WhatsApp): `business/register.tsx`,
  `business/dashboard.tsx`, `business/door.tsx`, etc.
- Boilerplate padrão do Expo (nunca apagado desde a criação do projeto):
  `app-tabs.tsx`, `themed-text.tsx`, `themed-view.tsx`, etc.
- Componentes de UI substituídos por reescritas mais novas (Rodada 13):
  `FilterSheet.tsx`, `MapLegend.tsx`, `CategoryChips.tsx`, etc.
- Autenticação falsa antiga (Rodada 12 já tinha trocado pela real):
  `AuthContext.tsx`, telas `auth/login.tsx`/`auth/register.tsx`.
- Serviços/contextos do sistema antigo de check-in e pontos (Rodada 9-10):
  `businessService.ts`, `doorService.ts`, `couponService.ts`,
  `vipListService.ts`, `CouponsContext.tsx`, `AppContext.tsx`, etc.

Se algum dia fizer sentido reaproveitar algo daqui, está tudo intacto.
