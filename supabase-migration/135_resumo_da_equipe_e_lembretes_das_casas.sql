-- 135 — Resumo da equipe às 9h e lembretes automáticos para as casas às 10h (16/11/2026). Rode depois da 134.
-- Seguro rodar mais de uma vez.
--
-- ANTES: em Database › Extensions, ligue **pg_net** e **pg_cron** (o bloco 5 agenda sozinho se o pg_cron estiver ligado).
--
-- * Resumo da equipe (9h): notificação no celular de quem é admin — "3 casas e 2 festas para aprovar · ontem: 120 check-ins…".
--   Toque abre o Modo equipe.
-- * Lembretes das casas (10h): notificação para o dono e a equipe da casa:
--     – festa nos próximos 3 dias sem flyer;
--     – cupom que vence em até 2 dias;
--     – pedidos de Lista VIP esperando, em festa das próximas 24h;
--     – festa com ingressos à venda sem o Mercado Pago conectado.
--   Cada lembrete vai UMA vez (tabela lembretes_enviados). A equipe vê a mesma lista no Modo equipe, com "Cobrar no WhatsApp".
-- * Avisos de operação (da própria casa) não dependem das preferências de marketing do app: vão para os aparelhos
--   registrados de quem trabalha na casa.

create extension if not exists pg_net;

-- 1) Enviar push pela Expo direto do banco (lotes de 100) ---------------------------------------------------
create or replace function public.enviar_push_expo(p_tokens text[], p_titulo text, p_corpo text, p_rota text default null, p_tipo text default 'lembretes')
returns integer language plpgsql security definer set search_path = public, extensions as $$
declare i integer := 1; n integer := coalesce(array_length(p_tokens, 1), 0); lote jsonb;
begin
  while i <= n loop
    select jsonb_agg(jsonb_build_object('to', t, 'title', left(p_titulo, 60), 'body', left(p_corpo, 170), 'sound', 'default', 'priority', 'high',
                                        'data', jsonb_build_object('tipo', p_tipo, 'rota', p_rota)))
      into lote from unnest(p_tokens[i:i + 99]) t;
    perform net.http_post(url := 'https://exp.host/--/api/v2/push/send', body := lote,
                          headers := jsonb_build_object('Content-Type', 'application/json', 'Accept', 'application/json'));
    i := i + 100;
  end loop;
  return n;
end;
$$;
revoke all on function public.enviar_push_expo(text[], text, text, text, text) from public, anon, authenticated;

-- 2) Resumo da equipe -------------------------------------------------------------------------------------
create or replace function public.texto_resumo_equipe()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_ontem_ini timestamptz := (((now() at time zone 'America/Sao_Paulo')::date - 1)::timestamp at time zone 'America/Sao_Paulo');
  v_hoje_ini timestamptz := (((now() at time zone 'America/Sao_Paulo')::date)::timestamp at time zone 'America/Sao_Paulo');
  casas int; festas int; acoes int; vencendo int; semflyer int; ck int; ing int; novos int; partes text[] := '{}';
begin
  select count(*) into casas from public.locais where status = 'pendente';
  select count(*) into festas from public.eventos where status = 'pendente';
  select count(*) into acoes from public.acoes_marca where ativa and not mostrar_no_app and fim >= (now() at time zone 'America/Sao_Paulo')::date;
  select count(*) into vencendo from public.banners_app where ativo and fim between now() and now() + interval '3 days';
  select count(*) into semflyer from public.eventos where status = 'aprovado' and foto_capa_url is null and data_inicio between now() and now() + interval '7 days';
  select count(*) into ck from public.checkins where created_at >= v_ontem_ini and created_at < v_hoje_ini and cancelado_em is null;
  select count(*) into ing from public.ingressos where status in ('valido', 'usado') and not cortesia and created_at >= v_ontem_ini and created_at < v_hoje_ini;
  select count(*) into novos from public.profiles where created_at >= v_ontem_ini and created_at < v_hoje_ini;
  if casas > 0 then partes := partes || (casas || case when casas = 1 then ' casa' else ' casas' end); end if;
  if festas > 0 then partes := partes || (festas || case when festas = 1 then ' festa' else ' festas' end); end if;
  if acoes > 0 then partes := partes || (acoes || case when acoes = 1 then ' ação de marca' else ' ações de marca' end); end if;
  return jsonb_build_object(
    'titulo', case when array_length(partes, 1) > 0 then 'Bom dia, equipe ☀️ ' || array_to_string(partes, ', ') || ' esperando' else 'Bom dia, equipe ☀️ tudo em dia' end,
    'corpo', 'Ontem: ' || novos || ' contas novas, ' || ck || ' check-ins, ' || ing || ' ingressos.'
             || case when vencendo > 0 then ' ' || vencendo || ' banner(s) vencem em 3 dias.' else '' end
             || case when semflyer > 0 then ' ' || semflyer || ' festa(s) da semana sem flyer.' else '' end);
