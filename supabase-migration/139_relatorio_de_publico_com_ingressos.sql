-- 139 — Relatório de público com ingressos e Termômetro (16/11/2026). Rode depois da 136 (usa termometro_sinais).
-- Seguro rodar mais de uma vez.
--
-- Pedido da Andrea: "a casa faz o evento, vende ingresso, QR na entrada e depois a base de quem foi: faixa etária etc.
-- Importante nos check-ins e na venda de ingresso a casa saber o perfil das pessoas."
-- O relatório "Seu público" (114/115) passa a contar também:
--   * quem comprou ingresso e quem entrou com o QR (horário de chegada = leitura na porta);
--   * "Estou aqui agora" do Termômetro da noite (136) e "Estou aqui" de ações de marca (126).
-- Mesmas proteções: só números somados; mínimo de 30 pessoas; grupo com menos de 10 vira "menos de 10";
-- arredondado de 5 em 5; gênero só de quem autorizou; orientação só no /admin e com consentimento próprio (115).
-- Nunca lista de nomes ou contatos de quem comprou (a lista de compradores do ingresso mostra só o nome no ingresso).
--
-- "Toda ação gera dados" (Andrea): entram também quem respondeu enquete da casa (129) e reservas confirmadas (102;
-- "compareceu" conta como chegada). E o relatório pode ser filtrado POR AÇÃO (p_origem):
--   'checkin' · 'lista' · 'cupom' · 'eu_vou' · 'ingresso' · 'estou_aqui' · 'marca' · 'enquete' · 'reserva'
-- Ex.: só quem comprou ingresso desta festa; só quem respondeu a enquete; só quem reservou mesa no mês.
-- As mesmas proteções valem dentro do filtro (mínimo de 30 pessoas no recorte).

drop function if exists public.relatorio_publico(uuid, uuid, date, date);

create or replace function public.relatorio_publico(p_local uuid default null, p_evento uuid default null, p_de date default null, p_ate date default null, p_origem text default null)
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
    'de', v_de, 'ate', v_ate, 'gerado_em', now(), 'acao', p_origem,
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

  -- 139: ingressos (comprou e entrou), "Estou aqui agora" do Termômetro e "Estou aqui" de ação de marca
  insert into _rel_c
    select i.user_id, coalesce(i.usado_em, i.created_at),
           case when i.status = 'usado' then 'ingresso_entrou' else 'ingresso_comprado' end,
           i.status = 'usado' and i.usado_em is not null
      from public.ingressos i join public.eventos e on e.id = i.evento_id
     where e.local_id = v_local and i.status in ('valido', 'usado') and not coalesce(i.cortesia_resgatar, false)
       and case when p_evento is not null then e.id = p_evento else e.data_inicio >= v_ini and e.data_inicio < v_fim end;

  insert into _rel_c
    select t.user_id, t.criado_em, 'estou_aqui', true
      from public.termometro_sinais t
     where t.local_id = v_local and t.criado_em >= v_ini and t.criado_em < v_fim;

  insert into _rel_c
    select p.user_id, p.created_at, 'marca', true
      from public.acoes_marca_presencas p
     where p.local_id = v_local and p.created_at >= v_ini and p.created_at < v_fim;

  insert into _rel_c
    select r.user_id, r.created_at, 'enquete', false
      from public.enquetes_respostas r join public.enquetes_casa q on q.id = r.enquete_id
     where q.local_id = v_local and r.created_at >= v_ini and r.created_at < v_fim;

  insert into _rel_c
    select r.user_id, (r.data + r.horario) at time zone 'America/Sao_Paulo', 'reserva', r.status = 'compareceu'
      from public.reservas r
     where r.local_id = v_local and r.status in ('confirmada', 'compareceu')
       and (r.data + r.horario) at time zone 'America/Sao_Paulo' >= v_ini and (r.data + r.horario) at time zone 'America/Sao_Paulo' < v_fim;

  -- Filtro por ação (ex.: 'ingresso' pega ingresso_comprado e ingresso_entrou; 'lista' pega lista_aprovada e lista_entrou)
  if p_origem is not null then
    if p_origem not in ('checkin', 'lista', 'cupom', 'eu_vou', 'ingresso', 'estou_aqui', 'marca', 'enquete', 'reserva') then
      raise exception 'Ação desconhecida: %', p_origem using errcode = '22023';
    end if;
    delete from _rel_c where not (origem = p_origem or origem like p_origem || '\_%');
  end if;

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
            or exists (select 1 from public.ingressos i join public.eventos e on e.id = i.evento_id
                        where i.user_id = u.user_id and e.local_id = v_local and i.status = 'usado' and i.usado_em < v_ini)
            or exists (select 1 from public.termometro_sinais t where t.user_id = u.user_id and t.local_id = v_local and t.criado_em < v_ini)
            or exists (select 1 from public.reservas r where r.user_id = u.user_id and r.local_id = v_local and r.status = 'compareceu' and r.data < v_de)
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
      'eu_vou', public.rel_n((select count(*) from _rel_c where origem = 'eu_vou')),
      -- 139: ingressos contados por ingresso (não por pessoa); entrada = QR lido na porta
      'ingressos_vendidos', public.rel_n((select count(*) from _rel_c where origem in ('ingresso_comprado', 'ingresso_entrou'))),
      'ingressos_entraram', public.rel_n((select count(*) from _rel_c where origem = 'ingresso_entrou')),
      'estou_aqui', public.rel_n((select count(*) from _rel_c where origem = 'estou_aqui')),
      'enquetes_respondidas', public.rel_n((select count(*) from _rel_c where origem = 'enquete')),
      'reservas', public.rel_n((select count(*) from _rel_c where origem = 'reserva')),
      'reservas_vieram', public.rel_n((select count(*) from _rel_c where origem = 'reserva' and chegada))
    )
  ) into v_res;

  return v_res;
end;
$$;

revoke execute on function public.relatorio_publico(uuid, uuid, date, date, text) from public, anon;
grant execute on function public.relatorio_publico(uuid, uuid, date, date, text) to authenticated;
