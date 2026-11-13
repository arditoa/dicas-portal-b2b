-- 099 — Modo parceiro no app (Rodada 145): equipe com permissões, senha da porta (PIN), foto de conferência,
-- layout da festa, textura do banner e resultados por festa.
-- Rode DEPOIS da 098, inteira, no SQL Editor do Supabase. Seguro rodar mais de uma vez.
--
-- Antes de usar a senha da porta no app: Supabase > Authentication > Sign In / Providers > ligar "Allow anonymous sign-ins".
-- (O porteiro entra sem conta: o app cria uma sessão anônima e a função entrar_modo_porta() dá a ela acesso só à porta.)
--
-- Nada aqui tira poder de quem já tem: o dono do local e o admin continuam podendo tudo. A equipe é um acréscimo.

begin;

create extension if not exists pgcrypto with schema extensions;

-- =====================================================================================================
-- 1) EQUIPE DO LOCAL
-- =====================================================================================================
-- Permissões possíveis:
--   porta       = Modo porta (ler QR, confirmar entrada, aprovar/recusar na portaria) — só na janela da festa
--   checkins    = ver e cancelar check-ins, validar código
--   lista_vip   = aprovar/recusar Lista VIP a qualquer momento e abrir/fechar a lista
--   festa       = subir e editar festas (layout incluído)
--   banner      = editar o banner (destaque_chamada)
--   cupons      = criar e editar cupons
--   resultados  = ver cliques e visualizações
-- Equipe, senha da porta, plano e dados da empresa: só o dono (não existe permissão para isso).

