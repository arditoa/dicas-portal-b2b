-- 125 — Moldura personalizada e escolha do brinde (15/11/2026). Rode depois da 124.
-- * Moldura: a marca pode mandar a própria moldura (PNG transparente, link) ou escolher cor + frase.
-- * Escolha do brinde: na hora de usar o cupom da ação, a pessoa escolhe a opção (ex.: o sabor).
--   A marca recebe a preferência somada (quantas pessoas escolheram cada opção). Sem nomes.
-- Seguro rodar mais de uma vez.

alter table public.acoes_marca add column if not exists moldura_url text;        -- PNG 1080x1350 com fundo transparente
alter table public.acoes_marca add column if not exists moldura_texto text check (moldura_texto is null or char_length(moldura_texto) <= 60);
alter table public.acoes_marca add column if not exists brinde_pergunta text check (brinde_pergunta is null or char_length(brinde_pergunta) <= 80);
alter table public.acoes_marca add column if not exists brinde_opcoes text[];
do $$ begin
  alter table public.acoes_marca add constraint acoes_marca_brinde_ok check (brinde_opcoes is null or array_length(brinde_opcoes, 1) between 2 and 12);
exception when duplicate_object then null; end $$;

create table if not exists public.acoes_marca_escolhas (
  id bigint generated always as identity primary key,
  acao_id uuid not null references public.acoes_marca(id) on delete cascade,
  user_id uuid default auth.uid() references public.profiles(id) on delete set null,
  cupom_id uuid references public.cupons(id) on delete set null,
  opcao text not null,
  created_at timestamptz not null default now()
);
alter table public.acoes_marca_escolhas enable row level security;
drop policy if exists acoes_marca_escolhas_dono on public.acoes_marca_escolhas;
create policy acoes_marca_escolhas_dono on public.acoes_marca_escolhas for select using (auth.uid() = user_id);

create or replace function public.registrar_escolha_brinde(p_acao uuid, p_cupom uuid, p_opcao text)
returns void language plpgsql security definer set search_path = public as $$
declare v_opcoes text[];
begin
  if auth.uid() is null then raise exception 'Entre na sua conta.'; end if;
  select brinde_opcoes into v_opcoes from public.acoes_marca where id = p_acao and ativa;
  if v_opcoes is null or not (p_opcao = any(v_opcoes)) then raise exception 'Opção inválida.'; end if;
  insert into public.acoes_marca_escolhas (acao_id, user_id, cupom_id, opcao) values (p_acao, auth.uid(), p_cupom, p_opcao);
end;
$$;
revoke execute on function public.registrar_escolha_brinde(uuid, uuid, text) from public, anon;
grant execute on function public.registrar_escolha_brinde(uuid, uuid, text) to authenticated;

