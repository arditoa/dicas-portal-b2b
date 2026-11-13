-- 102 — Reservas nos bares e restaurantes (Andrea, 13/11/2026).
--
-- Regras decididas:
--   * Só planos pagos (Intermediário, Premium, Fundador com plano ativo, ou selo Membro Fundador).
--   * O bar escolhe o MODO:
--       'app'      → o cliente responde um quiz no app (área, dia, horário, pessoas, ocasião, observação)
--                    e o pedido chega em Aprovações; o BAR CONFIRMA (✓) ou recusa (✕).
--       'whatsapp' → o botão "Fazer reserva" só abre o WhatsApp/telefone do bar.
--       'desligado'→ sem botão.
--   * Áreas configuráveis (ex.: Rooftop: mais calmo, mesas e cadeiras, reserva até 21h; Primeiro andar: onde a
--     banda fica, mesa bistrô até 22h; Sacada superior: grupos menores, indicado para dates).
--   * Quem responde na equipe: permissão 'lista_vip' (a mesma de quem cuida da lista na porta).
-- Seguro rodar mais de uma vez. Rode depois da 101.

-- Quem pode ter reserva (plano pago ativo ou selo Fundador)
create or replace function public.local_tem_plano_pago(p_local uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.locais l
     where l.id = p_local
       and l.plano_comercial in ('intermediario', 'premium', 'fundador')
       and coalesce(l.plano_comercial_status, 'ativo') = 'ativo'
  ) or exists (
    select 1 from public.local_badges b where b.local_id = p_local and b.ativo and b.rotulo ilike '%fundador%'
  );
$$;
grant execute on function public.local_tem_plano_pago(uuid) to anon, authenticated;

-- 1) Configuração geral da reserva do local
create table if not exists public.reserva_config (
  local_id uuid primary key references public.locais(id) on delete cascade,
  modo text not null default 'desligado' check (modo in ('app', 'whatsapp', 'desligado')),
  whatsapp text check (whatsapp is null or whatsapp ~ '^[0-9]{12,13}$'), -- 55 + DDD + número; vazio = WhatsApp do local
  chamada text check (chamada is null or char_length(chamada) <= 80),       -- ex.: "Faça sua reserva"
  aviso text check (aviso is null or char_length(aviso) <= 280),            -- ex.: "Tolerância de 15 minutos"
  dias_semana smallint[] not null default '{0,1,2,3,4,5,6}' check (dias_semana <@ array[0,1,2,3,4,5,6]::smallint[]),
  antecedencia_horas integer not null default 2 check (antecedencia_horas between 0 and 168),
  dias_a_frente integer not null default 30 check (dias_a_frente between 1 and 120),
  max_pessoas integer not null default 12 check (max_pessoas between 1 and 100),
  updated_at timestamptz not null default now()
);

-- 2) Áreas (lugares da casa que dá para reservar)
create table if not exists public.reserva_areas (
  id uuid primary key default gen_random_uuid(),
  local_id uuid not null references public.locais(id) on delete cascade,
  nome text not null check (char_length(nome) between 2 and 40),            -- "Rooftop"
  descricao text check (descricao is null or char_length(descricao) <= 160), -- "Mais calmo, com mesas e cadeiras"
  tipo_mesa text check (tipo_mesa is null or char_length(tipo_mesa) <= 40),  -- "Mesa bistrô"
  indicado_para text[] not null default '{}'
    check (indicado_para <@ array['date', 'grupo_pequeno', 'grupo_grande', 'aniversario', 'show', 'tranquilo', 'acessivel']::text[]),
  hora_inicio time not null default '18:00',  -- primeira hora de chegada aceita
  hora_limite time not null default '22:00',  -- "reserva até xx horas" (última chegada)
  min_pessoas integer not null default 1 check (min_pessoas >= 1),
  max_pessoas integer check (max_pessoas is null or max_pessoas >= min_pessoas),
  foto_url text,
  ordem smallint not null default 0,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);
-- Modo WhatsApp precisa de número
alter table public.reserva_config drop constraint if exists reserva_config_whatsapp_no_modo;
alter table public.reserva_config add constraint reserva_config_whatsapp_no_modo check (modo <> 'whatsapp' or whatsapp is not null);

create index if not exists idx_reserva_areas_local on public.reserva_areas (local_id, ordem);