create table if not exists public.local_equipe (
  id uuid primary key default gen_random_uuid(),
  local_id uuid not null references public.locais(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  modelo text not null default 'personalizado'
    check (modelo in ('porteiro', 'gerente', 'social_media', 'personalizado', 'porta_pin')),
  permissoes text[] not null default '{}'
    check (permissoes <@ array['porta', 'checkins', 'lista_vip', 'festa', 'banner', 'cupons', 'resultados']::text[]),
  apelido text check (apelido is null or char_length(apelido) <= 40),
  convidado_por uuid references auth.users(id) on delete set null,
  pin_versao integer,                -- só para modelo 'porta_pin': trocar o PIN derruba quem entrou com o antigo
  criado_em timestamptz not null default now(),
  expira_em timestamptz,             -- null = não expira (membro convidado); 'porta_pin' expira às 6h
  unique (local_id, user_id)
);
create index if not exists idx_local_equipe_user on public.local_equipe (user_id);

comment on table public.local_equipe is
  'Rodada 145. Quem trabalha no local sem ser o dono: membros convidados (porteiro, gerente, social media) e aparelhos que entraram com a senha da porta (porta_pin, temporários). Permissões em permissoes[]; regra central em pode_no_local().';

create or replace function public.permissoes_do_modelo(p_modelo text)
returns text[]
language sql immutable
set search_path = public
as $$
  select case p_modelo
    when 'porteiro'     then array['porta', 'checkins']
    when 'gerente'      then array['porta', 'checkins', 'lista_vip', 'festa', 'banner', 'cupons', 'resultados']
    when 'social_media' then array['festa', 'banner', 'cupons', 'resultados']
    when 'porta_pin'    then array['porta', 'checkins']
    else array[]::text[]
  end;
$$;

create or replace function public.e_dono_do_local(p_local uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (select 1 from public.locais l where l.id = p_local and l.owner_id = auth.uid())
      or public.is_admin();
$$;

-- Tabela da senha da porta (separada de "locais", que é pública: o hash nunca pode ser lido por ninguém).
create table if not exists public.porta_acesso (
  local_id uuid primary key references public.locais(id) on delete cascade,
  codigo text not null unique check (codigo ~ '^[A-Z0-9]{4,10}$'),
  pin_hash text,
  versao integer not null default 1,
  atualizado_em timestamptz not null default now()
);
alter table public.porta_acesso enable row level security;   -- sem policy: só as funções abaixo leem/gravam

create table if not exists public.porta_tentativas (
  id bigserial primary key,
  local_id uuid references public.locais(id) on delete cascade,
  user_id uuid,
  ok boolean not null,
  criado_em timestamptz not null default now()
);
create index if not exists idx_porta_tentativas on public.porta_tentativas (local_id, criado_em);
alter table public.porta_tentativas enable row level security;  -- sem policy

-- Regra central: o usuário logado pode fazer <p_perm> neste local?
create or replace function public.pode_no_local(p_local uuid, p_perm text)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select public.e_dono_do_local(p_local)
      or exists (
        select 1
          from public.local_equipe q
          left join public.porta_acesso pa on pa.local_id = q.local_id
         where q.local_id = p_local
           and q.user_id = auth.uid()
           and p_perm = any (q.permissoes)
           and (q.expira_em is null or q.expira_em > now())
           and (q.modelo <> 'porta_pin' or q.pin_versao = pa.versao)
      );
$$;

-- Local, pessoa, validade e versão do PIN não mudam por update direto pela API.
-- As funções do sistema (aceitar convite, entrar na porta) ligam a marca dicas.equipe_rpc para poder ajustar.
create or replace function public.protect_local_equipe()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if pg_trigger_depth() > 1 or current_setting('dicas.equipe_rpc', true) = 'on' then
    return new;
  end if;
  new.local_id := old.local_id;
  new.user_id := old.user_id;
  new.convidado_por := old.convidado_por;
  new.pin_versao := old.pin_versao;
  new.expira_em := old.expira_em;
  if old.modelo = 'porta_pin' then
    new.modelo := old.modelo;
    new.permissoes := old.permissoes;
  elsif new.modelo = 'porta_pin' then
    new.modelo := old.modelo;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_local_equipe on public.local_equipe;
create trigger protect_local_equipe before update on public.local_equipe
  for each row execute function public.protect_local_equipe();

alter table public.local_equipe enable row level security;
drop policy if exists "local_equipe_select" on public.local_equipe;
create policy "local_equipe_select" on public.local_equipe for select to authenticated
  using (user_id = auth.uid() or public.e_dono_do_local(local_id));
drop policy if exists "local_equipe_update_dono" on public.local_equipe;
create policy "local_equipe_update_dono" on public.local_equipe for update to authenticated
  using (public.e_dono_do_local(local_id)) with check (public.e_dono_do_local(local_id));
drop policy if exists "local_equipe_delete" on public.local_equipe;
create policy "local_equipe_delete" on public.local_equipe for delete to authenticated
  using (user_id = auth.uid() or public.e_dono_do_local(local_id));
-- Sem policy de insert: entra-se só por aceitar_convite_equipe() ou entrar_modo_porta().

-- Convites (o dono gera um código e manda por WhatsApp; a pessoa digita no app).
create table if not exists public.local_equipe_convites (
  codigo text primary key,
  local_id uuid not null references public.locais(id) on delete cascade,
  modelo text not null check (modelo in ('porteiro', 'gerente', 'social_media', 'personalizado')),
  permissoes text[] not null
    check (permissoes <@ array['porta', 'checkins', 'lista_vip', 'festa', 'banner', 'cupons', 'resultados']::text[]),
  apelido text check (apelido is null or char_length(apelido) <= 40),
  criado_por uuid references auth.users(id) on delete set null,
  criado_em timestamptz not null default now(),
  expira_em timestamptz not null default now() + interval '7 days',
  usado_por uuid references auth.users(id) on delete set null,
  usado_em timestamptz
);
alter table public.local_equipe_convites enable row level security;
drop policy if exists "convites_select_dono" on public.local_equipe_convites;
create policy "convites_select_dono" on public.local_equipe_convites for select to authenticated
  using (public.e_dono_do_local(local_id));
drop policy if exists "convites_delete_dono" on public.local_equipe_convites;
create policy "convites_delete_dono" on public.local_equipe_convites for delete to authenticated
  using (public.e_dono_do_local(local_id));

create or replace function public.gerar_codigo_curto(p_tamanho integer)
returns text
language plpgsql volatile
set search_path = public, extensions
as $$
declare
  alfabeto constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';  -- sem O, 0, I, 1, L
  r text := '';
  b bytea := extensions.gen_random_bytes(p_tamanho);
begin
  for i in 0 .. p_tamanho - 1 loop
    r := r || substr(alfabeto, (get_byte(b, i) % length(alfabeto)) + 1, 1);
  end loop;
  return r;
end;
$$;

create or replace function public.criar_convite_equipe(
  p_local uuid, p_modelo text, p_permissoes text[] default null, p_apelido text default null)
returns text
language plpgsql security definer
set search_path = public
as $$
declare
  v_codigo text;
  v_perms text[];
begin
  if not public.e_dono_do_local(p_local) then
    raise exception 'Só o dono do local pode convidar pessoas para a equipe.' using errcode = '42501';
  end if;
  if p_modelo not in ('porteiro', 'gerente', 'social_media', 'personalizado') then
    raise exception 'Modelo de equipe inválido.';
  end if;
  v_perms := coalesce(p_permissoes, public.permissoes_do_modelo(p_modelo));
  if array_length(v_perms, 1) is null then
    raise exception 'Escolha pelo menos uma permissão.';
  end if;
  loop
    v_codigo := public.gerar_codigo_curto(8);
    exit when not exists (select 1 from public.local_equipe_convites c where c.codigo = v_codigo);
  end loop;
  insert into public.local_equipe_convites (codigo, local_id, modelo, permissoes, apelido, criado_por)
  values (v_codigo, p_local, p_modelo, v_perms, nullif(trim(p_apelido), ''), auth.uid());
  return v_codigo;
end;
$$;

create or replace function public.aceitar_convite_equipe(p_codigo text)
returns json
language plpgsql security definer
set search_path = public
as $$
declare
  c public.local_equipe_convites;
  v_nome text;
begin
  if auth.uid() is null or coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
    raise exception 'Entre com a sua conta para aceitar o convite.';
  end if;
  select * into c from public.local_equipe_convites
   where codigo = upper(regexp_replace(coalesce(p_codigo, ''), '[^A-Za-z0-9]', '', 'g')) for update;
  if c.codigo is null then
    raise exception 'Convite não encontrado. Confira o código.';
  end if;
  if c.usado_em is not null then
    raise exception 'Este convite já foi usado. Peça um novo ao dono do local.';
  end if;
  if c.expira_em < now() then
    raise exception 'Este convite venceu. Peça um novo ao dono do local.';
  end if;
  if exists (select 1 from public.locais l where l.id = c.local_id and l.owner_id = auth.uid()) then
    raise exception 'Você já é o dono deste local.';
  end if;

  perform set_config('dicas.equipe_rpc', 'on', true);
  insert into public.local_equipe (local_id, user_id, modelo, permissoes, apelido, convidado_por)
  values (c.local_id, auth.uid(), c.modelo, c.permissoes, c.apelido, c.criado_por)
  on conflict (local_id, user_id) do update
    set modelo = excluded.modelo, permissoes = excluded.permissoes, apelido = excluded.apelido,
        convidado_por = excluded.convidado_por, expira_em = null, pin_versao = null;
  perform set_config('dicas.equipe_rpc', 'off', true);

  update public.local_equipe_convites set usado_por = auth.uid(), usado_em = now() where codigo = c.codigo;
  select nome into v_nome from public.locais where id = c.local_id;
  return json_build_object('local_id', c.local_id, 'nome', v_nome, 'permissoes', c.permissoes);
end;
$$;

-- =====================================================================================================
-- 2) SENHA DA PORTA (PIN)
-- =====================================================================================================
create or replace function public.proximas_6h()
returns timestamptz
language plpgsql stable
set search_path = public
as $$
declare
  v_local timestamp := now() at time zone 'America/Sao_Paulo';
  v_alvo timestamp := date_trunc('day', v_local) + interval '6 hours';
begin
  if v_local >= v_alvo then
    v_alvo := v_alvo + interval '1 day';
  end if;
  return v_alvo at time zone 'America/Sao_Paulo';
end;
$$;

-- O dono cria ou troca o PIN. Trocar derruba todos os aparelhos que entraram com o PIN antigo.
create or replace function public.definir_pin_porta(p_local uuid, p_pin text)
returns json
language plpgsql security definer
set search_path = public, extensions
as $$
declare
  v_codigo text;
  v_base text;
  v_versao integer;
begin
  if not public.e_dono_do_local(p_local) then
    raise exception 'Só o dono do local pode definir a senha da porta.' using errcode = '42501';
  end if;
  if p_pin is null or p_pin !~ '^[0-9]{6}$' then
    raise exception 'A senha da porta precisa ter 6 números.';
  end if;
  if p_pin in ('000000', '111111', '123456', '654321', '121212', '999999') then
    raise exception 'Escolha uma senha menos óbvia.';
  end if;

  select codigo into v_codigo from public.porta_acesso where local_id = p_local;
  if v_codigo is null then
    select left(upper(regexp_replace(translate(nome,
             'áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ',
             'aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC'), '[^A-Za-z0-9]', '', 'g')), 6)
      into v_base from public.locais where id = p_local;
    if v_base is null or length(v_base) < 3 then
      v_base := 'CASA';
    end if;
    v_codigo := v_base;
    while exists (select 1 from public.porta_acesso where codigo = v_codigo) loop
      v_codigo := left(v_base, 6) || (10 + floor(random() * 90))::int::text;
    end loop;
  end if;

  insert into public.porta_acesso (local_id, codigo, pin_hash, versao, atualizado_em)
  values (p_local, v_codigo, extensions.crypt(p_pin, extensions.gen_salt('bf', 8)), 1, now())
  on conflict (local_id) do update
    set pin_hash = excluded.pin_hash, versao = public.porta_acesso.versao + 1, atualizado_em = now()
  returning versao into v_versao;

  delete from public.local_equipe where local_id = p_local and modelo = 'porta_pin';
  return json_build_object('codigo', v_codigo, 'versao', v_versao);
end;
$$;

-- O dono vê o código da casa (o PIN nunca volta: só o dono sabe).
create or replace function public.porta_do_local(p_local uuid)
returns json
language plpgsql stable security definer
set search_path = public
as $$
declare
  pa public.porta_acesso;
begin
  if not public.e_dono_do_local(p_local) then
    raise exception 'Sem permissão.' using errcode = '42501';
  end if;
  select * into pa from public.porta_acesso where local_id = p_local;
  return json_build_object('codigo', pa.codigo, 'tem_pin', pa.pin_hash is not null, 'atualizado_em', pa.atualizado_em,
    'aparelhos', coalesce((
      select json_agg(json_build_object('id', q.id, 'apelido', q.apelido, 'desde', q.criado_em, 'expira_em', q.expira_em)
                      order by q.criado_em desc)
        from public.local_equipe q
       where q.local_id = p_local and q.modelo = 'porta_pin' and q.expira_em > now() and q.pin_versao = pa.versao
    ), '[]'::json));
end;
$$;

-- O porteiro entra: código da casa + PIN. Funciona com sessão anônima (sem conta).
-- Erros de senha voltam como {"ok": false, "erro": "..."} (e não como exceção) para a tentativa ficar registrada:
-- uma exceção desfaria o registro e o bloqueio por tentativas nunca valeria.
create or replace function public.entrar_modo_porta(p_codigo text, p_pin text, p_apelido text default null)
returns json
language plpgsql security definer
set search_path = public, extensions
as $$
declare
  pa public.porta_acesso;
  v_uid uuid := auth.uid();
  v_erros_aparelho integer;
  v_erros_local integer;
  v_expira timestamptz := public.proximas_6h();
  v_nome text;
  v_existente public.local_equipe;
begin
  if v_uid is null then
    return json_build_object('ok', false, 'erro', 'Abra o app de novo e tente outra vez.');
  end if;

  select count(*) into v_erros_aparelho from public.porta_tentativas
   where user_id = v_uid and not ok and criado_em > now() - interval '15 minutes';
  if v_erros_aparelho >= 5 then
    return json_build_object('ok', false, 'erro', 'Muitas tentativas erradas. Espere 15 minutos.');
  end if;

  select * into pa from public.porta_acesso
   where codigo = upper(regexp_replace(coalesce(p_codigo, ''), '[^A-Za-z0-9]', '', 'g'));

  if pa.local_id is not null then
    select count(*) into v_erros_local from public.porta_tentativas
     where local_id = pa.local_id and not ok and criado_em > now() - interval '15 minutes';
    if v_erros_local >= 20 then
      return json_build_object('ok', false, 'erro',
        'Muitas tentativas erradas nesta casa. Espere 15 minutos ou peça ao dono para trocar a senha.');
    end if;
  end if;

  if pa.local_id is null or pa.pin_hash is null
     or extensions.crypt(coalesce(p_pin, ''), pa.pin_hash) <> pa.pin_hash then
    insert into public.porta_tentativas (local_id, user_id, ok) values (pa.local_id, v_uid, false);
    return json_build_object('ok', false, 'erro', 'Código da casa ou senha incorretos.',
                             'tentativas_restantes', greatest(0, 4 - v_erros_aparelho));
  end if;

  insert into public.porta_tentativas (local_id, user_id, ok) values (pa.local_id, v_uid, true);

  select * into v_existente from public.local_equipe where local_id = pa.local_id and user_id = v_uid;
  perform set_config('dicas.equipe_rpc', 'on', true);
  if v_existente.id is null then
    insert into public.local_equipe (local_id, user_id, modelo, permissoes, apelido, pin_versao, expira_em)
    values (pa.local_id, v_uid, 'porta_pin', public.permissoes_do_modelo('porta_pin'),
            coalesce(nullif(trim(p_apelido), ''), 'Aparelho da porta'), pa.versao, v_expira);
  elsif v_existente.modelo = 'porta_pin' then
    update public.local_equipe set pin_versao = pa.versao, expira_em = v_expira,
           apelido = coalesce(nullif(trim(p_apelido), ''), apelido)
     where id = v_existente.id;
  end if;  -- membro convidado: não mexe no acesso que já tem
  perform set_config('dicas.equipe_rpc', 'off', true);

  select nome into v_nome from public.locais where id = pa.local_id;
  return json_build_object('ok', true, 'local_id', pa.local_id, 'nome', v_nome, 'expira_em', v_expira);
end;
$$;

-- Limpeza: tentativas com mais de 30 dias não servem para nada.
delete from public.porta_tentativas where criado_em < now() - interval '30 days';

-- =====================================================================================================
-- 3) LOCAIS DO PARCEIRO (o app decide se abre direto no Modo parceiro)
-- =====================================================================================================
create or replace function public.meus_locais_parceiro()
returns table (
  local_id uuid, nome text, categoria text, subcategoria text, plano_comercial text,
  papel text, permissoes text[], expira_em timestamptz
)
language sql stable security definer
set search_path = public
as $$
  select l.id, l.nome, l.categoria::text, l.subcategoria, l.plano_comercial::text,
         'dono', array['porta', 'checkins', 'lista_vip', 'festa', 'banner', 'cupons', 'resultados'], null::timestamptz
    from public.locais l
   where l.owner_id = auth.uid() and auth.uid() is not null
  union all
  select l.id, l.nome, l.categoria::text, l.subcategoria, l.plano_comercial::text,
         q.modelo, q.permissoes, q.expira_em
    from public.local_equipe q
    join public.locais l on l.id = q.local_id
    left join public.porta_acesso pa on pa.local_id = q.local_id
   where q.user_id = auth.uid()
     and (q.expira_em is null or q.expira_em > now())
     and (q.modelo <> 'porta_pin' or q.pin_versao = pa.versao)
     and l.owner_id is distinct from auth.uid();