end;
$$;
revoke all on function public.texto_resumo_equipe() from public, anon, authenticated;

create or replace function public.enviar_resumo_equipe()
returns integer language plpgsql security definer set search_path = public as $$
declare t jsonb := public.texto_resumo_equipe(); tokens text[];
begin
  select array_agg(distinct d.token) into tokens from public.push_dispositivos d join public.profiles p on p.id = d.user_id
   where d.ativo and p.role = 'admin';
  if tokens is null then return 0; end if;
  return public.enviar_push_expo(tokens, t->>'titulo', t->>'corpo', '/adm', 'lembretes');
end;
$$;
revoke all on function public.enviar_resumo_equipe() from public, anon, authenticated;

-- A equipe pode disparar o resumo agora (botão no Modo equipe)
create or replace function public.admin_enviar_resumo_agora()
returns integer language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Só a equipe Dicas.' using errcode = '42501'; end if;
  return public.enviar_resumo_equipe();
end;
$$;
revoke execute on function public.admin_enviar_resumo_agora() from public, anon;
grant execute on function public.admin_enviar_resumo_agora() to authenticated;

-- 3) Lembretes das casas -----------------------------------------------------------------------------------
create table if not exists public.lembretes_enviados (
  chave text primary key,
  local_id uuid references public.locais(id) on delete cascade,
  enviado_em timestamptz not null default now()
);
alter table public.lembretes_enviados enable row level security;  -- só funções

create or replace function public.lembretes_das_casas()
returns table (chave text, local_id uuid, casa text, telefone text, titulo text, corpo text, rota text)
language sql stable security definer set search_path = public as $$
  -- Festa nos próximos 3 dias sem flyer
  select 'sem_flyer:' || e.id, l.id, l.nome, l.contato_telefone,
         'Sua festa está sem flyer', '"' || e.titulo || '" é ' || to_char(e.data_inicio at time zone 'America/Sao_Paulo', 'DD/MM') || '. Festa com flyer aparece em destaque e vende mais. Suba agora pelo app.',
         '/parceiro/festas'
    from public.eventos e join public.locais l on l.id = e.local_id
   where e.status = 'aprovado' and e.foto_capa_url is null and e.data_inicio between now() and now() + interval '3 days'
  union all
  -- Cupom que vence em até 2 dias
  select 'cupom_vence:' || c.id || ':' || to_char(c.valido_ate, 'YYYYMMDD'), l.id, l.nome, l.contato_telefone,
         'Seu cupom vence logo', '"' || c.titulo || '" vence em ' || to_char(c.valido_ate at time zone 'America/Sao_Paulo', 'DD/MM') || '. Quer renovar ou criar outro?',
         '/parceiro/cupons'
    from public.cupons c join public.locais l on l.id = c.local_id
   where c.ativo and c.valido_ate between now() and now() + interval '2 days'
  union all
  -- Lista VIP com pedidos esperando, festa nas próximas 24h
  select 'vip_esperando:' || e.id || ':' || to_char(now() at time zone 'America/Sao_Paulo', 'YYYYMMDD'), l.id, l.nome, l.contato_telefone,
         'Tem gente esperando na Lista VIP', count(*) || ' pedido(s) esperando para "' || e.titulo || '". Aprove pelo app para a pessoa receber o QR.',
         '/parceiro/aprovacoes'
    from public.listas_vip_solicitacoes s join public.listas_vip lv on lv.id = s.lista_vip_id join public.eventos e on e.id = lv.evento_id join public.locais l on l.id = e.local_id
   where s.status::text = 'solicitada' and e.data_inicio between now() and now() + interval '24 hours'
   group by e.id, e.titulo, l.id, l.nome, l.contato_telefone
  union all
  -- Ingressos à venda sem Mercado Pago conectado
  select 'mp_desconectado:' || e.id, l.id, l.nome, l.contato_telefone,
         'Ingressos sem conta para receber', 'A venda de "' || e.titulo || '" está ligada, mas o Mercado Pago da casa não está conectado. Conecte em Meu espaço › Receber pagamentos.',
         '/parceiro/espaco'
    from public.eventos e join public.locais l on l.id = e.local_id
   where e.ingressos_ativos and e.data_inicio between now() and now() + interval '7 days'
     and not exists (select 1 from public.mp_contas m where m.local_id = l.id)
     and exists (select 1 from public.ingresso_lotes il where il.evento_id = e.id and il.ativo and il.preco_centavos > 0);
