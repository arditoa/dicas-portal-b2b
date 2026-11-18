-- 144 — Marcas: link de resultados ao vivo e Pulso LGBT+ (16/11/2026). Rode depois da 143. Seguro rodar mais de uma vez.
--
-- 1) LINK DA MARCA: a equipe gera um link (token) por ação de marca e manda para a marca. A marca abre no navegador e vê
--    ao vivo: provas entregues e quantas restam, funil (viu → clicou → foi), escolhas do brinde, questionário (pesquisa
--    patrocinada), fotos autorizadas e perfil do público (com as mesmas proteções: 30+ pessoas, grupos com menos de 10
--    viram "menos de 10"). Respostas abertas e orientação sexual continuam só para a equipe Dicas.
--    O link vale até 90 dias depois do fim da ação; a equipe pode trocar o link (o antigo para de funcionar).
-- 2) PULSO LGBT+: retrato mensal da noite LGBT+ (Brasil ou uma cidade): pessoas ativas, idade, dias e horários de pico,
--    tipos de casa, bairros, gostos, ingressos. Só números somados (mínimo 100 pessoas; grupos com menos de 10 fora).
--    A equipe gera e publica um link para marcas, agências e imprensa (foto congelada do mês, não muda depois).

-- 1) Link da marca ----------------------------------------------------------------------------------------
alter table public.acoes_marca add column if not exists token_marca text unique;

create or replace function public.admin_link_marca(p_acao uuid, p_trocar boolean default false)
returns text language plpgsql security definer set search_path = public as $$
declare v_token text;
begin
  if not public.is_admin() then raise exception 'Só a equipe Dicas.' using errcode = '42501'; end if;
  update public.acoes_marca set token_marca = case when p_trocar or token_marca is null then encode(extensions.gen_random_bytes(16), 'hex') else token_marca end
   where id = p_acao returning token_marca into v_token;
  if v_token is null then raise exception 'Ação não encontrada.'; end if;
  return v_token;
end; $$;
revoke execute on function public.admin_link_marca(uuid, boolean) from public, anon;
grant execute on function public.admin_link_marca(uuid, boolean) to authenticated;

-- Os relatórios da ação aceitam também o link da marca (só dentro de resultado_para_marca, na mesma transação)
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
  if not public.is_admin() and coalesce(current_setting('dicas.marca_token_acao', true), '') <> p_acao::text then
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