$$;

-- =====================================================================================================
-- 4) FESTAS: layout no app + equipe
-- =====================================================================================================
alter table public.eventos add column if not exists capa_url text;
alter table public.eventos add column if not exists cor1 text;
alter table public.eventos add column if not exists cor2 text;
alter table public.eventos add column if not exists textura text;
alter table public.eventos add column if not exists chamada text;
alter table public.eventos add column if not exists destaques text[] not null default '{}';
alter table public.eventos add column if not exists link_ingresso text;
alter table public.eventos add column if not exists exigir_foto boolean not null default false;

alter table public.eventos drop constraint if exists eventos_layout_valido;
alter table public.eventos add constraint eventos_layout_valido check (
  (cor1 is null or cor1 ~ '^#[0-9A-Fa-f]{6}$')
  and (cor2 is null or cor2 ~ '^#[0-9A-Fa-f]{6}$')
  and (textura is null or textura in ('glitter', 'neon', 'holografico', 'papel', 'tijolo'))
  and (chamada is null or char_length(chamada) <= 80)
  and coalesce(array_length(destaques, 1), 0) <= 6
  and (link_ingresso is null or link_ingresso ~* '^https?://')
);

comment on column public.eventos.exigir_foto is
  'Rodada 145. Quando true, só pede a Lista VIP quem tem foto de conferência no perfil; a portaria vê a foto.';

