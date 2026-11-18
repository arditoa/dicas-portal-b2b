-- 129 — Enquete da casa com prêmio: "Responda e ganhe 1 drink" (15/11/2026). Rode depois da 128.
-- * Casas Premium/Fundador criam uma enquete (1 a 5 perguntas: opções / nota 0–10 / texto) com um prêmio.
-- * A pessoa responde no app (pode ser de casa). O prêmio só sai NA CASA: "Estou aqui · pegar meu prêmio"
--   confere a localização e a fila. 1 resposta e 1 prêmio por pessoa por enquete.
-- * limite_total: "para os primeiros N" prêmios. O público vê só "Restam X".
-- * A casa vê as respostas somadas; textos livres sem nome, a partir de 5 respostas.
-- Seguro rodar mais de uma vez.

create table if not exists public.enquetes_casa (
  id uuid primary key default gen_random_uuid(),
  local_id uuid not null references public.locais(id) on delete cascade,
  titulo text not null check (char_length(titulo) between 3 and 80),
  premio text not null check (char_length(premio) between 2 and 60),
  regra text check (regra is null or char_length(regra) <= 120),
  perguntas jsonb not null check (jsonb_typeof(perguntas) = 'array' and jsonb_array_length(perguntas) between 1 and 5),
  limite_total integer check (limite_total is null or limite_total between 1 and 100000),
  inicio date not null default ((now() at time zone 'America/Sao_Paulo')::date),
  fim date not null,
  ativa boolean not null default true,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  constraint enquetes_casa_periodo check (fim >= inicio)
);
create index if not exists enquetes_casa_local_idx on public.enquetes_casa(local_id, fim desc);
alter table public.enquetes_casa enable row level security;

drop policy if exists enquetes_casa_ver on public.enquetes_casa;
create policy enquetes_casa_ver on public.enquetes_casa for select using (
  public.is_admin() or public.pode_no_local(local_id, 'cupons') or public.pode_no_local(local_id, 'resultados'));
drop policy if exists enquetes_casa_criar on public.enquetes_casa;
create policy enquetes_casa_criar on public.enquetes_casa for insert with check (
  (public.is_admin() or public.pode_no_local(local_id, 'cupons')) and public.local_premium_ativo(local_id));
drop policy if exists enquetes_casa_editar on public.enquetes_casa;
create policy enquetes_casa_editar on public.enquetes_casa for update using (public.is_admin() or public.pode_no_local(local_id, 'cupons'))
  with check (public.is_admin() or public.pode_no_local(local_id, 'cupons'));