-- Preferência somada (admin ou a casa dona da ação)
create or replace function public.escolhas_da_acao(p_acao uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_a public.acoes_marca;
begin
  select * into v_a from public.acoes_marca where id = p_acao;
  if not found then raise exception 'Ação não encontrada.'; end if;
  if not public.is_admin() and (v_a.local_id is null or not public.pode_no_local(v_a.local_id, 'resultados')) then
    raise exception 'Sem acesso ao resultado desta ação.' using errcode = '42501';
  end if;
  if v_a.brinde_opcoes is null then return null; end if;
  return jsonb_build_object('pergunta', coalesce(v_a.brinde_pergunta, 'Qual você escolheu?'),
    'total', (select count(*) from public.acoes_marca_escolhas where acao_id = p_acao),
    'opcoes', (select jsonb_agg(jsonb_build_object('valor', o, 'n', (select count(*) from public.acoes_marca_escolhas x where x.acao_id = p_acao and x.opcao = o)) order by ord)
                 from unnest(v_a.brinde_opcoes) with ordinality t(o, ord)));
end;
$$;
revoke execute on function public.escolhas_da_acao(uuid) from public, anon;
grant execute on function public.escolhas_da_acao(uuid) to authenticated;

-- Ações no ar hoje (para a faixa e para o selo). Só ações ativas e no período.
-- (Mudou o formato de retorno: por isso o drop antes.)
drop function if exists public.acoes_marca_vitrine();
create or replace function public.acoes_marca_vitrine()
returns table (id uuid, marca text, nome text, chamada text, cor text, logo_url text, inicio date, fim date, cupom_ids uuid[], festa_ids uuid[],
               moldura_url text, moldura_texto text, brinde_pergunta text, brinde_opcoes text[])
language sql stable security definer set search_path = public as $$
  -- cupom_ids / festa_ids: o app põe o selo "Apoio: <marca>" nesses cupons e festas sem mudar as consultas dele.
  select a.id, a.marca, a.nome, a.chamada, a.cor, a.logo_url, a.inicio, a.fim,
         coalesce((select array_agg(c.id) from public.cupons c where c.acao_marca_id = a.id and c.ativo and (c.valido_ate is null or c.valido_ate >= now())), '{}'),
         coalesce((select array_agg(e.id) from public.eventos e where e.acao_marca_id = a.id and e.status = 'aprovado' and coalesce(e.data_fim, e.data_inicio) >= now()), '{}'),
         a.moldura_url, a.moldura_texto, a.brinde_pergunta, a.brinde_opcoes
    from public.acoes_marca a
   where a.ativa and a.mostrar_no_app
     and (now() at time zone 'America/Sao_Paulo')::date between a.inicio and a.fim
   order by a.fim;
$$;
revoke execute on function public.acoes_marca_vitrine() from public;
grant execute on function public.acoes_marca_vitrine() to anon, authenticated;

-- Página da ação: dados públicos + cupons ativos (com a casa) + festas que ainda vão acontecer.
create or replace function public.acao_marca_publica(p_acao uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'id', a.id, 'marca', a.marca, 'nome', a.nome, 'chamada', a.chamada, 'cor', a.cor, 'logo_url', a.logo_url,
    'inicio', a.inicio, 'fim', a.fim,
    'moldura_url', a.moldura_url, 'moldura_texto', a.moldura_texto, 'brinde_pergunta', a.brinde_pergunta, 'brinde_opcoes', a.brinde_opcoes,
    'cupons', coalesce((select jsonb_agg(jsonb_build_object('id', c.id, 'titulo', c.titulo, 'descricao', c.descricao,
                          'local_id', l.id, 'local', l.nome, 'bairro', coalesce(l.bairro_exibicao, l.bairro), 'cidade', l.cidade,
                          'foto', coalesce(l.foto_capa_url, l.galeria_fotos[1])) order by l.nome)
                         from public.cupons c join public.locais l on l.id = c.local_id
                        where c.acao_marca_id = a.id and c.ativo and (c.valido_ate is null or c.valido_ate >= now()) and l.status = 'aprovado'), '[]'::jsonb),
    'festas', coalesce((select jsonb_agg(jsonb_build_object('id', e.id, 'titulo', e.titulo, 'data_inicio', e.data_inicio,
                          'foto', e.foto_capa_url, 'local', l.nome, 'bairro', coalesce(l.bairro_exibicao, l.bairro)) order by e.data_inicio)
                         from public.eventos e left join public.locais l on l.id = e.local_id
                        where e.acao_marca_id = a.id and e.status = 'aprovado' and coalesce(e.data_fim, e.data_inicio) >= now()), '[]'::jsonb)
  )
  from public.acoes_marca a
  where a.id = p_acao and a.ativa and a.mostrar_no_app;
$$;
revoke execute on function public.acao_marca_publica(uuid) from public;
grant execute on function public.acao_marca_publica(uuid) to anon, authenticated;

-- Conferência
select id, marca, brinde_opcoes from public.acoes_marca_vitrine();