drop policy if exists "eventos_select_equipe" on public.eventos;
create policy "eventos_select_equipe" on public.eventos for select to authenticated
  using (local_id is not null and (
    public.pode_no_local(local_id, 'festa') or public.pode_no_local(local_id, 'porta')
    or public.pode_no_local(local_id, 'lista_vip')));
drop policy if exists "eventos_update_equipe" on public.eventos;
create policy "eventos_update_equipe" on public.eventos for update to authenticated
  using (local_id is not null and public.pode_no_local(local_id, 'festa'))
  with check (local_id is not null and public.pode_no_local(local_id, 'festa'));
-- (Inserir festa já é aberto; o gatilho protect_admin_fields_eventos continua valendo para a equipe:
--  festa aprovada que muda nome, data ou local volta para pendente; layout e chamada não.)

-- =====================================================================================================
-- 5) LISTA VIP: equipe, janela da porta, registro de quem confirmou, exigir foto
-- =====================================================================================================
alter table public.listas_vip_solicitacoes add column if not exists check_in_em timestamptz;
alter table public.listas_vip_solicitacoes add column if not exists check_in_por uuid references auth.users(id) on delete set null;

-- Porta: só a partir de 12 h antes do início até 12 h depois do fim (ou do início, se não houver fim).
create or replace function public.evento_na_janela_da_porta(p_evento uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.eventos e
     where e.id = p_evento
       and now() >= e.data_inicio - interval '12 hours'
       and now() <= coalesce(e.data_fim, e.data_inicio) + interval '12 hours'
  );
