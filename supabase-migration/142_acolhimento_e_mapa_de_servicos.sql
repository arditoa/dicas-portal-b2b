-- 142 — Acolhimento e acessibilidade das casas + Mapa de serviços LGBT+ (16/11/2026). Rode depois da 141.
-- Seguro rodar mais de uma vez.
--
-- 1) ACOLHIMENTO: a casa marca o que oferece (banheiro sem gênero, acessível para cadeira de rodas, respeita nome social
--    e pronomes, equipe preparada para pessoas trans, atendimento em Libras, ambiente tranquilo). Aparece na página da
--    casa ("informado pela casa") e vira filtro nas categorias.
-- 2) MAPA DE SERVIÇOS: centros de referência LGBT+, testagem/PrEP, Defensoria, delegacias, casas de acolhimento,
--    ONGs, apoio jurídico e emocional, por cidade. A equipe Dicas cadastra e confere; todo mundo vê (sem conta).
--    Já entram os canais nacionais (Disque 100 e CVV 188). Os locais de cada cidade a equipe cadastra no Modo equipe.

-- 1) Acolhimento ------------------------------------------------------------------------------------------
alter table public.locais add column if not exists acolhimento text[] not null default '{}';
do $$ begin
  alter table public.locais add constraint locais_acolhimento_valido check (acolhimento <@ array['banheiro_sem_genero', 'acessivel', 'nome_social', 'pessoas_trans', 'libras', 'tranquilo']::text[]);
exception when duplicate_object then null; end $$;
comment on column public.locais.acolhimento is 'Informado pela casa: banheiro_sem_genero, acessivel, nome_social, pessoas_trans, libras, tranquilo (142).';

-- 2) Serviços ---------------------------------------------------------------------------------------------
create table if not exists public.servicos_lgbt (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('centro_referencia', 'saude', 'prep', 'defensoria', 'delegacia', 'acolhimento', 'ong', 'juridico', 'apoio_emocional', 'denuncia')),
  nome text not null check (char_length(nome) between 2 and 120),
  descricao text check (descricao is null or char_length(descricao) <= 400),
  cidade text,           -- vazio = nacional (vale para todo o Brasil)
  uf text check (uf is null or uf ~ '^[A-Z]{2}$'),
  endereco text check (endereco is null or char_length(endereco) <= 200),
  telefone text check (telefone is null or char_length(telefone) <= 30),
  whatsapp text check (whatsapp is null or char_length(whatsapp) <= 30),
  site text check (site is null or char_length(site) <= 300),
  horario text check (horario is null or char_length(horario) <= 120),
  gratuito boolean not null default true,
  lat double precision, lng double precision,
  ativo boolean not null default true,
  conferido_em date,     -- quando a equipe conferiu os dados
  created_at timestamptz not null default now()
);
create index if not exists servicos_lgbt_cidade_idx on public.servicos_lgbt(cidade, tipo) where ativo;
alter table public.servicos_lgbt enable row level security;
drop policy if exists servicos_lgbt_le on public.servicos_lgbt;
create policy servicos_lgbt_le on public.servicos_lgbt for select using (ativo or public.is_admin());
drop policy if exists servicos_lgbt_admin on public.servicos_lgbt;
create policy servicos_lgbt_admin on public.servicos_lgbt for all using (public.is_admin()) with check (public.is_admin());

-- Canais nacionais (conferidos em 16/11/2026)
insert into public.servicos_lgbt (tipo, nome, descricao, telefone, whatsapp, site, horario, conferido_em)
select 'denuncia', 'Disque 100 — Direitos Humanos', 'Denúncia de LGBTfobia e outras violações. Gratuito, anônimo, com protocolo para acompanhar.',
       '100', '5561996110100', 'https://www.gov.br/mdh/pt-br/ondh', '24 horas, todos os dias', date '2026-11-16'
 where not exists (select 1 from public.servicos_lgbt where nome like 'Disque 100%');
insert into public.servicos_lgbt (tipo, nome, descricao, telefone, site, horario, conferido_em)
select 'apoio_emocional', 'CVV — Centro de Valorização da Vida', 'Apoio emocional gratuito e sigiloso, por telefone ou chat.',
       '188', 'https://cvv.org.br', '24 horas, todos os dias', date '2026-11-16'
 where not exists (select 1 from public.servicos_lgbt where nome like 'CVV%');

-- Serviços de uma cidade + os nacionais
create or replace function public.servicos_da_cidade(p_cidade text default null)
returns setof public.servicos_lgbt language sql stable security definer set search_path = public as $$
  select * from public.servicos_lgbt
   where ativo and (cidade is null or (p_cidade is not null and lower(cidade) = lower(p_cidade)))
   order by (cidade is null), tipo, nome;
$$;
grant execute on function public.servicos_da_cidade(text) to anon, authenticated;

create or replace function public.cidades_com_servicos()
returns table (cidade text, uf text, n bigint) language sql stable security definer set search_path = public as $$
  select cidade, max(uf), count(*) from public.servicos_lgbt where ativo and cidade is not null group by cidade order by cidade;
$$;
grant execute on function public.cidades_com_servicos() to anon, authenticated;