$$;
revoke all on function public.lembretes_das_casas() from public, anon, authenticated;

create or replace function public.enviar_lembretes_das_casas()
returns integer language plpgsql security definer set search_path = public as $$
declare r record; tokens text[]; n integer := 0;
begin
  for r in select * from public.lembretes_das_casas() x where not exists (select 1 from public.lembretes_enviados le where le.chave = x.chave) loop
    select array_agg(distinct d.token) into tokens
      from public.push_dispositivos d
     where d.ativo and (d.user_id = (select owner_id from public.locais where id = r.local_id)
                        or d.user_id in (select q.user_id from public.local_equipe q where q.local_id = r.local_id and q.modelo <> 'porta_pin'));
    if tokens is not null then
      perform public.enviar_push_expo(tokens, r.titulo, r.corpo, r.rota, 'lembretes');
      n := n + 1;
    end if;
    insert into public.lembretes_enviados (chave, local_id) values (r.chave, r.local_id) on conflict do nothing;
  end loop;
  delete from public.lembretes_enviados where enviado_em < now() - interval '60 days';
  return n;
end;
$$;
revoke all on function public.enviar_lembretes_das_casas() from public, anon, authenticated;

-- Para o Modo equipe: a lista de hoje (com telefone, para "Cobrar no WhatsApp") e se já foi avisado no app
create or replace function public.admin_lembretes_casas()
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Só a equipe Dicas.' using errcode = '42501'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('chave', x.chave, 'local_id', x.local_id, 'casa', x.casa, 'telefone', x.telefone,
                     'titulo', x.titulo, 'corpo', x.corpo, 'avisado_em', (select le.enviado_em from public.lembretes_enviados le where le.chave = x.chave)) order by x.casa)
                   from public.lembretes_das_casas() x), '[]'::jsonb);
end;
$$;
revoke execute on function public.admin_lembretes_casas() from public, anon;
grant execute on function public.admin_lembretes_casas() to authenticated;

-- 4) Agendamento (precisa do pg_cron ligado). Horário em UTC: 12:00 = 9h e 13:00 = 10h de Brasília.
do $$ begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid) from cron.job where jobname in ('resumo-equipe-9h', 'lembretes-casas-10h');
    perform cron.schedule('resumo-equipe-9h', '0 12 * * *', 'select public.enviar_resumo_equipe()');
    perform cron.schedule('lembretes-casas-10h', '0 13 * * *', 'select public.enviar_lembretes_das_casas()');
    raise notice 'Agendado: resumo da equipe 9h e lembretes das casas 10h.';
  else
    raise notice 'pg_cron desligado: ligue em Database › Extensions e rode esta migração de novo para agendar.';
  end if;
end $$;

-- Conferência
select public.texto_resumo_equipe() as resumo_de_hoje;