$$;

create or replace function public.pode_na_lista_vip(p_lista uuid, p_perm text)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select coalesce((
    select public.pode_no_local(e.local_id, p_perm)
           and (p_perm <> 'porta' or public.evento_na_janela_da_porta(e.id))
      from public.listas_vip lv
      join public.eventos e on e.id = lv.evento_id
     where lv.id = p_lista and e.local_id is not null
  ), false);
$$;

drop policy if exists "listas_vip_select_equipe" on public.listas_vip;
create policy "listas_vip_select_equipe" on public.listas_vip for select to authenticated
  using (public.pode_na_lista_vip(id, 'lista_vip') or public.pode_na_lista_vip(id, 'porta')
         or public.pode_na_lista_vip(id, 'festa'));
drop policy if exists "listas_vip_write_equipe" on public.listas_vip;
create policy "listas_vip_write_equipe" on public.listas_vip for update to authenticated
  using (public.pode_na_lista_vip(id, 'lista_vip')) with check (public.pode_na_lista_vip(id, 'lista_vip'));

drop policy if exists "listas_vip_solicitacoes_select_equipe" on public.listas_vip_solicitacoes;
create policy "listas_vip_solicitacoes_select_equipe" on public.listas_vip_solicitacoes for select to authenticated
  using (public.pode_na_lista_vip(lista_vip_id, 'lista_vip') or public.pode_na_lista_vip(lista_vip_id, 'porta'));
drop policy if exists "listas_vip_solicitacoes_update_equipe" on public.listas_vip_solicitacoes;
create policy "listas_vip_solicitacoes_update_equipe" on public.listas_vip_solicitacoes for update to authenticated
  using (public.pode_na_lista_vip(lista_vip_id, 'lista_vip') or public.pode_na_lista_vip(lista_vip_id, 'porta'));

-- Mesmo miolo da 031 (última versão), com a equipe somada a "dono ou admin" e o registro de quem confirmou a entrada.
create or replace function public.protect_status_listas_vip_solicitacoes()
returns trigger as $$
declare
  v_e_dono_ou_admin boolean := public.e_dono_da_lista_vip(new.lista_vip_id) or public.is_admin()
                               or public.pode_na_lista_vip(new.lista_vip_id, 'lista_vip')
                               or public.pode_na_lista_vip(new.lista_vip_id, 'porta');
  v_vagas_limite integer;
  v_vagas_ocupadas integer;
begin
  new.user_id := old.user_id;
  new.lista_vip_id := old.lista_vip_id;
  new.check_in_em := old.check_in_em;
  new.check_in_por := old.check_in_por;

  if v_e_dono_ou_admin then
    if new.status = 'aprovada' and old.status <> 'aprovada' then
      select vagas_limite, vagas_ocupadas into v_vagas_limite, v_vagas_ocupadas
      from public.listas_vip where id = new.lista_vip_id;
      if v_vagas_limite is not null and v_vagas_ocupadas >= v_vagas_limite then
        raise exception 'Lista VIP está cheia.';
      end if;
    end if;
    new.acompanhantes := old.acompanhantes;
  else
    if auth.uid() = old.user_id and old.status in ('solicitada', 'aprovada') and new.status = 'cancelada' then
      null;
    elsif auth.uid() = old.user_id and old.status = 'solicitada' and new.status = 'solicitada' then
      null;
    elsif auth.uid() = old.user_id and old.status = 'aprovada' and new.status = 'check_in' then
      null;  -- legado da Rodada 59 (o app não usa mais o "Cheguei")
    else
      new.status := old.status;
      new.acompanhantes := old.acompanhantes;
    end if;
  end if;

  if new.status = 'check_in' and old.status is distinct from 'check_in' then
    new.check_in_em := now();
    new.check_in_por := auth.uid();
  elsif new.status is distinct from 'check_in' and old.status = 'check_in' then
    new.check_in_em := null;
    new.check_in_por := null;
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

