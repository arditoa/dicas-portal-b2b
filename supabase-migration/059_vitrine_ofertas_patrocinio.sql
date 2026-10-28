-- 059 — Vitrine de vendas: ofertas com limite mensal por plano, banner fixo (patrocínio) por categoria,
-- comunicação dos Membros Fundadores (escrita pela equipe) e medição "você está em destaque".
-- Rode no SQL Editor do Supabase. Seguro para rodar mais de uma vez (não usa ADD VALUE de enum).
begin;

-- 1) Limite de ofertas por mês, por plano (editável no /admin). limite_mes NULL = sem limite.
create table if not exists public.planos_limite_ofertas (
  plano text primary key check (plano in ('freemium','starter','intermediario','premium','fundador')),
  limite_mes integer check (limite_mes is null or limite_mes >= 0),
  nota text,
  atualizado_em timestamptz not null default now()
);
insert into public.planos_limite_ofertas (plano, limite_mes, nota) values
  ('freemium', 0, 'Sem ofertas no plano gratuito'),
  ('starter', 0, 'Sem ofertas no Starter'),
  ('intermediario', 5, 'Até 5 promoções por mês'),
  ('premium', null, 'Sem limite mensal (ofertas renovadas semanalmente)'),
  ('fundador', null, 'Sem limite; a equipe de comunicação também publica')
on conflict (plano) do nothing;

alter table public.planos_limite_ofertas enable row level security;
drop policy if exists "limite_ofertas_select" on public.planos_limite_ofertas;
create policy "limite_ofertas_select" on public.planos_limite_ofertas for select to anon, authenticated using (true);
drop policy if exists "limite_ofertas_admin" on public.planos_limite_ofertas;
create policy "limite_ofertas_admin" on public.planos_limite_ofertas for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- 2) Ofertas = cupons existentes (mesmo resgate, mesma tela do portal), com foto e marca da equipe.
alter table public.cupons add column if not exists imagem_url text;
alter table public.cupons add column if not exists criado_pela_equipe boolean not null default false;

-- Quantas ofertas o local já criou neste mês e qual o limite do plano dele.
create or replace function public.uso_ofertas_mes(p_local_id uuid)
returns table (plano text, limite integer, usadas integer)
language plpgsql security definer stable set search_path = public as $$
declare
  v_plano text;
  v_status text;
begin
  if not (public.is_admin() or exists (select 1 from public.locais l where l.id = p_local_id and l.owner_id = auth.uid())) then
    raise exception 'Sem permissão.';
  end if;
  select l.plano_comercial::text, l.plano_comercial_status::text into v_plano, v_status from public.locais l where l.id = p_local_id;
  if v_plano is null or (v_status is not null and v_status <> 'ativo') then v_plano := 'freemium'; end if;
  return query
    select v_plano,
           (select p.limite_mes from public.planos_limite_ofertas p where p.plano = v_plano),
           (select count(*)::integer from public.cupons c
              where c.local_id = p_local_id and c.created_at >= date_trunc('month', now()));
end;
$$;
grant execute on function public.uso_ofertas_mes(uuid) to authenticated;

-- Trava no banco: o parceiro não passa do limite do plano (admin e equipe não têm limite).
create or replace function public.enforce_limite_ofertas_mes()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_plano text;
  v_status text;
  v_limite integer;
  v_usadas integer;
begin
  if public.is_admin() or auth.uid() is null then
    return new;
  end if;
  select l.plano_comercial::text, l.plano_comercial_status::text into v_plano, v_status from public.locais l where l.id = new.local_id;
  if v_plano is null or (v_status is not null and v_status <> 'ativo') then v_plano := 'freemium'; end if;
  select p.limite_mes into v_limite from public.planos_limite_ofertas p where p.plano = v_plano;
  if v_limite is null then
    return new;
  end if;
  select count(*) into v_usadas from public.cupons c
    where c.local_id = new.local_id and c.created_at >= date_trunc('month', now());
  if v_usadas >= v_limite then
    raise exception 'Seu plano permite % oferta(s) por mês e você já usou %. Faça upgrade para publicar mais.', v_limite, v_usadas;
  end if;
  return new;
end;
$$;
drop trigger if exists before_insert_cupons_limite on public.cupons;
create trigger before_insert_cupons_limite before insert on public.cupons
  for each row execute function public.enforce_limite_ofertas_mes();

-- 3) Banner fixo de patrocínio por categoria (o "slot" abaixo dos destaques). Edita no /admin e no portal.
create table if not exists public.categoria_patrocinio (
  id uuid primary key default gen_random_uuid(),
  categoria text not null unique,          -- slug da categoria do app (bares, gastronomia, destaques...)
  local_id uuid references public.locais(id) on delete set null,   -- quem patrocina (pode editar pelo portal)
  tag text not null default 'PATROCINADOR DA CATEGORIA',
  titulo text not null,
  subtitulo text,
  cta text not null default 'Saiba mais',
  destino text not null default '',        -- '/rota', 'https://...' ou 'local:<id>'
  imagem_url text,
  cor1 text not null default '#7E57C2',
  cor2 text not null default '#E1306C',
  ativo boolean not null default true,
  inicio timestamptz,
  fim timestamptz,
  updated_at timestamptz not null default now()
);
alter table public.categoria_patrocinio enable row level security;

drop policy if exists "cat_patr_select" on public.categoria_patrocinio;
create policy "cat_patr_select" on public.categoria_patrocinio for select to anon, authenticated
  using (ativo and (inicio is null or inicio <= now()) and (fim is null or fim >= now()));
