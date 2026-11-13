-- 113 — Comunidade, fase 1: "Eu vou" (13/11/2026).
--
-- O que entra:
--   * presencas: a pessoa marca "Eu vou" numa FESTA (eventos) ou num ITEM DA AGENDA do bar (agenda_semanal + a data).
--     "aparecer" começa DESLIGADO (invisível por padrão). A presença expira no fim do evento
--     (festa: data_fim, ou início + 8h; agenda: 6h da manhã do dia seguinte, horário de Brasília).
--     Depois de expirar, ninguém mais vê nada dela no app; ela fica só como histórico da própria pessoa
--     (e entra, somada e anônima, no Relatório de público da migração 114). A pessoa apaga tudo em Conta.
--   * Só maiores de 18 (profiles.birth_date): para marcar "Eu vou" e para ver rostos.
--   * Rostos: só de quem ligou "aparecer"; primeiro nome + foto; até 8 e "+N". Quem bloqueou ou foi bloqueado
--     (tabela bloqueios, nos dois sentidos) não se vê. Suspensos pela equipe não aparecem.
--   * denuncias_comunidade: fila NOVA no /admin ("Denúncias da comunidade"), separada das ocorrências.
--   * comunidade_suspensos: a equipe tira a pessoa da comunidade (não aparece mais, não liga "aparecer").
--   * Fotos: o bucket avatares é privado (057). Nova regra de leitura: dá para ver a foto de quem está
--     aparecendo numa presença que ainda não expirou, se não houver bloqueio e quem olha tiver 18+.
--
-- Tudo o que o app grava passa por funções (marcar_eu_vou, desmarcar_eu_vou, apagar_historico_presenca):
-- a tabela presencas só deixa cada pessoa LER as próprias linhas. Contagens e rostos saem por funções que
-- devolvem só o necessário. Seguro rodar mais de uma vez. Rode depois da 099 (uuid_ou_nulo, pode_no_local).

-- 0) Ajudantes ---------------------------------------------------------------------------------------------
create or replace function public.maior_de_18(p_user uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles p
     where p.id = p_user and p.birth_date is not null
       and p.birth_date <= (current_date - interval '18 years')
  );
$$;

create or replace function public.hoje_brasilia()
returns date language sql stable as $$ select (now() at time zone 'America/Sao_Paulo')::date; $$;

-- 1) Tabelas ----------------------------------------------------------------------------------------------
create table if not exists public.presencas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  evento_id uuid references public.eventos(id) on delete cascade,
  agenda_id uuid references public.agenda_semanal(id) on delete cascade,
  local_id uuid references public.locais(id) on delete cascade,
  data date not null,                       -- dia do evento (Brasília)
  aparecer boolean not null default false,  -- invisível por padrão
  expira_em timestamptz not null,           -- fim do evento
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint presencas_um_alvo check (num_nonnulls(evento_id, agenda_id) = 1)
);
create unique index if not exists presencas_festa_unica on public.presencas (user_id, evento_id) where evento_id is not null;
create unique index if not exists presencas_agenda_unica on public.presencas (user_id, agenda_id, data) where agenda_id is not null;
create index if not exists presencas_evento_idx on public.presencas (evento_id, expira_em) where evento_id is not null;
create index if not exists presencas_agenda_idx on public.presencas (agenda_id, data) where agenda_id is not null;
create index if not exists presencas_local_idx on public.presencas (local_id, data);

alter table public.presencas enable row level security;
drop policy if exists "presencas_select_proprio" on public.presencas;
create policy "presencas_select_proprio" on public.presencas for select to authenticated using (user_id = auth.uid());
-- Sem insert/update/delete direto: só pelas funções abaixo.