-- Pedido de lista: mesmo miolo da 001, mais a exigência de foto quando a festa pede.
create or replace function public.enforce_solicitacao_vip_insert()
returns trigger as $$
begin
  new.status := 'solicitada';
  new.user_id := auth.uid();
  if new.acompanhantes is null or new.acompanhantes < 0 then
    new.acompanhantes := 0;
  end if;
  if not exists (select 1 from public.listas_vip lv where lv.id = new.lista_vip_id and lv.ativa) then
    raise exception 'Esta lista VIP não está mais aceitando solicitações.';
  end if;
  if exists (
    select 1 from public.listas_vip lv join public.eventos e on e.id = lv.evento_id
     where lv.id = new.lista_vip_id and e.exigir_foto
  ) and not exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.foto_conferencia_path is not null
  ) then
    raise exception 'Esta lista pede uma foto para conferência na portaria. Cadastre a sua foto e tente de novo.'
      using errcode = 'P0001', hint = 'FOTO_CONFERENCIA';
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

-- =====================================================================================================
-- 6) FOTO DE CONFERÊNCIA (privada; não é a foto pública do perfil)
-- =====================================================================================================
alter table public.profiles add column if not exists foto_conferencia_path text;
alter table public.profiles add column if not exists foto_conferencia_em timestamptz;
comment on column public.profiles.foto_conferencia_path is
  'Rodada 145. Caminho no bucket privado fotos-conferencia (<user_id>/foto.jpg). Nunca aparece no app; só a portaria do local cuja lista a pessoa pediu vê, na janela da festa.';

-- Só aceita caminho dentro da pasta da própria pessoa.
create or replace function public.protect_foto_conferencia()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if new.foto_conferencia_path is distinct from old.foto_conferencia_path then
    if new.foto_conferencia_path is not null
       and split_part(new.foto_conferencia_path, '/', 1) <> new.id::text then
      raise exception 'Caminho de foto inválido.';
    end if;
    new.foto_conferencia_em := case when new.foto_conferencia_path is null then null else now() end;
  else
    new.foto_conferencia_em := old.foto_conferencia_em;
  end if;
  return new;
