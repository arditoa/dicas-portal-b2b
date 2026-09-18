# Site institucional — Dicas LGBT+

Landing page de marketing (Rodada 42), projeto Next.js separado do app
mobile e do portal-b2b-lgbt — deploy próprio na Vercel.

## Setup

```bash
npm install
cp .env.example .env.local   # preencher com o MESMO projeto Supabase do app/portal
npm run dev
```

## O que esta página faz

- `/` — landing page: explica o produto, e tem duas trilhas de conversão:
  usuário final (formulário "quero ser avisado", grava em
  `leads_institucionais` com `origem='contato_geral'`) e local/evento/
  institucional (botões que levam direto pro cadastro público real do
  portal já publicado: `/cadastro/local`, `/cadastro/evento`,
  `/cadastro/institucional`).
- `/excluir-conta` — página pública de exclusão de conta, exigida pelo
  Google Play (Data Safety) além do fluxo dentro do app. Preencher
  `NEXT_PUBLIC_SUPORTE_EMAIL`/`NEXT_PUBLIC_SUPORTE_WHATSAPP` no `.env`
  antes de publicar — sem isso a página avisa visivelmente que o contato
  não foi configurado, em vez de mostrar um botão quebrado.

## Deploy

Mesmo fluxo do portal: `npx vercel --prod` rodado pela própria Andrea (ou
conectar o repositório direto na Vercel). É um projeto Vercel NOVO,
separado do `portal-b2b-lgbt` — não sobrescreve nada existente.
