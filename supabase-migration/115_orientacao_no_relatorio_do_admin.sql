-- 115 — Orientação sexual no Relatório de público, SÓ no PDF do /admin (13/11/2026).
--
-- Decisão da Andrea (13/11/2026): a orientação sexual pode entrar no relatório que a equipe Dicas gera no /admin e
-- envia à marca patrocinadora, mas:
--   * só de quem deu um consentimento PRÓPRIO e separado (consentimento_relatorio_orientacao, padrão: não), com o texto
--     "Autorizo usar minha orientação sexual, de forma anônima e somada, em relatórios da equipe Dicas para marcas parceiras.";
--   * nunca na tela "Seu público" do Modo parceiro: para quem não é admin, a chave 'orientacao' volta null
--     (assim a casa não consegue comparar períodos para tentar descobrir alguém);
--   * com as mesmas proteções da 114 (mínimo de 30 pessoas, grupos com menos de 10 fora, números arredondados de 5 em 5).
-- O resto do relatório é igual à 114. Seguro rodar mais de uma vez. Rode depois da 114.

alter table public.perfil_privado add column if not exists consentimento_relatorio_orientacao boolean not null default false;
alter table public.perfil_privado add column if not exists consentimento_relatorio_orientacao_em timestamptz;
comment on column public.perfil_privado.consentimento_relatorio_orientacao is
  'Autorizo usar minha orientação sexual, de forma anônima e somada, em relatórios da equipe Dicas para marcas parceiras.';