end;
$$;
drop trigger if exists protect_foto_conferencia on public.profiles;
create trigger protect_foto_conferencia before update on public.profiles
  for each row execute function public.protect_foto_conferencia();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('fotos-conferencia', 'fotos-conferencia', false, 5 * 1024 * 1024,
        array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'])
on conflict (id) do update
  set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- Quem pode ver a foto de <p_user>: a própria pessoa, admin, ou a equipe da porta de um local
-- onde ela tem pedido de lista ativo, na janela da festa.
create or replace function public.pode_ver_foto_conferencia(p_user uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select p_user = auth.uid()
      or public.is_admin()
      or exists (
        select 1
          from public.listas_vip_solicitacoes s
          join public.listas_vip lv on lv.id = s.lista_vip_id
          join public.eventos e on e.id = lv.evento_id
         where s.user_id = p_user
           and s.status in ('solicitada', 'aprovada', 'check_in')
           and e.local_id is not null
           and public.pode_no_local(e.local_id, 'porta')
           and public.evento_na_janela_da_porta(e.id)
      );
$$;

create or replace function public.uuid_ou_nulo(p text)
returns uuid
language plpgsql immutable
as $$
begin
  return p::uuid;
exception when others then
  return null;
end;
$$;

drop policy if exists "conferencia_select" on storage.objects;
create policy "conferencia_select" on storage.objects for select to authenticated
  using (bucket_id = 'fotos-conferencia'
         and public.pode_ver_foto_conferencia(public.uuid_ou_nulo((storage.foldername(name))[1])));
drop policy if exists "conferencia_insert_propria" on storage.objects;
create policy "conferencia_insert_propria" on storage.objects for insert to authenticated
  with check (bucket_id = 'fotos-conferencia'
              and (storage.foldername(name))[1] = auth.uid()::text
              and not coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false));
drop policy if exists "conferencia_update_propria" on storage.objects;
create policy "conferencia_update_propria" on storage.objects for update to authenticated
  using (bucket_id = 'fotos-conferencia' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'fotos-conferencia' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "conferencia_delete_propria" on storage.objects;
create policy "conferencia_delete_propria" on storage.objects for delete to authenticated
  using (bucket_id = 'fotos-conferencia' and (storage.foldername(name))[1] = auth.uid()::text);

-- A portaria pergunta "qual a foto deste pedido?" e recebe o caminho (o app então gera o link temporário).
create or replace function public.foto_conferencia_do_pedido(p_solicitacao uuid)
returns text
language plpgsql stable security definer
set search_path = public
as $$
declare
  v_user uuid;
  v_path text;
begin
  select s.user_id into v_user from public.listas_vip_solicitacoes s where s.id = p_solicitacao;
  if v_user is null or not public.pode_ver_foto_conferencia(v_user) then
    return null;
  end if;
  select foto_conferencia_path into v_path from public.profiles where id = v_user;
  return v_path;
end;
$$;

-- =====================================================================================================
-- 7) CHECK-INS: a equipe com "checkins" faz o que o dono faz
-- =====================================================================================================
drop policy if exists "checkins_select_equipe" on public.checkins;
create policy "checkins_select_equipe" on public.checkins for select to authenticated
  using (public.pode_no_local(local_id, 'checkins'));

-- validar_checkin: miolo da 010, trocando "dono ou admin" por pode_no_local(..., 'checkins').
create or replace function public.validar_checkin(p_codigo text)
returns public.checkins as $$
declare
  v_checkin public.checkins;
begin
  select * into v_checkin from public.checkins where codigo = upper(p_codigo) for update;

  if v_checkin is null then
    raise exception 'Código não encontrado.';
  end if;
  if not public.pode_no_local(v_checkin.local_id, 'checkins') then
    raise exception 'Sem permissão para validar check-in deste local.';
  end if;
  if v_checkin.cancelado_em is not null then
    raise exception 'Este check-in foi cancelado.';
  end if;
  if v_checkin.validado_em is not null then
    raise exception 'Este código já foi usado.';
  end if;
  if v_checkin.expira_em < now() then
    raise exception 'Código expirado.';
  end if;

  update public.checkins
    set validado_em = now(), validado_por = auth.uid()
    where id = v_checkin.id
    returning * into v_checkin;

  if v_checkin.cupom_id is not null then
    insert into public.cupons_resgatados (cupom_id, user_id)
    values (v_checkin.cupom_id, v_checkin.user_id)
    on conflict (cupom_id, user_id) do nothing;
  end if;

  return v_checkin;
end;
$$ language plpgsql security definer set search_path = public;

-- cancelar_checkin_local: miolo da 079.
create or replace function public.cancelar_checkin_local(p_checkin_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v public.checkins;
begin
  select * into v from public.checkins where id = p_checkin_id;
  if v.id is null then
    raise exception 'Check-in não encontrado.';
  end if;
  if not public.pode_no_local(v.local_id, 'checkins') then
    raise exception 'Sem permissão para cancelar check-in deste local.';
  end if;
  update public.checkins set cancelado_em = now(), cancelado_por = auth.uid()
  where id = p_checkin_id and cancelado_em is null;
  if v.cupom_id is not null then
    delete from public.cupons_resgatados where cupom_id = v.cupom_id and user_id = v.user_id;
  end if;
end;
$$;

-- checkins_do_local: miolo da 079.
create or replace function public.checkins_do_local(p_local_id uuid, p_dias integer default 2)
returns table (
  checkin_id uuid,
  criado_em timestamptz,
  cliente text,
  cupom text,
  metodo text,
  situacao text,
  distancia integer,
  codigo_checkin text
) language plpgsql security definer set search_path = public as $$
begin
  if not public.pode_no_local(p_local_id, 'checkins') then
    raise exception 'Sem permissão para ver os check-ins deste local.';
  end if;
  perform public.confirmar_checkins_pendentes();
  return query
  select c.id, c.created_at, coalesce(pp.display_name, 'Cliente'), cu.titulo, c.metodo_validacao,
         case when c.cancelado_em is not null then 'cancelado'
              when c.validado_em is not null then 'confirmado'
              else 'pendente' end,
         c.distancia_m, c.codigo
  from public.checkins c
  left join public.perfis_publicos pp on pp.id = c.user_id
  left join public.cupons cu on cu.id = c.cupom_id
  where c.local_id = p_local_id
    and c.created_at >= now() - make_interval(days => greatest(1, least(coalesce(p_dias, 2), 31)))
  order by c.created_at desc
  limit 300;
end;
$$;

-- =====================================================================================================
-- 8) BANNER (textura + equipe) e CUPONS (equipe)
-- =====================================================================================================
alter table public.destaque_chamada add column if not exists textura text;
alter table public.destaque_chamada drop constraint if exists destaque_chamada_textura_valida;
alter table public.destaque_chamada add constraint destaque_chamada_textura_valida
  check (textura is null or textura in ('glitter', 'neon', 'holografico', 'papel', 'tijolo'));

drop policy if exists "dest_cham_select_equipe" on public.destaque_chamada;
create policy "dest_cham_select_equipe" on public.destaque_chamada for select to authenticated
  using (public.pode_no_local(local_id, 'banner'));
drop policy if exists "dest_cham_insert_equipe" on public.destaque_chamada;
create policy "dest_cham_insert_equipe" on public.destaque_chamada for insert to authenticated
  with check (public.pode_no_local(local_id, 'banner'));
drop policy if exists "dest_cham_update_equipe" on public.destaque_chamada;
create policy "dest_cham_update_equipe" on public.destaque_chamada for update to authenticated
  using (public.pode_no_local(local_id, 'banner')) with check (public.pode_no_local(local_id, 'banner'));

drop policy if exists "cupons_write_equipe" on public.cupons;
create policy "cupons_write_equipe" on public.cupons for all to authenticated
  using (public.pode_no_local(local_id, 'cupons')) with check (public.pode_no_local(local_id, 'cupons'));
-- (as regras de quantidade por plano continuam nos gatilhos da 075/078 e valem para todos)

-- =====================================================================================================
-- 9) RESULTADOS: por festa e para a equipe
-- =====================================================================================================
alter table public.eventos_analytics add column if not exists evento_id uuid references public.eventos(id) on delete cascade;
create index if not exists idx_eventos_analytics_evento on public.eventos_analytics (evento_id, tipo, created_at)
  where evento_id is not null;

