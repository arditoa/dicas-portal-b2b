-- 118 — Marcas no app (15/11/2026): selo "Apoio: <marca>", faixa "Marcas que apoiam" e página da ação.
-- Rode DEPOIS da 117. Seguro rodar mais de uma vez.
--
-- O público NUNCA lê a tabela acoes_marca (tem investimento e objetivo). Só estas funções, que devolvem
-- o que pode aparecer no app: marca, nome da ação, chamada, cor, logo e período.

alter table public.acoes_marca add column if not exists chamada text;      -- frase curta para o app (ex.: "Happy hour com Skol gelada")
alter table public.acoes_marca add column if not exists cor text;          -- cor da marca, ex.: #F2C94C
alter table public.acoes_marca add column if not exists logo_url text;     -- logo (link público)
alter table public.acoes_marca add column if not exists mostrar_no_app boolean not null default true;

-- Ações no ar hoje (para a faixa e para o selo). Só ações ativas e no período.
-- (Mudou o formato de retorno: por isso o drop antes.)
drop function if exists public.acoes_marca_vitrine();
create or replace function public.acoes_marca_vitrine()
returns table (id uuid, marca text, nome text, chamada text, cor text, logo_url text, inicio date, fim date, cupom_ids uuid[], festa_ids uuid[])
language sql stable security definer set search_path = public as $$
  -- cupom_ids / festa_ids: o app põe o selo "Apoio: <marca>" nesses cupons e festas sem mudar as consultas dele.
  select a.id, a.marca, a.nome, a.chamada, a.cor, a.logo_url, a.inicio, a.fim,
         coalesce((select array_agg(c.id) from public.cupons c where c.acao_marca_id = a.id and c.ativo), '{}'),
         coalesce((select array_agg(e.id) from public.eventos e where e.acao_marca_id = a.id and e.status = 'aprovado' and coalesce(e.data_fim, e.data_inicio) >= now()), '{}')
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
    'cupons', coalesce((select jsonb_agg(jsonb_build_object('id', c.id, 'titulo', c.titulo, 'descricao', c.descricao,
                          'local_id', l.id, 'local', l.nome, 'bairro', coalesce(l.bairro_exibicao, l.bairro), 'cidade', l.cidade,
                          'foto', coalesce(l.foto_capa_url, l.galeria_fotos[1])) order by l.nome)
                         from public.cupons c join public.locais l on l.id = c.local_id
                        where c.acao_marca_id = a.id and c.ativo and l.status = 'aprovado'), '[]'::jsonb),
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
select * from public.acoes_marca_vitrine();
