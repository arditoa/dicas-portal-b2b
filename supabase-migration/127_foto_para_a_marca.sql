-- 127 — Foto com a moldura: enviar para a marca e deixar a marca postar (15/11/2026). Rode depois da 126.
-- Na tela da foto com a moldura, a pessoa pode, com autorizações SEPARADAS e registradas:
--   1) enviar_para_marca: a foto vai para a marca (só a marca e a equipe Dicas veem; não fica pública);
--   2) marca_pode_publicar: a marca pode postar nas redes sociais dela, com crédito ao app.
--   As duas exigem "todas as pessoas da foto têm 18+ e concordam" (todos_concordam).
-- A foto fica também em Minhas memórias, onde a pessoa retira as autorizações ou apaga quando quiser. Vence em 90 dias.
-- Quem vê: a pessoa e a equipe Dicas (admin), que entrega para a marca. A casa NÃO vê (a não ser que a pessoa envie para a casa).
-- Seguro rodar mais de uma vez.

alter table public.memorias add column if not exists enviar_para_marca boolean not null default false;
alter table public.memorias add column if not exists marca_pode_publicar boolean not null default false;
alter table public.memorias add column if not exists enviado_marca_em timestamptz;
alter table public.memorias add column if not exists publicar_marca_em timestamptz;
do $$ begin
  alter table public.memorias add constraint memorias_marca_publicar_exige check (not marca_pode_publicar or (enviar_para_marca and todos_concordam));
exception when duplicate_object then null; end $$;
create index if not exists memorias_acao_idx on public.memorias(acao_id, created_at desc) where enviar_para_marca;

create or replace function public.memorias_regras()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    new.oculta_pela_casa := false;
    new.expira_em := now() + interval '90 days';
  else
    -- Quem não é o dono da foto (a casa, pela função casa_ocultar_memoria) só muda "oculta_pela_casa".
    if auth.uid() is distinct from old.user_id then
      new := old;
      new.oculta_pela_casa := true;
      return new;
    end if;
    new.user_id := old.user_id; new.caminho := old.caminho; new.created_at := old.created_at;
    new.local_id := old.local_id; new.expira_em := old.expira_em; new.oculta_pela_casa := old.oculta_pela_casa;
    new.acao_id := old.acao_id;
  end if;
  -- Enviar para a casa só para casa Premium/Fundador ativa
  if new.enviar_para_casa and (new.local_id is null or not public.local_premium_ativo(new.local_id)) then
    raise exception 'Esta casa não recebe fotos pelo app.' using errcode = 'P0001';
  end if;
  if not new.enviar_para_casa then new.casa_pode_publicar := false; end if;
  if new.casa_pode_publicar and not new.todos_concordam then
    raise exception 'Para a casa publicar, confirme que todas as pessoas da foto concordam.' using errcode = 'P0001';
  end if;
  -- Enviar para a marca: só foto de uma ação de marca; postar exige "todos concordam".
  if new.enviar_para_marca and new.acao_id is null then
    raise exception 'Esta foto não é de uma ação de marca.' using errcode = 'P0001';
  end if;
  if new.enviar_para_marca and tg_op = 'INSERT' and not exists (select 1 from public.acoes_marca where id = new.acao_id and ativa) then
    raise exception 'Esta ação de marca não está mais no ar.' using errcode = 'P0001';
  end if;
  if new.enviar_para_marca and not new.todos_concordam then
    raise exception 'Para enviar para a marca, confirme que todas as pessoas da foto concordam.' using errcode = 'P0001';
  end if;
  if not new.enviar_para_marca then new.marca_pode_publicar := false; end if;
  if new.enviar_para_marca and (tg_op = 'INSERT' or not old.enviar_para_marca) then new.enviado_marca_em := now(); end if;
  if new.marca_pode_publicar and (tg_op = 'INSERT' or not old.marca_pode_publicar) then new.publicar_marca_em := now(); end if;
  if tg_op = 'UPDATE' and ((old.enviar_para_marca and not new.enviar_para_marca) or (old.marca_pode_publicar and not new.marca_pode_publicar)) then
    new.revogado_em := now();
  end if;
  -- Datas de cada autorização
  if new.enviar_para_casa and (tg_op = 'INSERT' or not old.enviar_para_casa) then new.enviado_em := now(); end if;
  if new.casa_pode_publicar and (tg_op = 'INSERT' or not old.casa_pode_publicar) then new.publicar_em := now(); end if;
  if tg_op = 'UPDATE' and ((old.enviar_para_casa and not new.enviar_para_casa) or (old.casa_pode_publicar and not new.casa_pode_publicar)) then
    new.revogado_em := now();
  end if;
  return new;
