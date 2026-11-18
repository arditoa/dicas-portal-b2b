-- 119 — Ação de marca feita pela própria casa, no Modo parceiro (15/11/2026). Rode depois da 117 e da 118.
--
-- * acoes_marca.local_id: null = ação da equipe Dicas (várias casas); preenchido = ação da casa com uma marca
--   (ex.: o bar fechou um happy hour patrocinado pela Heineken).
-- * A ação da casa nasce fora da vitrine do app: a equipe Dicas revisa e liga "mostrar no app".
-- * A casa cria e edita as PRÓPRIAS ações (permissão 'cupons' ou 'festa') e vê o resultado (permissão 'resultados').
--   Incluído nos planos Premium e Fundador (plano ativo).
-- * Trava: cupom/festa só entra numa ação da mesma casa; ação da equipe Dicas e banners, só o admin liga.
-- * O relatório da casa é o mesmo da equipe, sem orientação sexual (só admin, como na 115).
-- Seguro rodar mais de uma vez.

alter table public.acoes_marca add column if not exists local_id uuid references public.locais(id) on delete cascade;
create index if not exists acoes_marca_local_idx on public.acoes_marca(local_id) where local_id is not null;

create or replace function public.local_premium_ativo(p_local uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.locais l where l.id = p_local
                  and l.plano_comercial::text in ('premium', 'fundador')
                  and coalesce(l.plano_comercial_status::text, 'ativo') = 'ativo');
$$;
revoke execute on function public.local_premium_ativo(uuid) from public, anon;
grant execute on function public.local_premium_ativo(uuid) to authenticated;

-- Quem da casa pode ver / mexer
drop policy if exists acoes_marca_casa_ver on public.acoes_marca;
create policy acoes_marca_casa_ver on public.acoes_marca for select using (
  local_id is not null and (public.pode_no_local(local_id, 'cupons') or public.pode_no_local(local_id, 'festa') or public.pode_no_local(local_id, 'resultados')));
drop policy if exists acoes_marca_casa_criar on public.acoes_marca;
create policy acoes_marca_casa_criar on public.acoes_marca for insert with check (
  local_id is not null and (public.pode_no_local(local_id, 'cupons') or public.pode_no_local(local_id, 'festa')) and public.local_premium_ativo(local_id));
drop policy if exists acoes_marca_casa_editar on public.acoes_marca;
create policy acoes_marca_casa_editar on public.acoes_marca for update using (
  local_id is not null and (public.pode_no_local(local_id, 'cupons') or public.pode_no_local(local_id, 'festa')))
  with check (local_id is not null and (public.pode_no_local(local_id, 'cupons') or public.pode_no_local(local_id, 'festa')));

-- A casa não troca a ação de dono nem liga/desliga a vitrine (isso é da equipe Dicas)
create or replace function public.protege_acao_marca()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    if tg_op = 'UPDATE' then
      new.local_id := old.local_id;
      new.mostrar_no_app := old.mostrar_no_app;
    else
      -- Ação criada pela casa começa FORA da vitrine: a equipe Dicas decide onde aparece (faixa, selo, página).
      new.mostrar_no_app := false;
    end if;
    new.criado_por := coalesce(new.criado_por, auth.uid());
  end if;
  return new;
end;
$$;
drop trigger if exists protege_acao_marca on public.acoes_marca;
create trigger protege_acao_marca before insert or update on public.acoes_marca
  for each row execute function public.protege_acao_marca();

-- Trava de etiqueta: cupom/festa só em ação da mesma casa; ação da equipe Dicas e banners, só admin
create or replace function public.confere_etiqueta_acao()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_local uuid;
begin
  if new.acao_marca_id is null then return new; end if;
  if tg_op = 'UPDATE' and new.acao_marca_id is not distinct from old.acao_marca_id then return new; end if;
  if public.is_admin() then return new; end if;
  if tg_table_name = 'banners_app' then
    raise exception 'Só a equipe Dicas liga banners a uma ação de marca.' using errcode = '42501';
  end if;
  select local_id into v_local from public.acoes_marca where id = new.acao_marca_id;
  if v_local is null or v_local is distinct from new.local_id then
    raise exception 'Este item só pode entrar numa ação de marca da própria casa.' using errcode = '42501';
  end if;
  return new;
end;
$$;
drop trigger if exists confere_etiqueta_acao on public.cupons;
create trigger confere_etiqueta_acao before insert or update of acao_marca_id on public.cupons
  for each row execute function public.confere_etiqueta_acao();
drop trigger if exists confere_etiqueta_acao on public.eventos;
create trigger confere_etiqueta_acao before insert or update of acao_marca_id on public.eventos
  for each row execute function public.confere_etiqueta_acao();