create table if not exists public.comunidade_suspensos (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  motivo text,
  criado_por uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.comunidade_suspensos enable row level security;
drop policy if exists "comunidade_suspensos_admin" on public.comunidade_suspensos;
create policy "comunidade_suspensos_admin" on public.comunidade_suspensos for all using (public.is_admin()) with check (public.is_admin());

create table if not exists public.denuncias_comunidade (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid default auth.uid() references public.profiles(id) on delete set null,
  denunciado_id uuid not null references public.profiles(id) on delete cascade,
  evento_id uuid references public.eventos(id) on delete set null,
  agenda_id uuid references public.agenda_semanal(id) on delete set null,
  data date,
  motivo text not null check (motivo in ('assedio', 'perfil_falso', 'foto_impropria', 'menor_de_idade', 'ameaca', 'outro')),
  descricao text check (descricao is null or char_length(descricao) <= 500),
  status text not null default 'aberta' check (status in ('aberta', 'em_analise', 'resolvida', 'rejeitada')),
  nota_equipe text check (nota_equipe is null or char_length(nota_equipe) <= 500),
  created_at timestamptz not null default now(),
  resolvido_em timestamptz,
  resolvido_por uuid references public.profiles(id) on delete set null,
  constraint denuncias_comunidade_nao_a_si check (reporter_id is null or reporter_id <> denunciado_id)
);
create index if not exists denuncias_comunidade_fila on public.denuncias_comunidade (status, created_at);
alter table public.denuncias_comunidade enable row level security;
drop policy if exists "denuncias_comunidade_insert" on public.denuncias_comunidade;
create policy "denuncias_comunidade_insert" on public.denuncias_comunidade for insert to authenticated
  with check (reporter_id = auth.uid() and status = 'aberta' and nota_equipe is null and resolvido_em is null and resolvido_por is null);
drop policy if exists "denuncias_comunidade_select" on public.denuncias_comunidade;
create policy "denuncias_comunidade_select" on public.denuncias_comunidade for select to authenticated
  using (reporter_id = auth.uid() or public.is_admin());
drop policy if exists "denuncias_comunidade_update_admin" on public.denuncias_comunidade;
create policy "denuncias_comunidade_update_admin" on public.denuncias_comunidade for update
  using (public.is_admin()) with check (public.is_admin());

-- Até 20 denúncias por pessoa por dia (evita enxurrada).
create or replace function public.limitar_denuncias_comunidade()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.denuncias_comunidade
       where reporter_id = new.reporter_id and created_at > now() - interval '1 day') >= 20 then
    raise exception 'Você já enviou muitas denúncias hoje. Se for urgente, use Conta › Denunciar Ocorrência.';
  end if;
  return new;
end;
$$;
drop trigger if exists before_insert_denuncias_comunidade on public.denuncias_comunidade;
create trigger before_insert_denuncias_comunidade before insert on public.denuncias_comunidade
  for each row execute function public.limitar_denuncias_comunidade();

-- 2) Quem pode ver o rosto de quem -------------------------------------------------------------------------
create or replace function public.bloqueio_entre(a uuid, b uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.bloqueios
                  where (bloqueador_id = a and bloqueado_id = b) or (bloqueador_id = b and bloqueado_id = a));
$$;

-- p_user está aparecendo em alguma presença ativa e quem pergunta (auth.uid()) pode vê-lo?
create or replace function public.aparece_na_comunidade(p_user uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select p_user is not null and auth.uid() is not null
     and public.maior_de_18(auth.uid())
     and not public.bloqueio_entre(auth.uid(), p_user)
     and not exists (select 1 from public.comunidade_suspensos s where s.user_id = p_user)
     and exists (select 1 from public.presencas pr where pr.user_id = p_user and pr.aparecer and pr.expira_em > now());
$$;

drop policy if exists "avatares_ler_quem_aparece" on storage.objects;
create policy "avatares_ler_quem_aparece" on storage.objects for select to authenticated
  using (bucket_id = 'avatares' and public.aparece_na_comunidade(public.uuid_ou_nulo((storage.foldername(name))[1])));

-- A equipe vê a foto de quem foi denunciado (fila do /admin).
drop policy if exists "avatares_ler_admin" on storage.objects;
create policy "avatares_ler_admin" on storage.objects for select to authenticated
  using (bucket_id = 'avatares' and public.is_admin());

-- 3) Alvo: festa ou item da agenda numa data -----------------------------------------------------------------
-- Devolve local, dia e fim do evento; erro amigável se não dá para marcar.
create or replace function public.alvo_eu_vou(p_evento uuid, p_agenda uuid, p_data date,
  out o_local uuid, out o_data date, out o_expira timestamptz)
language plpgsql stable security definer set search_path = public as $$
declare
  ev record;
  ag record;
