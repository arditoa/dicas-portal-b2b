-- Clientes B2C no Pipeline da equipe (aba "Clientes B2C", /equipe).
--
-- Guarda a base de clientes do bar (nome, celular, data de nascimento) para
-- a equipe apresentar o app por WhatsApp e acompanhar quem já foi avisado.
-- NÃO guarda CPF, endereço nem e-mail. O campo "sexo" é o que já está no
-- cadastro do bar (F/M), só para filtrar; não é identidade de gênero.
--
-- Acesso: igual ao restante do Pipeline — só quem está em pipeline_equipe
-- (ver 041). Seguro rodar mais de uma vez.
--
-- Depois de rodar este arquivo, importe o CSV pelo Table Editor:
-- Table Editor > pipeline_clientes > Insert > Import data from CSV.

begin;

-- ─────────────────────────────────────────────────────────────────────
-- 1) Tabela de clientes
-- ─────────────────────────────────────────────────────────────────────
create table if not exists public.pipeline_clientes (
  id bigint generated always as identity primary key,
  nome text not null check (char_length(nome) between 1 and 120),
  telefone text check (telefone is null or telefone ~ '^[0-9]{10,15}$'),
  nascimento date,
  sexo text check (sexo is null or sexo in ('F', 'M')), -- como está no cadastro do bar
  nasc_mes smallint generated always as (extract(month from nascimento)::smallint) stored,
  nasc_dia smallint generated always as (extract(day from nascimento)::smallint) stored,
  status text not null default 'novo'
    check (status in ('novo', 'enviado', 'respondeu', 'nao_quer')),
  enviado_em timestamptz,
  enviado_por uuid references auth.users(id) on delete set null,
  criado_em timestamptz not null default now()
);

-- um mesmo celular não entra duas vezes (evita mandar a mesma mensagem 2x)
create unique index if not exists pipeline_clientes_telefone_uq
  on public.pipeline_clientes (telefone) where telefone is not null;
create index if not exists pipeline_clientes_status_idx on public.pipeline_clientes (status);
create index if not exists pipeline_clientes_aniv_idx on public.pipeline_clientes (nasc_mes, nasc_dia);
create index if not exists pipeline_clientes_nome_idx on public.pipeline_clientes (lower(nome));

-- ─────────────────────────────────────────────────────────────────────
-- 2) Regras de acesso (só a equipe do Pipeline)
-- ─────────────────────────────────────────────────────────────────────
alter table public.pipeline_clientes enable row level security;

drop policy if exists "pipeline_clientes_select" on public.pipeline_clientes;
create policy "pipeline_clientes_select" on public.pipeline_clientes
  for select to authenticated using (public.is_pipeline_equipe());

drop policy if exists "pipeline_clientes_insert" on public.pipeline_clientes;
create policy "pipeline_clientes_insert" on public.pipeline_clientes
  for insert to authenticated with check (public.is_pipeline_equipe());

drop policy if exists "pipeline_clientes_update" on public.pipeline_clientes;
create policy "pipeline_clientes_update" on public.pipeline_clientes
  for update to authenticated
  using (public.is_pipeline_equipe()) with check (public.is_pipeline_equipe());

drop policy if exists "pipeline_clientes_delete" on public.pipeline_clientes;
create policy "pipeline_clientes_delete" on public.pipeline_clientes
  for delete to authenticated using (public.is_pipeline_equipe());

revoke all on public.pipeline_clientes from anon, authenticated;
grant select, insert, update, delete on public.pipeline_clientes to authenticated;

-- ─────────────────────────────────────────────────────────────────────
-- 3) Modelos de mensagem (guardados junto com os documentos do Pipeline)
-- ─────────────────────────────────────────────────────────────────────
alter table public.pipeline_docs drop constraint if exists pipeline_docs_colecao_check;
alter table public.pipeline_docs
  add constraint pipeline_docs_colecao_check
  check (colecao in ('fases', 'cadencias', 'leads', 'b2c_modelos'));

insert into public.pipeline_docs (colecao, id, data) values
  ('b2c_modelos', 'apresentar_app', $j${"nome":"Apresentar o app","ordem":1,"texto":"Oi, {nome}! Aqui é {meu_nome}, do Vezpa Bar. Estamos lançando o Dicas LGBT+, um app com bares, festas e experiências LGBTQIA+ de São Paulo, previsto para 3 de dezembro. Dá para conhecer em www.dicaslgbt.com.br e entrar na lista antecipada. Se não quiser receber mais mensagens, é só responder SAIR."}$j$),
  ('b2c_modelos', 'aniversario', $j${"nome":"Aniversário + app","ordem":2,"texto":"Feliz aniversário, {nome}! Toda a equipe do Vezpa Bar te deseja um dia incrível. Aproveite para conhecer o Dicas LGBT+, o nosso app de lugares e festas LGBTQIA+: www.dicaslgbt.com.br. Se não quiser receber mais mensagens, é só responder SAIR."}$j$),
  ('b2c_modelos', 'lembrete', $j${"nome":"Lembrete (2ª mensagem)","ordem":3,"texto":"Oi, {nome}, {meu_nome} de novo, do Vezpa Bar. Passando para lembrar do Dicas LGBT+, o app que estreia em 3 de dezembro. Se quiser saber mais: www.dicaslgbt.com.br. Para não receber mais mensagens, responda SAIR."}$j$)
on conflict (colecao, id) do nothing;

commit;