drop trigger if exists confere_etiqueta_acao on public.banners_app;
create trigger confere_etiqueta_acao before insert or update of acao_marca_id on public.banners_app
  for each row execute function public.confere_etiqueta_acao();

-- Relatório: agora também para a casa dona da ação
create or replace function public.relatorio_acao_marca(p_acao uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_a public.acoes_marca;
  v_ini timestamptz;
  v_fim timestamptz;
  v_presentes int;
  v_res jsonb;
begin
  select * into v_a from public.acoes_marca where id = p_acao;
  if not found then raise exception 'Ação não encontrada.'; end if;
  -- 119: admin vê todas; a casa vê a própria ação (permissão 'resultados' e Premium/Fundador ativo).
  if not public.is_admin() then
    if v_a.local_id is null or not public.pode_no_local(v_a.local_id, 'resultados') or not public.local_premium_ativo(v_a.local_id) then
      raise exception 'Sem acesso ao resultado desta ação.' using errcode = '42501';
    end if;
  end if;
  v_ini := v_a.inicio::timestamp at time zone 'America/Sao_Paulo';
  v_fim := (v_a.fim + 1)::timestamp at time zone 'America/Sao_Paulo';

  drop table if exists _am_p;
  create temp table _am_p on commit drop as select * from public.presentes_da_acao(p_acao);
  drop table if exists _am_u;
  create temp table _am_u on commit drop as
    select d.user_id,
           case when pr.birth_date is null then null else extract(year from age(v_a.fim, pr.birth_date))::int end as idade
      from (select distinct user_id from _am_p) d left join public.profiles pr on pr.id = d.user_id;
  select count(*) into v_presentes from _am_u;

  v_res := jsonb_build_object(
    'acao', to_jsonb(v_a) - 'criado_por' - 'local_id',
    'gerado_em', now(),
    'regras', jsonb_build_object('perfil_minimo_pessoas', 30, 'grupo_minimo', 10, 'arredondamento', 5),
    'itens', jsonb_build_object(
      'cupons',  (select coalesce(jsonb_agg(jsonb_build_object('id', c.id, 'titulo', c.titulo, 'local', l.nome)), '[]') from public.cupons c left join public.locais l on l.id = c.local_id where c.acao_marca_id = p_acao),
      'festas',  (select coalesce(jsonb_agg(jsonb_build_object('id', e.id, 'titulo', e.titulo, 'data', e.data_inicio)), '[]') from public.eventos e where e.acao_marca_id = p_acao),
      'banners', (select coalesce(jsonb_agg(jsonb_build_object('id', b.id, 'titulo', b.titulo)), '[]') from public.banners_app b where b.acao_marca_id = p_acao)
    ),
    'funil', jsonb_build_object(
      -- Viu
      'banner_exibicoes', public.rel_n((select count(*) from public.banners_eventos be join public.banners_app b on b.id = be.banner_id
                                         where b.acao_marca_id = p_acao and be.tipo = 'exibicao' and be.created_at >= v_ini and be.created_at < v_fim)),
      'festa_visitas',    public.rel_n((select count(*) from public.eventos_analytics ea join public.eventos e on e.id = ea.evento_id
                                         where e.acao_marca_id = p_acao and ea.tipo::text = 'visualizacao_festa' and ea.created_at >= v_ini and ea.created_at < v_fim)),
      -- Clicou
      'banner_cliques',   public.rel_n((select count(*) from public.banners_eventos be join public.banners_app b on b.id = be.banner_id
                                         where b.acao_marca_id = p_acao and be.tipo = 'clique' and be.created_at >= v_ini and be.created_at < v_fim)),
      'ingresso_cliques', public.rel_n((select count(*) from public.eventos_analytics ea join public.eventos e on e.id = ea.evento_id
                                         where e.acao_marca_id = p_acao and ea.tipo::text = 'clique_ingresso')),
      -- Se interessou
      'eu_vou',           public.rel_n((select count(*) from public.presencas pr join public.eventos e on e.id = pr.evento_id where e.acao_marca_id = p_acao)),
      'lista_entraram_na_lista', public.rel_n((select count(*) from public.listas_vip_solicitacoes s join public.listas_vip l on l.id = s.lista_vip_id
                                         join public.eventos e on e.id = l.evento_id where e.acao_marca_id = p_acao and s.status::text in ('aprovada', 'check_in'))),
      -- Converteu / foi
      'cupons_usados',    public.rel_n((select count(*) from _am_p where origem = 'cupom')),
      'entradas_lista',   public.rel_n((select count(*) from _am_p where origem = 'lista')),
      'pessoas_que_foram', public.rel_n(v_presentes)
    ),
    'custo_por_presenca', case when v_a.investimento is not null and v_presentes >= 10
                               then round(v_a.investimento / v_presentes, 2) else null end,
    'aceitam_ofertas_de_marcas', public.rel_n((select count(*) from _am_u u join public.push_preferencias pp on pp.user_id = u.user_id where pp.marcas)),
    'pesquisa', case when v_a.pesquisa_pergunta is null then null else jsonb_build_object(
      'pergunta', v_a.pesquisa_pergunta,
      'responderam', public.rel_n((select count(*) from public.acoes_marca_respostas r where r.acao_id = p_acao and r.resposta is not null)),
      'respostas', (select coalesce(jsonb_agg(jsonb_build_object('valor', o, 'n', public.rel_n(coalesce(x.n, 0))) order by ord), '[]')
                      from unnest(v_a.pesquisa_opcoes) with ordinality as t(o, ord)
                      left join (select resposta, count(*) n from public.acoes_marca_respostas where acao_id = p_acao group by 1) x on x.resposta = t.o)
    ) end
  );

  if v_presentes < 30 then
    return v_res || jsonb_build_object('perfil', jsonb_build_object('status', 'dados_insuficientes'));
  end if;

  return v_res || jsonb_build_object('perfil', jsonb_build_object(
    'status', 'ok',
    'idade', jsonb_build_object(
      '18–24', public.rel_n((select count(*) from _am_u where idade between 18 and 24)),
      '25–34', public.rel_n((select count(*) from _am_u where idade between 25 and 34)),
      '35–44', public.rel_n((select count(*) from _am_u where idade between 35 and 44)),
      '45+',   public.rel_n((select count(*) from _am_u where idade >= 45)),
      'sem_info', public.rel_n((select count(*) from _am_u where idade is null or idade < 18))
    ),
    'chegada_hora', (
      select jsonb_agg(jsonb_build_object('hora', h, 'n', public.rel_n(coalesce(x.n, 0))) order by h)
        from generate_series(0, 23) h
        left join (select extract(hour from quando at time zone 'America/Sao_Paulo')::int hh, count(*) n from _am_p group by 1) x on x.hh = h
    ),
    'chegada_dia', (
      select jsonb_agg(jsonb_build_object('dia', d, 'n', public.rel_n(coalesce(x.n, 0))) order by d)
        from generate_series(0, 6) d
        left join (select extract(dow from quando at time zone 'America/Sao_Paulo')::int dd, count(*) n from _am_p group by 1) x on x.dd = d
    ),
    'genero', jsonb_build_object(
      'consentiram', public.rel_n((select count(*) from _am_u u join public.perfil_privado pp on pp.user_id = u.user_id
                                    where pp.consentimento_relatorio_genero and nullif(trim(pp.identidade_genero), '') is not null)),
      'grupos', (select coalesce(jsonb_agg(jsonb_build_object('valor', valor, 'n', public.rel_n(n)) order by n desc), '[]')
                   from (select trim(pp.identidade_genero) valor, count(*) n from _am_u u join public.perfil_privado pp on pp.user_id = u.user_id
                          where pp.consentimento_relatorio_genero and nullif(trim(pp.identidade_genero), '') is not null
                          group by 1 having count(*) >= 10) g)
    ),
    -- Orientação sexual: só para a equipe Dicas (igual à 115).
    'orientacao', case when not public.is_admin() then null else jsonb_build_object(
      'consentiram', public.rel_n((select count(*) from _am_u u join public.perfil_privado pp on pp.user_id = u.user_id
                                    where pp.consentimento_relatorio_orientacao and nullif(trim(pp.orientacao_sexual), '') is not null)),
      'grupos', (select coalesce(jsonb_agg(jsonb_build_object('valor', valor, 'n', public.rel_n(n)) order by n desc), '[]')
                   from (select trim(pp.orientacao_sexual) valor, count(*) n from _am_u u join public.perfil_privado pp on pp.user_id = u.user_id
                          where pp.consentimento_relatorio_orientacao and nullif(trim(pp.orientacao_sexual), '') is not null
                          group by 1 having count(*) >= 10) g)
    ) end
  ));
end;
$$;
revoke execute on function public.relatorio_acao_marca(uuid) from public, anon;
grant execute on function public.relatorio_acao_marca(uuid) to authenticated;

-- Conferência
select count(*) filter (where local_id is null) as acoes_da_equipe, count(*) filter (where local_id is not null) as acoes_das_casas
  from public.acoes_marca;