begin
  if (p_evento is null) = (p_agenda is null) then
    raise exception 'Escolha uma festa ou um item da agenda.';
  end if;
  if p_evento is not null then
    select e.local_id, e.data_inicio, coalesce(e.data_fim, e.data_inicio + interval '8 hours') as fim
      into ev from public.eventos e where e.id = p_evento and e.status = 'aprovado';
    if not found then raise exception 'Esta festa não está publicada.'; end if;
    o_local := ev.local_id;
    o_data := (ev.data_inicio at time zone 'America/Sao_Paulo')::date;
    o_expira := ev.fim;
  else
    select a.local_id, a.data, a.dia_semana, coalesce(a.tipo, 'dia') as tipo
      into ag from public.agenda_semanal a join public.locais l on l.id = a.local_id
     where a.id = p_agenda and a.ativo and l.status = 'aprovado';
    if not found or ag.tipo = 'semana' then raise exception 'Este item da agenda não está disponível.'; end if;
    if p_data is null then raise exception 'Falta a data do item da agenda.'; end if;
    if ag.data is not null and ag.data <> p_data then raise exception 'Este item da agenda é de outro dia.'; end if;
    if ag.data is null and extract(dow from p_data)::int <> ag.dia_semana then raise exception 'Este item da agenda é de outro dia da semana.'; end if;
    if p_data > public.hoje_brasilia() + 14 then raise exception 'Dá para marcar até 14 dias antes.'; end if;
    o_local := ag.local_id;
    o_data := p_data;
    o_expira := ((p_data + 1)::timestamp + time '06:00') at time zone 'America/Sao_Paulo';
  end if;
end;
$$;

-- 4) Resumo de um alvo: total, se eu vou e até 8 rostos -----------------------------------------------------
create or replace function public.resumo_eu_vou(p_evento uuid default null, p_agenda uuid default null, p_data date default null)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_eu uuid := auth.uid();
  v_total int;
  v_tem boolean;
  v_ap boolean;
  v_rostos jsonb := '[]'::jsonb;
begin
  select count(*) into v_total from public.presencas pr
   where pr.expira_em > now()
     and ((p_evento is not null and pr.evento_id = p_evento) or (p_agenda is not null and pr.agenda_id = p_agenda and pr.data = p_data));

  if v_eu is not null then
    select true, pr.aparecer into v_tem, v_ap from public.presencas pr
     where pr.user_id = v_eu and pr.expira_em > now()
       and ((p_evento is not null and pr.evento_id = p_evento) or (p_agenda is not null and pr.agenda_id = p_agenda and pr.data = p_data));
  end if;

  if v_eu is not null and public.maior_de_18(v_eu) then
    select coalesce(jsonb_agg(jsonb_build_object('id', x.user_id, 'nome', x.nome, 'foto', x.foto) order by x.eu desc, x.created_at), '[]'::jsonb)
      into v_rostos
      from (
        select pr.user_id, pr.created_at, (pr.user_id = v_eu) as eu,
               nullif(split_part(trim(coalesce(nullif(trim(p.social_name), ''), p.full_name, '')), ' ', 1), '') as nome,
               p.avatar_url as foto
          from public.presencas pr
          join public.profiles p on p.id = pr.user_id
         where pr.aparecer and pr.expira_em > now()
           and ((p_evento is not null and pr.evento_id = p_evento) or (p_agenda is not null and pr.agenda_id = p_agenda and pr.data = p_data))
           and not exists (select 1 from public.comunidade_suspensos s where s.user_id = pr.user_id)
           and (pr.user_id = v_eu or not public.bloqueio_entre(v_eu, pr.user_id))
         order by (pr.user_id = v_eu) desc, pr.created_at
         limit 8
      ) x;
  end if;

  return jsonb_build_object(
    'total', v_total,
    'eu_vou', coalesce(v_tem, false),
    'eu_apareco', coalesce(v_ap, false),
    'rostos', v_rostos,
    'mais', greatest(v_total - jsonb_array_length(v_rostos), 0),
    'posso_ver_rostos', v_eu is not null and public.maior_de_18(v_eu)
  );
end;
$$;