create table if not exists public.enquetes_respostas (
  id bigint generated always as identity primary key,
  enquete_id uuid not null references public.enquetes_casa(id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  respostas jsonb not null,
  premio_em timestamptz,          -- quando pegou o prêmio na casa
  premio_numero integer,          -- ordem de quem pegou
  created_at timestamptz not null default now(),
  unique (enquete_id, user_id)
);
alter table public.enquetes_respostas enable row level security;
drop policy if exists enquetes_respostas_dono on public.enquetes_respostas;
create policy enquetes_respostas_dono on public.enquetes_respostas for select using (auth.uid() = user_id);
-- Gravar só pelas funções abaixo.

-- Enquete no ar numa casa (público). Sem as perguntas de quem não está logado? Mostra tudo: é para responder.
create or replace function public.enquete_da_casa(p_local uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object('id', e.id, 'titulo', e.titulo, 'premio', e.premio, 'regra', e.regra, 'perguntas', e.perguntas, 'fim', e.fim,
    'restam', case when e.limite_total is null then null
                   else greatest(e.limite_total - (select count(*) from public.enquetes_respostas r where r.enquete_id = e.id and r.premio_em is not null), 0) end)
  from public.enquetes_casa e
  where e.local_id = p_local and e.ativa and public.local_premium_ativo(e.local_id)
    and (now() at time zone 'America/Sao_Paulo')::date between e.inicio and e.fim
  order by e.created_at desc limit 1;
$$;
revoke execute on function public.enquete_da_casa(uuid) from public;
grant execute on function public.enquete_da_casa(uuid) to anon, authenticated;

-- Minha situação: respondi? peguei o prêmio?
create or replace function public.minha_enquete_casa(p_enquete uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object('respondeu', true, 'premio_em', r.premio_em, 'numero', r.premio_numero)
    from public.enquetes_respostas r where r.enquete_id = p_enquete and r.user_id = auth.uid();
$$;
revoke execute on function public.minha_enquete_casa(uuid) from public, anon;
grant execute on function public.minha_enquete_casa(uuid) to authenticated;

-- Responder (pode ser de casa). p_respostas = {"<id>": "opção" | número 0–10 | "texto"}
create or replace function public.responder_enquete_casa(p_enquete uuid, p_respostas jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare
  v public.enquetes_casa;
  q jsonb; x jsonb;
  limpo jsonb := '{}'::jsonb;
begin
  if auth.uid() is null then raise exception 'Entre na sua conta para responder.' using errcode = '42501'; end if;
  select * into v from public.enquetes_casa where id = p_enquete and ativa
     and (now() at time zone 'America/Sao_Paulo')::date between inicio and fim;
  if not found then raise exception 'Esta enquete não está mais no ar.'; end if;
  for q in select * from jsonb_array_elements(v.perguntas) loop
    x := p_respostas -> (q->>'id');
    continue when x is null or x = 'null'::jsonb;
    if q->>'tipo' = 'escolha' and jsonb_typeof(x) = 'string' and (q->'opcoes') ? (x #>> '{}') then
      limpo := limpo || jsonb_build_object(q->>'id', x);
    elsif q->>'tipo' = 'nota' and jsonb_typeof(x) = 'number' and (x #>> '{}')::numeric between 0 and 10 then
      limpo := limpo || jsonb_build_object(q->>'id', round((x #>> '{}')::numeric));
    elsif q->>'tipo' = 'aberta' and jsonb_typeof(x) = 'string' and char_length(btrim(x #>> '{}')) > 0 then
      limpo := limpo || jsonb_build_object(q->>'id', left(btrim(x #>> '{}'), 500));
    end if;
  end loop;
  if limpo = '{}'::jsonb then raise exception 'Responda pelo menos uma pergunta.'; end if;
  insert into public.enquetes_respostas (enquete_id, user_id, respostas) values (p_enquete, auth.uid(), limpo)
  on conflict (enquete_id, user_id) do nothing;
end;
$$;
revoke execute on function public.responder_enquete_casa(uuid, jsonb) from public, anon;
grant execute on function public.responder_enquete_casa(uuid, jsonb) to authenticated;

-- Pegar o prêmio na casa. status: 'ok' | 'ja' | 'esgotado' | 'nao_respondeu' | 'sem_local' | 'longe'
create or replace function public.pegar_premio_enquete(p_enquete uuid, p_lat double precision default null, p_lng double precision default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v public.enquetes_casa;
  r public.enquetes_respostas;
  v_lat double precision; v_lng double precision; v_raio integer; v_n integer;
begin
  if auth.uid() is null then raise exception 'Entre na sua conta.' using errcode = '42501'; end if;
  select * into v from public.enquetes_casa where id = p_enquete and ativa
     and (now() at time zone 'America/Sao_Paulo')::date between inicio and fim;
  if not found then raise exception 'Esta enquete não está mais no ar.'; end if;
  select * into r from public.enquetes_respostas where enquete_id = p_enquete and user_id = auth.uid();
  if not found then return jsonb_build_object('status', 'nao_respondeu'); end if;
  if r.premio_em is not null then return jsonb_build_object('status', 'ja', 'numero', r.premio_numero, 'quando', r.premio_em); end if;
  select lat, lng into v_lat, v_lng from public.locais where id = v.local_id;
  if v_lat is not null and v_lng is not null then
    if p_lat is null or p_lng is null then return jsonb_build_object('status', 'sem_local'); end if;
    select coalesce(nullif(valor, '')::integer, 150) into v_raio from public.app_config where chave = 'checkin_raio_m';
    if public.distancia_metros(p_lat, p_lng, v_lat, v_lng) > coalesce(v_raio, 150) * 2 then return jsonb_build_object('status', 'longe'); end if;
  end if;
  perform pg_advisory_xact_lock(hashtext('enquete:' || p_enquete::text));
  select count(*) into v_n from public.enquetes_respostas where enquete_id = p_enquete and premio_em is not null;
  if v.limite_total is not null and v_n >= v.limite_total then return jsonb_build_object('status', 'esgotado'); end if;
  update public.enquetes_respostas set premio_em = now(), premio_numero = v_n + 1 where id = r.id;
  return jsonb_build_object('status', 'ok', 'numero', v_n + 1, 'quando', now());
end;
$$;
revoke execute on function public.pegar_premio_enquete(uuid, double precision, double precision) from public, anon;
grant execute on function public.pegar_premio_enquete(uuid, double precision, double precision) to authenticated;

-- Resultado para a casa (somado; textos sem nome a partir de 5 respostas)
create or replace function public.resultado_enquete_casa(p_enquete uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v public.enquetes_casa;
  q jsonb; item jsonb; saida jsonb := '[]'::jsonb; v_total integer;
begin
  select * into v from public.enquetes_casa where id = p_enquete;
  if not found then raise exception 'Enquete não encontrada.'; end if;
  if not public.is_admin() and not public.pode_no_local(v.local_id, 'resultados') and not public.pode_no_local(v.local_id, 'cupons') then
    raise exception 'Sem acesso ao resultado.' using errcode = '42501';
  end if;
  select count(*) into v_total from public.enquetes_respostas where enquete_id = p_enquete;
  for q in select * from jsonb_array_elements(v.perguntas) loop
    if q->>'tipo' = 'escolha' then
      item := jsonb_build_object('id', q->>'id', 'texto', q->>'texto', 'tipo', 'escolha',
        'responderam', (select count(*) from public.enquetes_respostas r where r.enquete_id = p_enquete and r.respostas ? (q->>'id')),
        'opcoes', (select coalesce(jsonb_agg(jsonb_build_object('valor', o, 'n', (select count(*) from public.enquetes_respostas r
                      where r.enquete_id = p_enquete and r.respostas->>(q->>'id') = o)) order by ord), '[]'::jsonb)
                   from jsonb_array_elements_text(q->'opcoes') with ordinality t(o, ord)));
    elsif q->>'tipo' = 'nota' then
      item := jsonb_build_object('id', q->>'id', 'texto', q->>'texto', 'tipo', 'nota',
        'responderam', (select count(*) from public.enquetes_respostas r where r.enquete_id = p_enquete and r.respostas ? (q->>'id')),
        'media', (select round(avg((r.respostas->>(q->>'id'))::numeric), 1) from public.enquetes_respostas r where r.enquete_id = p_enquete and r.respostas ? (q->>'id')));
    else
      item := jsonb_build_object('id', q->>'id', 'texto', q->>'texto', 'tipo', 'aberta',
        'responderam', (select count(*) from public.enquetes_respostas r where r.enquete_id = p_enquete and r.respostas ? (q->>'id')),
        'textos', case when v_total >= 5 or public.is_admin() then
                    (select coalesce(jsonb_agg(t.txt), '[]'::jsonb) from (select r.respostas->>(q->>'id') as txt from public.enquetes_respostas r
                       where r.enquete_id = p_enquete and r.respostas ? (q->>'id') order by random() limit 100) t)
                  else null end);
    end if;
    saida := saida || jsonb_build_array(item);
  end loop;
  return jsonb_build_object('responderam', v_total,
    'premios', (select count(*) from public.enquetes_respostas where enquete_id = p_enquete and premio_em is not null),
    'perguntas', saida);
end;
$$;
revoke execute on function public.resultado_enquete_casa(uuid) from public, anon;
grant execute on function public.resultado_enquete_casa(uuid) to authenticated;

-- Conferência
select to_regclass('public.enquetes_casa') as enquetes, to_regclass('public.enquetes_respostas') as respostas;