drop policy if exists "cat_patr_select_dono" on public.categoria_patrocinio;
create policy "cat_patr_select_dono" on public.categoria_patrocinio for select to authenticated
  using (exists (select 1 from public.locais l where l.id = local_id and l.owner_id = auth.uid()));
drop policy if exists "cat_patr_admin" on public.categoria_patrocinio;
create policy "cat_patr_admin" on public.categoria_patrocinio for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
drop policy if exists "cat_patr_update_dono" on public.categoria_patrocinio;
create policy "cat_patr_update_dono" on public.categoria_patrocinio for update to authenticated
  using (exists (select 1 from public.locais l where l.id = local_id and l.owner_id = auth.uid()))
  with check (exists (select 1 from public.locais l where l.id = local_id and l.owner_id = auth.uid()));

-- O patrocinador edita só o conteúdo (texto, botão, imagem, cores); categoria, dono, ativo e período são do admin.
create or replace function public.protect_categoria_patrocinio()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    new.categoria := old.categoria;
    new.local_id := old.local_id;
    new.ativo := old.ativo;
    new.inicio := old.inicio;
    new.fim := old.fim;
  end if;
  new.updated_at := now();
  return new;
end;
$$;
drop trigger if exists before_update_categoria_patrocinio on public.categoria_patrocinio;
create trigger before_update_categoria_patrocinio before update on public.categoria_patrocinio
  for each row execute function public.protect_categoria_patrocinio();

-- 4) Comunicação dos Membros Fundadores: a equipe escreve o que torna o negócio "vendável"; o fundador vê e ajusta.
create table if not exists public.fundador_comunicacao (
  local_id uuid primary key references public.locais(id) on delete cascade,
  headline text check (headline is null or char_length(headline) <= 90),   -- frase que gera desejo
  texto text check (texto is null or char_length(texto) <= 280),
  oferta text check (oferta is null or char_length(oferta) <= 90),         -- ex.: "Chopp em dobro até 20h"
  cta text not null default 'Conhecer',
  destino text not null default '',
  imagem_url text,
  ativo boolean not null default true,
  escrito_por text not null default 'equipe',
  updated_at timestamptz not null default now()
);
alter table public.fundador_comunicacao enable row level security;

drop policy if exists "fund_com_select" on public.fundador_comunicacao;
create policy "fund_com_select" on public.fundador_comunicacao for select to anon, authenticated
  using (ativo and exists (select 1 from public.locais l where l.id = local_id and l.status = 'aprovado'));
drop policy if exists "fund_com_select_dono" on public.fundador_comunicacao;
create policy "fund_com_select_dono" on public.fundador_comunicacao for select to authenticated
  using (exists (select 1 from public.locais l where l.id = local_id and l.owner_id = auth.uid()));
drop policy if exists "fund_com_admin" on public.fundador_comunicacao;
create policy "fund_com_admin" on public.fundador_comunicacao for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
drop policy if exists "fund_com_update_dono" on public.fundador_comunicacao;
create policy "fund_com_update_dono" on public.fundador_comunicacao for update to authenticated
  using (exists (select 1 from public.locais l where l.id = local_id and l.owner_id = auth.uid()))
  with check (exists (select 1 from public.locais l where l.id = local_id and l.owner_id = auth.uid()));

create or replace function public.touch_fundador_comunicacao()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    new.local_id := old.local_id;
    new.ativo := old.ativo;
    new.escrito_por := 'fundador';
  end if;
  new.updated_at := now();
  return new;
end;
$$;
drop trigger if exists before_update_fundador_comunicacao on public.fundador_comunicacao;
create trigger before_update_fundador_comunicacao before update on public.fundador_comunicacao
  for each row execute function public.touch_fundador_comunicacao();

-- 5) Medição para vender: quantas vezes o local apareceu em destaque e quantos toques recebeu (anônima).
create table if not exists public.vitrine_eventos (
  id bigint generated always as identity primary key,
  local_id uuid references public.locais(id) on delete cascade,
  secao text not null check (char_length(secao) <= 60),   -- ex.: destaques:bares, patrocinio:bares, oferta:bares, home:destaques
  tipo text not null check (tipo in ('exibicao','clique')),
  created_at timestamptz not null default now()
);
create index if not exists vitrine_eventos_local_idx on public.vitrine_eventos (local_id, created_at desc);
alter table public.vitrine_eventos enable row level security;
drop policy if exists "vitrine_eventos_insert" on public.vitrine_eventos;
create policy "vitrine_eventos_insert" on public.vitrine_eventos for insert to anon, authenticated with check (true);
drop policy if exists "vitrine_eventos_select_admin" on public.vitrine_eventos;
create policy "vitrine_eventos_select_admin" on public.vitrine_eventos for select to authenticated using (public.is_admin());

create or replace function public.resumo_vitrine_local(p_local_id uuid, p_dias integer default 30)
returns table (secao text, exibicoes bigint, cliques bigint)
language plpgsql security definer stable set search_path = public as $$
begin
  if not (public.is_admin() or exists (select 1 from public.locais l where l.id = p_local_id and l.owner_id = auth.uid())) then
    raise exception 'Sem permissão.';
  end if;
  return query
    select e.secao,
           count(*) filter (where e.tipo = 'exibicao'),
           count(*) filter (where e.tipo = 'clique')
    from public.vitrine_eventos e
    where e.local_id = p_local_id and e.created_at >= now() - make_interval(days => greatest(p_dias, 1))
    group by e.secao
    order by 2 desc;
end;
$$;
grant execute on function public.resumo_vitrine_local(uuid, integer) to authenticated;

commit;
