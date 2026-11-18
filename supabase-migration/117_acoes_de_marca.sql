-- 117 — Ações de marca: medir campanhas de patrocinadores (ex.: "Happy hour Skol, nov/26") — 15/11/2026.
--
-- 1) acoes_marca: a campanha (marca, nome, período, investimento, objetivo, pergunta da pesquisa).
-- 2) Etiqueta da campanha em cupons, festas (eventos) e banners (banners_app): coluna acao_marca_id.
-- 3) Opt-in separado "ofertas de marcas parceiras" em push_preferencias (padrão: não).
-- 4) Pesquisa de 1 pergunta depois da ação: acoes_marca_respostas + pesquisa_marca_pendente() + responder_pesquisa_marca().
-- 5) relatorio_acao_marca(): funil (viu → clicou → se interessou → converteu → FOI) + custo por presença +
--    perfil somado de quem foi. Só admin. Mesmas proteções da 114: menos de 10 vira "menos de 10",
--    números arredondados de 5 em 5, perfil só com 30+ pessoas, gênero/orientação só com consentimento próprio.
-- Seguro rodar mais de uma vez. Rode depois da 116.

-- 1) Campanhas ----------------------------------------------------------------------------------------------
create table if not exists public.acoes_marca (
  id uuid primary key default gen_random_uuid(),
  marca text not null,
  nome text not null,
  inicio date not null,
  fim date not null,
  investimento numeric(12, 2),
  objetivo text,
  pesquisa_pergunta text,
  pesquisa_opcoes text[],
  ativa boolean not null default true,
  created_at timestamptz not null default now(),
  criado_por uuid default auth.uid(),
  constraint acoes_marca_periodo check (fim >= inicio),
  constraint acoes_marca_opcoes check (pesquisa_opcoes is null or array_length(pesquisa_opcoes, 1) between 2 and 6)
);
alter table public.acoes_marca enable row level security;
drop policy if exists acoes_marca_admin on public.acoes_marca;
create policy acoes_marca_admin on public.acoes_marca for all using (public.is_admin()) with check (public.is_admin());

-- 2) Etiqueta da campanha -----------------------------------------------------------------------------------
alter table public.cupons      add column if not exists acao_marca_id uuid references public.acoes_marca(id) on delete set null;
alter table public.eventos     add column if not exists acao_marca_id uuid references public.acoes_marca(id) on delete set null;
alter table public.banners_app add column if not exists acao_marca_id uuid references public.acoes_marca(id) on delete set null;
create index if not exists cupons_acao_marca_idx      on public.cupons(acao_marca_id)      where acao_marca_id is not null;
create index if not exists eventos_acao_marca_idx     on public.eventos(acao_marca_id)     where acao_marca_id is not null;
create index if not exists banners_app_acao_marca_idx on public.banners_app(acao_marca_id) where acao_marca_id is not null;

-- 3) Opt-in de ofertas de marcas parceiras (separado dos outros avisos) -------------------------------------
alter table public.push_preferencias add column if not exists marcas boolean not null default false;
alter table public.push_preferencias add column if not exists marcas_em timestamptz;
comment on column public.push_preferencias.marcas is
  'Quero receber ofertas e convites de marcas parceiras do Dicas LGBT+. O envio é feito pelo Dicas; meus dados não são passados às marcas.';