create or replace function public.relatorio_publico(p_local uuid default null, p_evento uuid default null, p_de date default null, p_ate date default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_local uuid := p_local;
  v_ev record;
  v_evento jsonb := null; -- só preenchido no relatório por festa (evita ler v_ev sem valor)
  v_nome text;
  v_ini timestamptz;
  v_fim timestamptz;
  v_de date;
  v_ate date;
  v_pessoas int;
  v_base jsonb;
  v_res jsonb;
begin
  -- Escopo
  if p_evento is not null then
    select e.id, e.titulo, e.local_id, e.data_inicio, coalesce(e.data_fim, e.data_inicio + interval '8 hours') as fim
      into v_ev from public.eventos e where e.id = p_evento;
    if not found then raise exception 'Festa não encontrada.'; end if;
    if v_local is null then v_local := v_ev.local_id;
    elsif v_ev.local_id is distinct from v_local then raise exception 'Esta festa não é desta casa.'; end if;
    if v_local is null then raise exception 'O relatório por festa vale para festas de uma casa.'; end if;
    v_evento := jsonb_build_object('id', v_ev.id, 'titulo', v_ev.titulo, 'data_inicio', v_ev.data_inicio);
    v_ini := v_ev.data_inicio - interval '3 hours';
    v_fim := v_ev.fim + interval '3 hours';
    v_de := (v_ev.data_inicio at time zone 'America/Sao_Paulo')::date;
    v_ate := (v_ev.fim at time zone 'America/Sao_Paulo')::date;
  else
    if v_local is null or p_de is null or p_ate is null then raise exception 'Escolha a casa e o período.'; end if;
    if p_ate < p_de then raise exception 'A data final vem antes da inicial.'; end if;
    if p_ate - p_de > 366 then raise exception 'O período vai até 12 meses.'; end if;
    v_de := p_de; v_ate := p_ate;
    v_ini := p_de::timestamp at time zone 'America/Sao_Paulo';
    v_fim := (p_ate + 1)::timestamp at time zone 'America/Sao_Paulo';
  end if;

  -- Quem pode
  if not public.is_admin() then
    if not public.pode_no_local(v_local, 'resultados') then
      raise exception 'Seu acesso não inclui os resultados desta casa.' using errcode = '42501';
    end if;
    if not exists (select 1 from public.locais l where l.id = v_local
                    and l.plano_comercial::text in ('premium', 'fundador')
                    and coalesce(l.plano_comercial_status::text, 'ativo') = 'ativo') then
      raise exception 'O relatório de público está incluído nos planos Premium e Fundador.' using errcode = '42501';
    end if;
  end if;

  select nome into v_nome from public.locais where id = v_local;
  v_base := jsonb_build_object(
    'local', jsonb_build_object('id', v_local, 'nome', v_nome),
    'evento', v_evento,
    'de', v_de, 'ate', v_ate, 'gerado_em', now(),
    'regras', jsonb_build_object('minimo_pessoas', 30, 'grupo_minimo', 10, 'arredondamento', 5)
  );

  -- Contatos no escopo (uma linha por coisa que a pessoa fez)
  drop table if exists _rel_c;
  create temp table _rel_c (user_id uuid, quando timestamptz, origem text, chegada boolean) on commit drop;

  insert into _rel_c
    select c.user_id, c.validado_em, 'checkin', true
      from public.checkins c
     where c.local_id = v_local and c.validado_em is not null and c.cancelado_em is null
       and c.validado_em >= v_ini and c.validado_em < v_fim;

  insert into _rel_c
    select s.user_id, coalesce(s.check_in_em, e.data_inicio),
           case when s.status::text = 'check_in' then 'lista_entrou' else 'lista_aprovada' end,
           s.status::text = 'check_in' and s.check_in_em is not null
      from public.listas_vip_solicitacoes s
      join public.listas_vip l on l.id = s.lista_vip_id
      join public.eventos e on e.id = l.evento_id
     where e.local_id = v_local and s.status::text in ('aprovada', 'check_in')
       and case when p_evento is not null then e.id = p_evento else e.data_inicio >= v_ini and e.data_inicio < v_fim end;

  insert into _rel_c
    select r.user_id, r.resgatado_em, 'cupom', false
      from public.cupons_resgatados r join public.cupons c on c.id = r.cupom_id
     where c.local_id = v_local and r.resgatado_em >= v_ini and r.resgatado_em < v_fim;

  insert into _rel_c
    select pr.user_id, pr.created_at, 'eu_vou', false
      from public.presencas pr
     where pr.local_id = v_local
       and case when p_evento is not null then pr.evento_id = p_evento else pr.data between v_de and v_ate end;

  select count(distinct user_id) into v_pessoas from _rel_c;
  if v_pessoas < 30 then
    return v_base || jsonb_build_object('status', 'dados_insuficientes');
  end if;

  -- Uma linha por pessoa: recorrente (já tinha vindo antes) e idade
  drop table if exists _rel_p;
  create temp table _rel_p (user_id uuid, recorrente boolean, idade int) on commit drop;
  insert into _rel_p
    select u.user_id,
           (   exists (select 1 from public.checkins c where c.user_id = u.user_id and c.local_id = v_local
                        and c.validado_em is not null and c.cancelado_em is null and c.validado_em < v_ini)
            or exists (select 1 from public.listas_vip_solicitacoes s join public.listas_vip l on l.id = s.lista_vip_id
                         join public.eventos e on e.id = l.evento_id
                        where s.user_id = u.user_id and e.local_id = v_local and s.status::text in ('aprovada', 'check_in')
                          and e.data_inicio < v_ini)
            or exists (select 1 from public.cupons_resgatados r join public.cupons c on c.id = r.cupom_id
                        where r.user_id = u.user_id and c.local_id = v_local and r.resgatado_em < v_ini)
            or exists (select 1 from public.presencas pr where pr.user_id = u.user_id and pr.local_id = v_local and pr.data < v_de)
           ) as recorrente,
           case when p.birth_date is null then null else extract(year from age(v_ate, p.birth_date))::int end as idade
      from (select distinct user_id from _rel_c) u
      left join public.profiles p on p.id = u.user_id;

  select v_base || jsonb_build_object(
    'status', 'ok',
    'pessoas', public.rel_n(v_pessoas),
    'novas', public.rel_n((select count(*) from _rel_p where not recorrente)),
    'recorrentes', public.rel_n((select count(*) from _rel_p where recorrente)),
    'idade', jsonb_build_object(
      '18–24', public.rel_n((select count(*) from _rel_p where idade between 18 and 24)),
      '25–34', public.rel_n((select count(*) from _rel_p where idade between 25 and 34)),
      '35–44', public.rel_n((select count(*) from _rel_p where idade between 35 and 44)),
      '45+',   public.rel_n((select count(*) from _rel_p where idade >= 45)),
      'sem_info', public.rel_n((select count(*) from _rel_p where idade is null or idade < 18))
    ),
    'chegada_hora', (
      select jsonb_agg(jsonb_build_object('hora', h, 'n', public.rel_n(coalesce(x.n, 0))) order by h)
        from generate_series(0, 23) h
        left join (select extract(hour from quando at time zone 'America/Sao_Paulo')::int as hh, count(*) as n
                     from _rel_c where chegada group by 1) x on x.hh = h
    ),
    'chegada_dia', (
      select jsonb_agg(jsonb_build_object('dia', d, 'n', public.rel_n(coalesce(x.n, 0))) order by d)
        from generate_series(0, 6) d
        left join (select extract(dow from quando at time zone 'America/Sao_Paulo')::int as dd, count(*) as n
                     from _rel_c where chegada group by 1) x on x.dd = d
    ),
    'gostos', jsonb_build_object(
      'musica', (
        select coalesce(jsonb_agg(jsonb_build_object('valor', valor, 'n', public.rel_n(n)) order by n desc), '[]'::jsonb)
          from (select v.valor, count(distinct pp.user_id) as n
                  from _rel_p p join public.perfil_privado pp on pp.user_id = p.user_id
                  cross join lateral jsonb_array_elements_text(case when jsonb_typeof(pp.gostos->'musica') = 'array' then pp.gostos->'musica' else '[]'::jsonb end) v(valor)
                 group by v.valor having count(distinct pp.user_id) >= 10
                 order by n desc limit 10) g
      ),
      'experiencia', (
        select coalesce(jsonb_agg(jsonb_build_object('valor', valor, 'n', public.rel_n(n)) order by n desc), '[]'::jsonb)
          from (select v.valor, count(distinct pp.user_id) as n
                  from _rel_p p join public.perfil_privado pp on pp.user_id = p.user_id
                  cross join lateral jsonb_array_elements_text(case when jsonb_typeof(pp.gostos->'experiencia') = 'array' then pp.gostos->'experiencia' else '[]'::jsonb end) v(valor)
                 group by v.valor having count(distinct pp.user_id) >= 10
                 order by n desc limit 10) g
      ),
      'responderam', public.rel_n((select count(*) from _rel_p p join public.perfil_privado pp on pp.user_id = p.user_id
                                    where pp.gostos ?| array['musica', 'experiencia']))
    ),
    'genero', jsonb_build_object(
      'consentiram', public.rel_n((select count(*) from _rel_p p join public.perfil_privado pp on pp.user_id = p.user_id
                                    where pp.consentimento_relatorio_genero and nullif(trim(pp.identidade_genero), '') is not null)),
      'grupos', (
        select coalesce(jsonb_agg(jsonb_build_object('valor', valor, 'n', public.rel_n(n)) order by n desc), '[]'::jsonb)
          from (select trim(pp.identidade_genero) as valor, count(*) as n
                  from _rel_p p join public.perfil_privado pp on pp.user_id = p.user_id
                 where pp.consentimento_relatorio_genero and nullif(trim(pp.identidade_genero), '') is not null
                 group by 1 having count(*) >= 10) g
      ),
      'outros_ocultos', exists (
        select 1 from _rel_p p join public.perfil_privado pp on pp.user_id = p.user_id
         where pp.consentimento_relatorio_genero and nullif(trim(pp.identidade_genero), '') is not null
         group by trim(pp.identidade_genero) having count(*) < 10)
    ),
    -- Orientação sexual: SÓ para o admin (PDF para a marca) e só de quem deu o consentimento próprio (115).
    'orientacao', case when public.is_admin() then jsonb_build_object(
      'consentiram', public.rel_n((select count(*) from _rel_p p join public.perfil_privado pp on pp.user_id = p.user_id
                                    where pp.consentimento_relatorio_orientacao and nullif(trim(pp.orientacao_sexual), '') is not null)),
      'grupos', (
        select coalesce(jsonb_agg(jsonb_build_object('valor', valor, 'n', public.rel_n(n)) order by n desc), '[]'::jsonb)
          from (select trim(pp.orientacao_sexual) as valor, count(*) as n
                  from _rel_p p join public.perfil_privado pp on pp.user_id = p.user_id
                 where pp.consentimento_relatorio_orientacao and nullif(trim(pp.orientacao_sexual), '') is not null
                 group by 1 having count(*) >= 10) g
      ),
      'outros_ocultos', exists (
        select 1 from _rel_p p join public.perfil_privado pp on pp.user_id = p.user_id
         where pp.consentimento_relatorio_orientacao and nullif(trim(pp.orientacao_sexual), '') is not null
         group by trim(pp.orientacao_sexual) having count(*) < 10)
    ) else null end,
    'totais', jsonb_build_object(
      'checkins', public.rel_n((select count(*) from _rel_c where origem = 'checkin')),
      'lista_pedidos', public.rel_n((
        select count(*) from public.listas_vip_solicitacoes s
          join public.listas_vip l on l.id = s.lista_vip_id join public.eventos e on e.id = l.evento_id
         where e.local_id = v_local
           and case when p_evento is not null then e.id = p_evento else e.data_inicio >= v_ini and e.data_inicio < v_fim end)),
      'lista_aprovados', public.rel_n((select count(*) from _rel_c where origem in ('lista_aprovada', 'lista_entrou'))),
      'lista_entraram', public.rel_n((select count(*) from _rel_c where origem = 'lista_entrou')),
      'cupons_usados', public.rel_n((select count(*) from _rel_c where origem = 'cupom')),
      'eu_vou', public.rel_n((select count(*) from _rel_c where origem = 'eu_vou'))
    )
  ) into v_res;

  return v_res;
end;
$$;

revoke execute on function public.relatorio_publico(uuid, uuid, date, date) from public, anon;
grant execute on function public.relatorio_publico(uuid, uuid, date, date) to authenticated;

-- Conferência:
select column_name from information_schema.columns
 where table_schema = 'public' and table_name = 'perfil_privado' and column_name like 'consentimento_relatorio%' order by 1;