-- 3) Pedidos
create table if not exists public.reservas (
  id uuid primary key default gen_random_uuid(),
  local_id uuid not null references public.locais(id) on delete cascade,
  area_id uuid references public.reserva_areas(id) on delete set null,
  area_nome text not null,          -- fica gravado mesmo se a área mudar de nome depois
  user_id uuid not null references public.profiles(id) on delete cascade,
  nome text not null,
  telefone text,
  data date not null,
  horario time not null,
  pessoas integer not null check (pessoas between 1 and 100),
  ocasiao text check (ocasiao is null or ocasiao in ('date', 'aniversario', 'amigos', 'trabalho', 'outro')),
  observacao text check (observacao is null or char_length(observacao) <= 280),
  status text not null default 'aguardando'
    check (status in ('aguardando', 'confirmada', 'recusada', 'cancelada', 'compareceu', 'nao_veio')),
  resposta text check (resposta is null or char_length(resposta) <= 200),
  respondido_por uuid references auth.users(id) on delete set null,
  respondido_em timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_reservas_local_data on public.reservas (local_id, data, status);
create index if not exists idx_reservas_user on public.reservas (user_id, data desc);

-- RLS
alter table public.reserva_config enable row level security;
alter table public.reserva_areas enable row level security;
alter table public.reservas enable row level security;

drop policy if exists reserva_config_select on public.reserva_config;
create policy reserva_config_select on public.reserva_config for select
  using (public.local_tem_plano_pago(local_id) or public.e_dono_do_local(local_id) or public.is_admin());
drop policy if exists reserva_config_write on public.reserva_config;
create policy reserva_config_write on public.reserva_config for all
  using (public.e_dono_do_local(local_id) or public.is_admin())
  with check (public.e_dono_do_local(local_id) or public.is_admin());

drop policy if exists reserva_areas_select on public.reserva_areas;
create policy reserva_areas_select on public.reserva_areas for select
  using ((ativo and public.local_tem_plano_pago(local_id)) or public.e_dono_do_local(local_id) or public.is_admin());
drop policy if exists reserva_areas_write on public.reserva_areas;
create policy reserva_areas_write on public.reserva_areas for all
  using (public.e_dono_do_local(local_id) or public.is_admin())
  with check (public.e_dono_do_local(local_id) or public.is_admin());

-- Cliente vê as próprias; a casa vê as dela (quem tem 'lista_vip'). Escrita só pelas funções abaixo.
drop policy if exists reservas_select on public.reservas;
create policy reservas_select on public.reservas for select
  using (user_id = auth.uid() or public.pode_no_local(local_id, 'lista_vip') or public.is_admin());

-- Pedir reserva (quiz do app)
drop function if exists public.pedir_reserva(uuid, date, time, integer, text, text);
create function public.pedir_reserva(p_area uuid, p_data date, p_horario time, p_pessoas integer, p_ocasiao text default null, p_observacao text default null)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  a public.reserva_areas;
  c public.reserva_config;
  v_nome text;
  v_tel text;
  v_quando timestamp;
  v_agora timestamp := now() at time zone 'America/Sao_Paulo';
  v_id uuid;
begin
  if auth.uid() is null then raise exception 'Entre na sua conta para reservar.'; end if;
  select * into a from public.reserva_areas where id = p_area and ativo;
  if a.id is null then raise exception 'Esta área não está aceitando reservas.'; end if;
  select * into c from public.reserva_config where local_id = a.local_id;
  if c.local_id is null or c.modo <> 'app' then raise exception 'Esta casa não recebe reservas pelo app.'; end if;
  if not public.local_tem_plano_pago(a.local_id) then raise exception 'Esta casa não está recebendo reservas agora.'; end if;

  if not (extract(dow from p_data)::smallint = any(c.dias_semana)) then raise exception 'A casa não recebe reservas neste dia da semana.'; end if;
  if p_data > (v_agora::date + c.dias_a_frente) then raise exception 'Dá para reservar com até % dias de antecedência.', c.dias_a_frente; end if;
  if p_horario < a.hora_inicio or p_horario > a.hora_limite then
    raise exception 'Nesta área, a reserva é das % às %.', to_char(a.hora_inicio, 'HH24:MI'), to_char(a.hora_limite, 'HH24:MI');
  end if;
  v_quando := p_data + p_horario;
  if v_quando < v_agora + make_interval(hours => c.antecedencia_horas) then
    raise exception 'Reserve com pelo menos % hora(s) de antecedência.', c.antecedencia_horas;
  end if;
  if p_pessoas < a.min_pessoas or p_pessoas > least(coalesce(a.max_pessoas, c.max_pessoas), c.max_pessoas) then
    raise exception 'Nesta área, de % a % pessoas.', a.min_pessoas, least(coalesce(a.max_pessoas, c.max_pessoas), c.max_pessoas);
  end if;
  if exists (select 1 from public.reservas r where r.user_id = auth.uid() and r.local_id = a.local_id and r.data = p_data
             and r.status in ('aguardando', 'confirmada')) then
    raise exception 'Você já tem uma reserva nesta casa para este dia.';
  end if;

  select coalesce(nullif(p.full_name, ''), nullif(p.social_name, ''), 'Cliente'), p.phone into v_nome, v_tel
    from public.profiles p where p.id = auth.uid();

  insert into public.reservas (local_id, area_id, area_nome, user_id, nome, telefone, data, horario, pessoas, ocasiao, observacao)
  values (a.local_id, a.id, a.nome, auth.uid(), coalesce(v_nome, 'Cliente'), v_tel, p_data, p_horario, p_pessoas,
          nullif(p_ocasiao, ''), nullif(trim(coalesce(p_observacao, '')), ''))
  returning id into v_id;
  return v_id;
end;
$$;
revoke all on function public.pedir_reserva(uuid, date, time, integer, text, text) from public, anon;
grant execute on function public.pedir_reserva(uuid, date, time, integer, text, text) to authenticated;

-- Responder (casa) ou cancelar (cliente)
drop function if exists public.responder_reserva(uuid, text, text);
create function public.responder_reserva(p_reserva uuid, p_status text, p_resposta text default null)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  r public.reservas;
begin
  select * into r from public.reservas where id = p_reserva;
  if r.id is null then raise exception 'Reserva não encontrada.'; end if;

  if p_status = 'cancelada' and r.user_id = auth.uid() then
    if r.status not in ('aguardando', 'confirmada') then raise exception 'Esta reserva não pode mais ser cancelada.'; end if;
  elsif public.pode_no_local(r.local_id, 'lista_vip') or public.is_admin() then
    if p_status not in ('confirmada', 'recusada', 'compareceu', 'nao_veio', 'cancelada') then raise exception 'Situação inválida.'; end if;
  else
    raise exception 'Sem permissão.' using errcode = '42501';
  end if;

  update public.reservas
     set status = p_status,
         resposta = coalesce(nullif(trim(coalesce(p_resposta, '')), ''), resposta),
         respondido_por = auth.uid(),
         respondido_em = now()
   where id = p_reserva;
end;
$$;
revoke all on function public.responder_reserva(uuid, text, text) from public, anon;
grant execute on function public.responder_reserva(uuid, text, text) to authenticated;