end;
$$;
create or replace function public.memorias_registro()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'DELETE' then
    insert into public.memorias_consentimentos (memoria_id, user_id, local_id, acao) values (old.id, old.user_id, old.local_id, 'apagar');
    return old;
  end if;
  if new.enviar_para_casa and (tg_op = 'INSERT' or not old.enviar_para_casa) then
    insert into public.memorias_consentimentos (memoria_id, user_id, local_id, acao, todos_concordam, texto_versao) values (new.id, new.user_id, new.local_id, 'enviar', new.todos_concordam, new.texto_versao);
  end if;
  if new.casa_pode_publicar and (tg_op = 'INSERT' or not old.casa_pode_publicar) then
    insert into public.memorias_consentimentos (memoria_id, user_id, local_id, acao, todos_concordam, texto_versao) values (new.id, new.user_id, new.local_id, 'publicar', new.todos_concordam, new.texto_versao);
  end if;
  if tg_op = 'UPDATE' and old.enviar_para_casa and not new.enviar_para_casa then
    insert into public.memorias_consentimentos (memoria_id, user_id, local_id, acao) values (new.id, new.user_id, new.local_id, 'retirar_envio');
  elsif tg_op = 'UPDATE' and old.casa_pode_publicar and not new.casa_pode_publicar then
    insert into public.memorias_consentimentos (memoria_id, user_id, local_id, acao) values (new.id, new.user_id, new.local_id, 'retirar_publicacao');
  end if;
  -- Marca
  if new.enviar_para_marca and (tg_op = 'INSERT' or not old.enviar_para_marca) then
    insert into public.memorias_consentimentos (memoria_id, user_id, local_id, acao, todos_concordam, texto_versao) values (new.id, new.user_id, new.local_id, 'enviar_marca', new.todos_concordam, new.texto_versao);
  end if;
  if new.marca_pode_publicar and (tg_op = 'INSERT' or not old.marca_pode_publicar) then
    insert into public.memorias_consentimentos (memoria_id, user_id, local_id, acao, todos_concordam, texto_versao) values (new.id, new.user_id, new.local_id, 'publicar_marca', new.todos_concordam, new.texto_versao);
  end if;
  if tg_op = 'UPDATE' and old.enviar_para_marca and not new.enviar_para_marca then
    insert into public.memorias_consentimentos (memoria_id, user_id, local_id, acao) values (new.id, new.user_id, new.local_id, 'retirar_envio_marca');
  elsif tg_op = 'UPDATE' and old.marca_pode_publicar and not new.marca_pode_publicar then
    insert into public.memorias_consentimentos (memoria_id, user_id, local_id, acao) values (new.id, new.user_id, new.local_id, 'retirar_publicacao_marca');
  end if;
  return new;
end;
$$;

-- Resultado da ação: fotos + check-ins + fotos enviadas para a marca
create or replace function public.fotos_da_acao(p_acao uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_local uuid;
begin
  select local_id into v_local from public.acoes_marca where id = p_acao;
  if not found then raise exception 'Ação não encontrada.'; end if;
  if not public.is_admin() and (v_local is null or not public.pode_no_local(v_local, 'resultados')) then
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

-- Conferência
select count(*) filter (where enviar_para_marca) as enviadas_marca from public.memorias;
