-- 162 · 18/11/2026 — Festa sem aprovação do Adm para casa já aprovada.
-- Regra: depois que o perfil (local) foi aprovado pela equipe Dicas, quem tem a permissão 'festa' na casa
-- publica festas e agenda direto, sem passar por análise. A agenda da semana já não tinha análise.
--   • Festa nova de casa aprovada nasce 'aprovado'. Casa ainda não aprovada (ou cadastro sem casa) continua 'pendente'.
--   • Festa aprovada que muda nome/data NÃO volta mais para análise quando a casa é aprovada.
--   • Festas que estavam 'pendente' de casa aprovada passam a 'aprovado' na próxima edição (e já agora, abaixo).
--   • A equipe Dicas continua podendo cancelar/reprovar pelo Adm (admin não passa por esta regra).
--   • Lista VIP marcada sem a permissão 'lista_vip' nasce sozinha também na festa que já entra aprovada.

create or replace function public.casa_publica_direto(p_local uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select p_local is not null
     and exists (select 1 from public.locais l where l.id = p_local and l.status = 'aprovado')
     and public.pode_no_local(p_local, 'festa');
$$;

create or replace function public.enforce_evento_seguro_insert()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.status := case when public.casa_publica_direto(new.local_id) then 'aprovado' else 'pendente' end;
  new.plano_destaque := 'basico';
  new.criado_por := auth.uid();
  return new;
end;
$$;

create or replace function public.protect_admin_fields_eventos()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  campos_sensiveis_mudaram boolean;
begin
  if pg_trigger_depth() > 1 then
    return new;
  end if;
  if public.is_admin() or auth.role() = 'service_role' then
    return new;
  end if;
  if current_setting('dicas.festa_do_plano', true) = 'on' then
    return new;
  end if;
  new.plano_destaque := old.plano_destaque;
  new.criado_por := old.criado_por;
  new.destaque_ate := old.destaque_ate;
  new.destaque_secao_fixada := old.destaque_secao_fixada;
  new.destaque_secoes := old.destaque_secoes;
  if new.status = 'cancelado' then
    return new;
  end if;
  if old.status = 'cancelado' then
    new.status := old.status;
    return new;
  end if;
  -- 162: casa aprovada publica direto (inclusive troca de nome/data). Reprovada pela equipe continua reprovada.
  if public.casa_publica_direto(new.local_id) and old.status in ('pendente', 'aprovado') then
    new.status := 'aprovado';
    return new;
  end if;
  if new.status = 'aprovado' then
    new.status := old.status;
  end if;
  if old.status = 'aprovado' then
    campos_sensiveis_mudaram := (
      new.data_inicio is distinct from old.data_inicio
      or new.data_fim is distinct from old.data_fim
      or new.local_id is distinct from old.local_id
      or new.titulo is distinct from old.titulo
    );
    new.status := case when campos_sensiveis_mudaram then 'pendente' else old.status end;
  end if;
  return new;
end;
$$;

-- Lista VIP que nasce sozinha quando a festa já entra aprovada (quem cadastrou sem a permissão 'lista_vip';
-- com a permissão, o app cria a lista na hora e aqui não duplica).
create or replace function public.criar_lista_vip_ao_inserir_aprovado()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'aprovado' and new.quer_lista_vip and not public.pode_no_local(new.local_id, 'lista_vip') then
    insert into public.listas_vip (evento_id, titulo, ativa)
    select new.id, 'Lista VIP', true
    where not exists (select 1 from public.listas_vip lv where lv.evento_id = new.id);
  end if;
  return new;
end;
$$;
drop trigger if exists criar_lista_vip_ao_inserir_aprovado on public.eventos;
create trigger criar_lista_vip_ao_inserir_aprovado after insert on public.eventos
  for each row execute function public.criar_lista_vip_ao_inserir_aprovado();

-- Festas futuras que ficaram 'pendente' em casa aprovada: libera agora.
update public.eventos e set status = 'aprovado'
  from public.locais l
 where l.id = e.local_id and l.status = 'aprovado' and e.status = 'pendente' and e.data_inicio > now() - interval '12 hours';

-- Conferir
select status, count(*) from public.eventos group by 1 order by 1;