-- 4) Pesquisa de 1 pergunta ---------------------------------------------------------------------------------
create table if not exists public.acoes_marca_respostas (
  acao_id uuid not null references public.acoes_marca(id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  resposta text,           -- null = "prefiro não responder" (não pergunta de novo)
  created_at timestamptz not null default now(),
  primary key (acao_id, user_id)
);
alter table public.acoes_marca_respostas enable row level security;
drop policy if exists acoes_marca_respostas_dono on public.acoes_marca_respostas;
create policy acoes_marca_respostas_dono on public.acoes_marca_respostas for select using (auth.uid() = user_id or public.is_admin());

-- Pessoas que FORAM numa ação (presença comprovada): cupom da ação usado, check-in validado com cupom da ação,
-- ou entrada pela Lista VIP numa festa da ação.
create or replace function public.presentes_da_acao(p_acao uuid)
returns table (user_id uuid, quando timestamptz, origem text)
language sql stable security definer set search_path = public as $$
  with a as (
    select id, (inicio::timestamp at time zone 'America/Sao_Paulo') as ini,
           ((fim + 1)::timestamp at time zone 'America/Sao_Paulo') as fim
      from public.acoes_marca where id = p_acao
  )
  select r.user_id, r.resgatado_em, 'cupom'
    from public.cupons_resgatados r join public.cupons c on c.id = r.cupom_id, a
   where c.acao_marca_id = a.id and r.resgatado_em >= a.ini and r.resgatado_em < a.fim
  union all
  select ck.user_id, ck.validado_em, 'checkin'
    from public.checkins ck join public.cupons c on c.id = ck.cupom_id, a
   where c.acao_marca_id = a.id and ck.validado_em is not null and ck.cancelado_em is null
     and ck.validado_em >= a.ini and ck.validado_em < a.fim
  union all
  select s.user_id, coalesce(s.check_in_em, e.data_inicio), 'lista'
    from public.listas_vip_solicitacoes s
    join public.listas_vip l on l.id = s.lista_vip_id
    join public.eventos e on e.id = l.evento_id, a
   where e.acao_marca_id = a.id and s.status::text = 'check_in';
$$;
revoke execute on function public.presentes_da_acao(uuid) from public, anon, authenticated;

-- A pesquisa pendente da pessoa logada: ação com pergunta, em que ela FOI nos últimos 14 dias e ainda não respondeu.
create or replace function public.pesquisa_marca_pendente()
returns table (acao_id uuid, marca text, pergunta text, opcoes text[])
language plpgsql stable security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then return; end if;
  return query
    select am.id, am.marca, am.pesquisa_pergunta, am.pesquisa_opcoes
      from public.acoes_marca am
     where am.pesquisa_pergunta is not null and am.pesquisa_opcoes is not null
       and current_date <= am.fim + 14
       and not exists (select 1 from public.acoes_marca_respostas r where r.acao_id = am.id and r.user_id = v_uid)
       and exists (select 1 from public.presentes_da_acao(am.id) p where p.user_id = v_uid
                    and p.quando > now() - interval '14 days' and p.quando < now() - interval '2 hours')
     order by am.fim desc
     limit 1;
end;
$$;
revoke execute on function public.pesquisa_marca_pendente() from public, anon;
grant execute on function public.pesquisa_marca_pendente() to authenticated;

create or replace function public.responder_pesquisa_marca(p_acao uuid, p_resposta text)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_opcoes text[];
begin
  if v_uid is null then raise exception 'Entre na sua conta.'; end if;
  select pesquisa_opcoes into v_opcoes from public.acoes_marca where id = p_acao;
  if not found then raise exception 'Pesquisa não encontrada.'; end if;
  if p_resposta is not null and not (p_resposta = any(v_opcoes)) then raise exception 'Resposta inválida.'; end if;
  if not exists (select 1 from public.presentes_da_acao(p_acao) p where p.user_id = v_uid) then
    raise exception 'Esta pesquisa é só para quem participou.';
  end if;
  insert into public.acoes_marca_respostas (acao_id, user_id, resposta) values (p_acao, v_uid, p_resposta)
  on conflict (acao_id, user_id) do nothing;
end;
$$;
revoke execute on function public.responder_pesquisa_marca(uuid, text) from public, anon;
grant execute on function public.responder_pesquisa_marca(uuid, text) to authenticated;

-- 5) Relatório da ação (só admin) ---------------------------------------------------------------------------
create or replace function public.relatorio_acao_marca(p_acao uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_a public.acoes_marca;
  v_ini timestamptz;
  v_fim timestamptz;
  v_presentes int;
  v_res jsonb;
begin
  if not public.is_admin() then raise exception 'Só a equipe Dicas vê o relatório de ações de marca.' using errcode = '42501'; end if;
  select * into v_a from public.acoes_marca where id = p_acao;
  if not found then raise exception 'Ação não encontrada.'; end if;
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
    'acao', to_jsonb(v_a) - 'criado_por',
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
    'orientacao', jsonb_build_object(
      'consentiram', public.rel_n((select count(*) from _am_u u join public.perfil_privado pp on pp.user_id = u.user_id
                                    where pp.consentimento_relatorio_orientacao and nullif(trim(pp.orientacao_sexual), '') is not null)),
      'grupos', (select coalesce(jsonb_agg(jsonb_build_object('valor', valor, 'n', public.rel_n(n)) order by n desc), '[]')
                   from (select trim(pp.orientacao_sexual) valor, count(*) n from _am_u u join public.perfil_privado pp on pp.user_id = u.user_id
                          where pp.consentimento_relatorio_orientacao and nullif(trim(pp.orientacao_sexual), '') is not null
                          group by 1 having count(*) >= 10) g)
    )
  ));
end;
$$;
revoke execute on function public.relatorio_acao_marca(uuid) from public, anon;
grant execute on function public.relatorio_acao_marca(uuid) to authenticated;

-- Conferência
select 'acoes_marca' as tabela, count(*) from public.acoes_marca
union all select 'cupons com ação', count(*) from public.cupons where acao_marca_id is not null;