-- 5) Marcar / desmarcar ------------------------------------------------------------------------------------
create or replace function public.marcar_eu_vou(p_evento uuid default null, p_agenda uuid default null, p_data date default null, p_aparecer boolean default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_eu uuid := auth.uid();
  v_alvo record;
  v_aparecer boolean;
begin
  if v_eu is null then raise exception 'Entre na sua conta para marcar "Eu vou".' using errcode = '28000'; end if;
  if not public.maior_de_18(v_eu) then
    raise exception 'O "Eu vou" é só para maiores de 18. Confira sua data de nascimento em Conta.' using errcode = '42501';
  end if;
  select * into v_alvo from public.alvo_eu_vou(p_evento, p_agenda, p_data);
  if v_alvo.o_expira <= now() then raise exception 'Este evento já acabou.'; end if;
  -- Suspenso pela equipe: pode marcar, mas nunca aparece.
  v_aparecer := case when exists (select 1 from public.comunidade_suspensos s where s.user_id = v_eu) then false else p_aparecer end;

  if p_evento is not null then
    insert into public.presencas (user_id, evento_id, local_id, data, expira_em, aparecer)
    values (v_eu, p_evento, v_alvo.o_local, v_alvo.o_data, v_alvo.o_expira, coalesce(v_aparecer, false))
    on conflict (user_id, evento_id) where evento_id is not null
    do update set aparecer = coalesce(v_aparecer, presencas.aparecer), expira_em = excluded.expira_em,
                  data = excluded.data, local_id = excluded.local_id, updated_at = now();
  else
    insert into public.presencas (user_id, agenda_id, local_id, data, expira_em, aparecer)
    values (v_eu, p_agenda, v_alvo.o_local, v_alvo.o_data, v_alvo.o_expira, coalesce(v_aparecer, false))
    on conflict (user_id, agenda_id, data) where agenda_id is not null
    do update set aparecer = coalesce(v_aparecer, presencas.aparecer), expira_em = excluded.expira_em,
                  local_id = excluded.local_id, updated_at = now();
  end if;
  return public.resumo_eu_vou(p_evento, p_agenda, p_data);
end;
$$;

create or replace function public.desmarcar_eu_vou(p_evento uuid default null, p_agenda uuid default null, p_data date default null)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Entre na sua conta.' using errcode = '28000'; end if;
  delete from public.presencas pr
   where pr.user_id = auth.uid()
     and ((p_evento is not null and pr.evento_id = p_evento) or (p_agenda is not null and pr.agenda_id = p_agenda and pr.data = p_data));
  return public.resumo_eu_vou(p_evento, p_agenda, p_data);
end;
$$;

-- Conta › "Apagar meu histórico de presença": apaga TODAS as presenças da pessoa (inclusive as futuras).
create or replace function public.apagar_historico_presenca()
returns integer language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  if auth.uid() is null then raise exception 'Entre na sua conta.' using errcode = '28000'; end if;
  delete from public.presencas where user_id = auth.uid();
  get diagnostics n = row_count;
  return n;
end;
$$;

-- 6) Contagem para listas (cartões da agenda, faixa de festas) -----------------------------------------------
-- p_itens: [{"e": "<evento_id>"}, {"a": "<agenda_id>", "d": "2026-11-14"}] (até 200). chave: "e:<id>" ou "a:<id>:<data>".
create or replace function public.contar_eu_vou(p_itens jsonb)
returns table (chave text, total integer, eu boolean)
language sql stable security definer set search_path = public as $$
  with itens as (
    select (i->>'e')::uuid as e, (i->>'a')::uuid as a, (i->>'d')::date as d
      from jsonb_array_elements(coalesce(p_itens, '[]'::jsonb)) with ordinality t(i, n)
     where n <= 200
  )
  select case when it.e is not null then 'e:' || it.e else 'a:' || it.a || ':' || it.d end,
         count(pr.id)::integer,
         coalesce(bool_or(pr.user_id = auth.uid()), false)
    from itens it
    left join public.presencas pr
      on pr.expira_em > now()
     and ((it.e is not null and pr.evento_id = it.e) or (it.a is not null and pr.agenda_id = it.a and pr.data = it.d))
   group by it.e, it.a, it.d;
$$;

-- 7) Modo parceiro: "N vão" nas festas e na agenda da casa (só números, nunca quem) -------------------------
create or replace function public.eu_vou_do_local(p_local uuid)
returns table (evento_id uuid, agenda_id uuid, data date, total integer)
language plpgsql stable security definer set search_path = public as $$
begin
  if not (public.pode_no_local(p_local, 'festa') or public.pode_no_local(p_local, 'resultados')
          or public.pode_no_local(p_local, 'lista_vip') or public.pode_no_local(p_local, 'porta')) then
    raise exception 'Sem permissão para ver este local.' using errcode = '42501';
  end if;
  return query
    select pr.evento_id, pr.agenda_id, pr.data, count(*)::integer
      from public.presencas pr
     where pr.local_id = p_local and pr.expira_em > now()
     group by pr.evento_id, pr.agenda_id, pr.data;