create or replace function public.questionario_da_acao(p_acao uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_a public.acoes_marca;
  q jsonb;
  saida jsonb := '[]'::jsonb;
  item jsonb;
begin
  select * into v_a from public.acoes_marca where id = p_acao;
  if not found then raise exception 'Ação não encontrada.'; end if;
  if not public.is_admin() and coalesce(current_setting('dicas.marca_token_acao', true), '') <> p_acao::text and (v_a.local_id is null or not public.pode_no_local(v_a.local_id, 'resultados')) then
    raise exception 'Sem acesso ao resultado desta ação.' using errcode = '42501';
  end if;
  if v_a.pesquisa_perguntas is null then return null; end if;
  for q in select * from jsonb_array_elements(v_a.pesquisa_perguntas) loop
    if q->>'tipo' = 'escolha' then
      item := jsonb_build_object('id', q->>'id', 'texto', q->>'texto', 'tipo', 'escolha',
        'responderam', public.rel_n((select count(*) from public.acoes_marca_respostas r where r.acao_id = p_acao and r.respostas ? (q->>'id'))),
        'opcoes', (select coalesce(jsonb_agg(jsonb_build_object('valor', o, 'n', public.rel_n((select count(*) from public.acoes_marca_respostas r
                      where r.acao_id = p_acao and r.respostas->>(q->>'id') = o))) order by ord), '[]'::jsonb)
                   from jsonb_array_elements_text(q->'opcoes') with ordinality t(o, ord)));
    elsif q->>'tipo' = 'nota' then
      item := jsonb_build_object('id', q->>'id', 'texto', q->>'texto', 'tipo', 'nota',
        'responderam', public.rel_n((select count(*) from public.acoes_marca_respostas r where r.acao_id = p_acao and r.respostas ? (q->>'id'))),
        'media', (select case when count(*) >= 10 then round(avg((r.respostas->>(q->>'id'))::numeric), 1) end
                    from public.acoes_marca_respostas r where r.acao_id = p_acao and r.respostas ? (q->>'id')),
        'promotores', (select case when count(*) >= 10 then round(100.0 * count(*) filter (where (r.respostas->>(q->>'id'))::numeric >= 9) / count(*)) end
                    from public.acoes_marca_respostas r where r.acao_id = p_acao and r.respostas ? (q->>'id')),
        'detratores', (select case when count(*) >= 10 then round(100.0 * count(*) filter (where (r.respostas->>(q->>'id'))::numeric <= 6) / count(*)) end
                    from public.acoes_marca_respostas r where r.acao_id = p_acao and r.respostas ? (q->>'id')));
    else
      item := jsonb_build_object('id', q->>'id', 'texto', q->>'texto', 'tipo', 'aberta',
        'responderam', public.rel_n((select count(*) from public.acoes_marca_respostas r where r.acao_id = p_acao and r.respostas ? (q->>'id'))),
        'textos', case when public.is_admin() then
                    (select coalesce(jsonb_agg(r.respostas->>(q->>'id') order by r.created_at desc), '[]'::jsonb)
                       from (select * from public.acoes_marca_respostas r0 where r0.acao_id = p_acao and r0.respostas ? (q->>'id') order by r0.created_at desc limit 200) r)
                  else null end);
    end if;
    saida := saida || jsonb_build_array(item);
  end loop;
  return jsonb_build_object('perguntas', saida,
    'responderam', public.rel_n((select count(*) from public.acoes_marca_respostas r where r.acao_id = p_acao and r.respostas is not null)));
end;
$$;

create or replace function public.escolhas_da_acao(p_acao uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_a public.acoes_marca;
begin
  select * into v_a from public.acoes_marca where id = p_acao;
  if not found then raise exception 'Ação não encontrada.'; end if;
  if not public.is_admin() and coalesce(current_setting('dicas.marca_token_acao', true), '') <> p_acao::text and (v_a.local_id is null or not public.pode_no_local(v_a.local_id, 'resultados')) then
    raise exception 'Sem acesso ao resultado desta ação.' using errcode = '42501';
  end if;
  if v_a.brinde_opcoes is null then return null; end if;
  return jsonb_build_object('pergunta', coalesce(v_a.brinde_pergunta, 'Qual você escolheu?'),
    'total', (select count(*) from public.acoes_marca_escolhas where acao_id = p_acao),
    'opcoes', (select jsonb_agg(jsonb_build_object('valor', o, 'n', (select count(*) from public.acoes_marca_escolhas x where x.acao_id = p_acao and x.opcao = o)) order by ord)
                 from unnest(v_a.brinde_opcoes) with ordinality t(o, ord)));
end;
$$;

create or replace function public.fotos_da_acao(p_acao uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_local uuid;
begin
  select local_id into v_local from public.acoes_marca where id = p_acao;
  if not found then raise exception 'Ação não encontrada.'; end if;
  if not public.is_admin() and coalesce(current_setting('dicas.marca_token_acao', true), '') <> p_acao::text and (v_local is null or not public.pode_no_local(v_local, 'resultados')) then
    raise exception 'Sem acesso ao resultado desta ação.' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'fotos',         (select count(*) from public.acoes_marca_fotos where acao_id = p_acao and tipo = 'foto'),
    'compartilhadas',(select count(*) from public.acoes_marca_fotos where acao_id = p_acao and tipo = 'compartilhou'),
    'salvas',        (select count(*) from public.acoes_marca_fotos where acao_id = p_acao and tipo = 'salvou'),
    'pessoas',       public.rel_n((select count(distinct user_id) from public.acoes_marca_fotos where acao_id = p_acao and tipo = 'foto')),
    'checkins',      (select count(*) from public.acoes_marca_presencas where acao_id = p_acao),
    'pessoas_checkin', public.rel_n((select count(distinct user_id) from public.acoes_marca_presencas where acao_id = p_acao)),
    'enviadas_marca', (select count(*) from public.memorias where acao_id = p_acao and enviar_para_marca and expira_em > now()),
    'marca_pode_postar', (select count(*) from public.memorias where acao_id = p_acao and marca_pode_publicar and expira_em > now())
  );
end;
$$;

create or replace function public.resultado_para_marca(p_token text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare a public.acoes_marca;
begin
  if p_token is null or length(p_token) < 20 then return null; end if;
  select * into a from public.acoes_marca where token_marca = p_token;
  if a.id is null or a.fim + 90 < (now() at time zone 'America/Sao_Paulo')::date then return null; end if;
  perform set_config('dicas.marca_token_acao', a.id::text, true);
  return jsonb_build_object(
    'acao', jsonb_build_object('marca', a.marca, 'nome', a.nome, 'inicio', a.inicio, 'fim', a.fim, 'brinde', a.brinde, 'limite_total', a.limite_total,
                               'casas', (select coalesce(jsonb_agg(l.nome order by l.nome), '[]'::jsonb) from public.locais l where l.id in (select public.locais_da_acao(a.id)))),
    'contagem', jsonb_build_object('feitos', (select count(*) from public.acoes_marca_presencas p where p.acao_id = a.id),
                                   'restam', case when a.limite_total is null then null else greatest(a.limite_total - (select count(*) from public.acoes_marca_presencas p where p.acao_id = a.id), 0) end),
    'relatorio', public.relatorio_acao_marca(a.id) - 'acao' - 'itens',
    'questionario', public.questionario_da_acao(a.id),
    'escolhas', public.escolhas_da_acao(a.id),
    'fotos', public.fotos_da_acao(a.id),
    'gerado_em', now());
end; $$;
revoke all on function public.resultado_para_marca(text) from public;
grant execute on function public.resultado_para_marca(text) to anon, authenticated;

-- 2) Pulso LGBT+ ------------------------------------------------------------------------------------------
create or replace function public.pulso_lgbt(p_mes date, p_cidade text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_ini timestamptz := (date_trunc('month', p_mes)::date)::timestamp at time zone 'America/Sao_Paulo';
  v_fim timestamptz := ((date_trunc('month', p_mes) + interval '1 month')::date)::timestamp at time zone 'America/Sao_Paulo';
  v_ant_ini timestamptz := ((date_trunc('month', p_mes) - interval '1 month')::date)::timestamp at time zone 'America/Sao_Paulo';
  v_pessoas int; v_ant int; v_res jsonb;
begin
  if not public.is_admin() then raise exception 'Só a equipe Dicas.' using errcode = '42501'; end if;
  drop table if exists _pul;
  create temp table _pul on commit drop as
    select x.user_id, x.local_id, x.quando, l.categoria::text as categoria, coalesce(nullif(l.bairro_exibicao, ''), l.bairro) as bairro
      from (
        select user_id, local_id, validado_em as quando from public.checkins where cancelado_em is null and validado_em >= v_ant_ini and validado_em < v_fim
        union all select i.user_id, e.local_id, i.usado_em from public.ingressos i join public.eventos e on e.id = i.evento_id where i.usado_em >= v_ant_ini and i.usado_em < v_fim
        union all select user_id, local_id, criado_em from public.termometro_sinais where criado_em >= v_ant_ini and criado_em < v_fim
        union all select user_id, local_id, created_at from public.acoes_marca_presencas where local_id is not null and created_at >= v_ant_ini and created_at < v_fim
      ) x join public.locais l on l.id = x.local_id
     where p_cidade is null or lower(l.cidade) = lower(p_cidade);
  select count(distinct user_id) into v_pessoas from _pul where quando >= v_ini;
  select count(distinct user_id) into v_ant from _pul where quando < v_ini;
  v_res := jsonb_build_object('mes', to_char(v_ini at time zone 'America/Sao_Paulo', 'YYYY-MM'), 'cidade', p_cidade, 'gerado_em', now(),
    'regras', jsonb_build_object('minimo_pessoas', 100, 'grupo_minimo', 10));
  if v_pessoas < 100 then return v_res || jsonb_build_object('status', 'dados_insuficientes', 'pessoas', public.rel_n(v_pessoas)); end if;
  delete from _pul where quando < v_ini;

  return v_res || jsonb_build_object(
    'status', 'ok',
    'pessoas', public.rel_n(v_pessoas),
    'crescimento_pct', case when v_ant >= 100 then round(100.0 * (v_pessoas - v_ant) / v_ant) end,
    'casas_com_movimento', (select count(distinct local_id) from _pul),
    'idade_pct', (select jsonb_build_object(
        '18–24', round(100.0 * count(*) filter (where idade between 18 and 24) / nullif(count(*) filter (where idade >= 18), 0)),
        '25–34', round(100.0 * count(*) filter (where idade between 25 and 34) / nullif(count(*) filter (where idade >= 18), 0)),
        '35–44', round(100.0 * count(*) filter (where idade between 35 and 44) / nullif(count(*) filter (where idade >= 18), 0)),
        '45+',   round(100.0 * count(*) filter (where idade >= 45) / nullif(count(*) filter (where idade >= 18), 0)))
      from (select distinct p.user_id, extract(year from age(v_fim, pr.birth_date))::int as idade from _pul p left join public.profiles pr on pr.id = p.user_id) z),
    'dias_pct', (select jsonb_agg(jsonb_build_object('dia', d, 'pct', round(100.0 * coalesce(x.n, 0) / nullif((select count(*) from _pul), 0))) order by d)
                   from generate_series(0, 6) d left join (select extract(dow from quando at time zone 'America/Sao_Paulo')::int dd, count(*) n from _pul group by 1) x on x.dd = d),
    'pico_hora', (select extract(hour from quando at time zone 'America/Sao_Paulo')::int from _pul group by 1 order by count(*) desc limit 1),
    'categorias_pct', (select coalesce(jsonb_agg(jsonb_build_object('categoria', categoria, 'pct', pct) order by pct desc), '[]'::jsonb) from (
        select categoria, round(100.0 * count(*) / (select count(*) from _pul)) pct from _pul group by 1 having count(distinct user_id) >= 10) c),
    'bairros', case when p_cidade is null then null else (select coalesce(jsonb_agg(jsonb_build_object('bairro', bairro, 'pessoas', public.rel_n(n)) order by n desc), '[]'::jsonb) from (
        select bairro, count(distinct user_id) n from _pul where bairro is not null group by 1 having count(distinct user_id) >= 30 and count(distinct local_id) >= 2 order by 2 desc limit 6) b) end,
    'gostos_musica', (select coalesce(jsonb_agg(jsonb_build_object('valor', valor, 'pct', round(100.0 * n / v_pessoas))), '[]'::jsonb) from (
        select v.valor, count(distinct pp.user_id) n from (select distinct user_id from _pul) u join public.perfil_privado pp on pp.user_id = u.user_id
          cross join lateral jsonb_array_elements_text(case when jsonb_typeof(pp.gostos->'musica') = 'array' then pp.gostos->'musica' else '[]'::jsonb end) v(valor)
         group by 1 having count(distinct pp.user_id) >= 10 order by 2 desc limit 8) g),
    'gostos_experiencia', (select coalesce(jsonb_agg(jsonb_build_object('valor', valor, 'pct', round(100.0 * n / v_pessoas))), '[]'::jsonb) from (
        select v.valor, count(distinct pp.user_id) n from (select distinct user_id from _pul) u join public.perfil_privado pp on pp.user_id = u.user_id
          cross join lateral jsonb_array_elements_text(case when jsonb_typeof(pp.gostos->'experiencia') = 'array' then pp.gostos->'experiencia' else '[]'::jsonb end) v(valor)
         group by 1 having count(distinct pp.user_id) >= 10 order by 2 desc limit 8) g),
    'ingressos', (select jsonb_build_object('vendidos', public.rel_n(count(*)), 'preco_medio_centavos', case when count(*) >= 30 then round(avg(i.preco_centavos)) end)
                    from public.ingressos i join public.ingresso_pedidos pd on pd.id = i.pedido_id join public.locais l on l.id = pd.local_id
                   where pd.status = 'pago' and pd.pago_em >= v_ini and pd.pago_em < v_fim and not i.cortesia and i.preco_centavos > 0
                     and (p_cidade is null or lower(l.cidade) = lower(p_cidade))));
end; $$;
revoke execute on function public.pulso_lgbt(date, text) from public, anon;
grant execute on function public.pulso_lgbt(date, text) to authenticated;

create table if not exists public.pulso_publicacoes (
  token text primary key default encode(extensions.gen_random_bytes(12), 'hex'),
  mes text not null,
  cidade text,
  dados jsonb not null,
  publicado_por uuid default auth.uid(),
  publicado_em timestamptz not null default now()
);
alter table public.pulso_publicacoes enable row level security;
drop policy if exists pulso_publicacoes_admin on public.pulso_publicacoes;
create policy pulso_publicacoes_admin on public.pulso_publicacoes for all using (public.is_admin()) with check (public.is_admin());

create or replace function public.publicar_pulso(p_mes date, p_cidade text default null)
returns text language plpgsql security definer set search_path = public as $$
declare v_dados jsonb := public.pulso_lgbt(p_mes, p_cidade); v_token text;
begin
  if v_dados->>'status' <> 'ok' then raise exception 'Poucos dados neste mês para publicar (mínimo 100 pessoas).'; end if;
  insert into public.pulso_publicacoes (mes, cidade, dados) values (v_dados->>'mes', p_cidade, v_dados) returning token into v_token;
  return v_token;
end; $$;
revoke execute on function public.publicar_pulso(date, text) from public, anon;
grant execute on function public.publicar_pulso(date, text) to authenticated;

create or replace function public.pulso_publico(p_token text)
returns jsonb language sql stable security definer set search_path = public as $$
  select dados || jsonb_build_object('publicado_em', publicado_em) from public.pulso_publicacoes where token = p_token;
$$;
grant execute on function public.pulso_publico(text) to anon, authenticated;