-- O evento informado precisa ser do mesmo local (ninguém infla os números de outra festa).
create or replace function public.enforce_eventos_analytics_insert()
returns trigger as $$
begin
  new.user_id := auth.uid();
  new.created_at := now();
  if new.evento_id is not null and not exists (
    select 1 from public.eventos e where e.id = new.evento_id and e.local_id = new.local_id
  ) then
    new.evento_id := null;
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

-- Miolo da 006 com permissão "resultados".
create or replace function public.resumo_analytics_local(
  p_local_id uuid,
  p_inicio timestamptz default now() - interval '30 days',
  p_fim timestamptz default now()
)
returns table (tipo public.tipo_evento_analytics, total bigint)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.pode_no_local(p_local_id, 'resultados') then
    raise exception 'Sem permissão para ver as métricas deste local.';
  end if;

  return query
    select ea.tipo, count(*)::bigint as total
    from public.eventos_analytics ea
    where ea.local_id = p_local_id
      and ea.created_at >= p_inicio
      and ea.created_at < p_fim
    group by ea.tipo;
end;
$$;

-- Números de uma festa: cliques e visualizações + Lista VIP (pedidos, aprovados, entraram).
create or replace function public.resumo_da_festa(p_evento uuid)
returns json
language plpgsql stable security definer
set search_path = public
as $$
declare
  v_local uuid;
begin
  select local_id into v_local from public.eventos where id = p_evento;
  if v_local is null or not public.pode_no_local(v_local, 'resultados') then
    raise exception 'Sem permissão para ver os números desta festa.';
  end if;
  return json_build_object(
    'cliques', coalesce((
      select json_object_agg(t.tipo, t.total) from (
        select ea.tipo::text as tipo, count(*) as total
          from public.eventos_analytics ea where ea.evento_id = p_evento group by ea.tipo) t
    ), '{}'::json),
    'lista_vip', (
      select json_build_object(
        'pedidos', count(*),
        'aprovados', count(*) filter (where s.status in ('aprovada', 'check_in')),
        'entraram', count(*) filter (where s.status = 'check_in'),
        'pessoas_entraram', coalesce(sum(1 + s.acompanhantes) filter (where s.status = 'check_in'), 0))
        from public.listas_vip_solicitacoes s
        join public.listas_vip lv on lv.id = s.lista_vip_id
       where lv.evento_id = p_evento)
  );
end;
$$;

-- =====================================================================================================
-- 10) Permissões de execução
-- =====================================================================================================
revoke execute on function public.criar_convite_equipe(uuid, text, text[], text) from public, anon;
revoke execute on function public.aceitar_convite_equipe(text) from public, anon;
revoke execute on function public.definir_pin_porta(uuid, text) from public, anon;
revoke execute on function public.porta_do_local(uuid) from public, anon;
revoke execute on function public.entrar_modo_porta(text, text, text) from public, anon;
revoke execute on function public.meus_locais_parceiro() from public, anon;
revoke execute on function public.foto_conferencia_do_pedido(uuid) from public, anon;
revoke execute on function public.resumo_da_festa(uuid) from public, anon;
grant execute on function public.criar_convite_equipe(uuid, text, text[], text) to authenticated;
grant execute on function public.aceitar_convite_equipe(text) to authenticated;
grant execute on function public.definir_pin_porta(uuid, text) to authenticated;
grant execute on function public.porta_do_local(uuid) to authenticated;
grant execute on function public.entrar_modo_porta(text, text, text) to authenticated;   -- sessão anônima também é "authenticated"
grant execute on function public.meus_locais_parceiro() to authenticated;
grant execute on function public.foto_conferencia_do_pedido(uuid) to authenticated;
grant execute on function public.resumo_da_festa(uuid) to authenticated;
grant execute on function public.validar_checkin(text) to authenticated;
grant execute on function public.cancelar_checkin_local(uuid) to authenticated;
grant execute on function public.checkins_do_local(uuid, integer) to authenticated;
grant execute on function public.resumo_analytics_local(uuid, timestamptz, timestamptz) to authenticated;

commit;

-- Conferência (deve mostrar as tabelas novas e as colunas novas):
select 'local_equipe' as item, count(*) from public.local_equipe
union all select 'porta_acesso', count(*) from public.porta_acesso
union all select 'convites', count(*) from public.local_equipe_convites
union all select 'bucket fotos-conferencia privado', count(*) from storage.buckets where id = 'fotos-conferencia' and not public;