end;
$$;

-- 8) /admin: fila de denúncias e suspensão ------------------------------------------------------------------
create or replace function public.fila_denuncias_comunidade(p_status text default 'abertas')
returns table (
  id uuid, created_at timestamptz, status text, motivo text, descricao text, nota_equipe text,
  denunciado_id uuid, denunciado_nome text, denunciado_foto text, denunciado_suspenso boolean, denuncias_contra integer,
  reporter_nome text, onde text, data date
)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Só a equipe Dicas.' using errcode = '42501'; end if;
  return query
    select d.id, d.created_at, d.status, d.motivo, d.descricao, d.nota_equipe,
           d.denunciado_id, coalesce(nullif(trim(pd.social_name), ''), pd.full_name), pd.avatar_url,
           exists (select 1 from public.comunidade_suspensos s where s.user_id = d.denunciado_id),
           (select count(*)::integer from public.denuncias_comunidade x where x.denunciado_id = d.denunciado_id),
           coalesce(nullif(trim(pr.social_name), ''), pr.full_name),
           coalesce(e.titulo || coalesce(' · ' || le.nome, ''), a.titulo || coalesce(' · ' || la.nome, ''), '—'),
           d.data
      from public.denuncias_comunidade d
      left join public.profiles pd on pd.id = d.denunciado_id
      left join public.profiles pr on pr.id = d.reporter_id
      left join public.eventos e on e.id = d.evento_id
      left join public.locais le on le.id = e.local_id
      left join public.agenda_semanal a on a.id = d.agenda_id
      left join public.locais la on la.id = a.local_id
     where case when p_status = 'abertas' then d.status in ('aberta', 'em_analise') else true end
     order by (d.status in ('aberta', 'em_analise')) desc, d.created_at desc
     limit 300;
end;
$$;

create or replace function public.suspender_da_comunidade(p_user uuid, p_suspender boolean, p_motivo text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Só a equipe Dicas.' using errcode = '42501'; end if;
  if p_suspender then
    insert into public.comunidade_suspensos (user_id, motivo, criado_por) values (p_user, left(p_motivo, 300), auth.uid())
    on conflict (user_id) do update set motivo = excluded.motivo, criado_por = excluded.criado_por, created_at = now();
    update public.presencas set aparecer = false, updated_at = now() where user_id = p_user and aparecer;
  else
    delete from public.comunidade_suspensos where user_id = p_user;
  end if;
end;
$$;

-- 9) Permissões das funções --------------------------------------------------------------------------------
-- Ajudantes internos: o app não chama (diriam a idade de alguém ou se duas pessoas se bloquearam).
revoke execute on function public.maior_de_18(uuid) from public, anon, authenticated;
revoke execute on function public.bloqueio_entre(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.alvo_eu_vou(uuid, uuid, date) from public, anon, authenticated;
grant execute on function public.resumo_eu_vou(uuid, uuid, date) to anon, authenticated;
grant execute on function public.contar_eu_vou(jsonb) to anon, authenticated;
revoke execute on function public.marcar_eu_vou(uuid, uuid, date, boolean) from public, anon;
grant execute on function public.marcar_eu_vou(uuid, uuid, date, boolean) to authenticated;
revoke execute on function public.desmarcar_eu_vou(uuid, uuid, date) from public, anon;
grant execute on function public.desmarcar_eu_vou(uuid, uuid, date) to authenticated;
revoke execute on function public.apagar_historico_presenca() from public, anon;
grant execute on function public.apagar_historico_presenca() to authenticated;
revoke execute on function public.eu_vou_do_local(uuid) from public, anon;
grant execute on function public.eu_vou_do_local(uuid) to authenticated;
revoke execute on function public.fila_denuncias_comunidade(text) from public, anon;
grant execute on function public.fila_denuncias_comunidade(text) to authenticated;
revoke execute on function public.suspender_da_comunidade(uuid, boolean, text) from public, anon;
grant execute on function public.suspender_da_comunidade(uuid, boolean, text) to authenticated;

-- Conferência:
select to_regclass('public.presencas') as presencas, to_regclass('public.denuncias_comunidade') as denuncias,
       to_regclass('public.comunidade_suspensos') as suspensos;
