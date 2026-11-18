-- 134 — Avisos (push) pelo Modo equipe (16/11/2026). Rode depois da 133. Seguro rodar mais de uma vez.
-- * Tipo novo "marcas" no envio (ofertas de marcas parceiras; só para quem ligou esse aviso — migração 117).
-- * Público: todos que ligaram o tipo de aviso OU só quem esteve numa casa nos últimos 90 dias
--   (check-in, "Estou aqui", ingresso usado ou entrada pela Lista VIP). Sempre respeitando quem ligou o tipo.
-- * admin_publico_push: quantas pessoas recebem, por tipo, ANTES de enviar.
-- Depois de rodar, publique de novo a função "enviar-push" (arquivo supabase-functions/enviar-push/index.ts).

alter table public.push_envios drop constraint if exists push_envios_tipo_check;
do $$ begin
  alter table public.push_envios add constraint push_envios_tipo_check check (tipo in ('festas', 'cupons', 'lembretes', 'novidades', 'marcas'));
exception when duplicate_object then null; end $$;
alter table public.push_envios add column if not exists local_id uuid references public.locais(id) on delete set null;

-- Quem esteve na casa nos últimos 90 dias
create or replace function public.esteve_na_casa(p_user uuid, p_local uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.checkins c where c.user_id = p_user and c.local_id = p_local and c.cancelado_em is null and c.created_at > now() - interval '90 days')
      or exists (select 1 from public.acoes_marca_presencas p where p.user_id = p_user and p.local_id = p_local and p.created_at > now() - interval '90 days')
      or exists (select 1 from public.ingressos i join public.eventos e on e.id = i.evento_id
                  where i.user_id = p_user and e.local_id = p_local and i.status = 'usado' and i.usado_em > now() - interval '90 days')
      or exists (select 1 from public.listas_vip_solicitacoes s join public.listas_vip l on l.id = s.lista_vip_id join public.eventos e on e.id = l.evento_id
                  where s.user_id = p_user and e.local_id = p_local and s.status::text = 'check_in' and e.data_inicio > now() - interval '90 days');
$$;
revoke all on function public.esteve_na_casa(uuid, uuid) from public, anon, authenticated;

drop function if exists public.push_tokens_para(text);
create or replace function public.push_tokens_para(p_tipo text, p_local uuid default null)
returns table (token text) language sql security definer stable set search_path = public as $$
  select distinct d.token
    from public.push_dispositivos d
    join public.push_preferencias p on p.user_id = d.user_id
   where d.ativo
     and ((p_tipo = 'festas' and p.festas) or (p_tipo = 'cupons' and p.cupons) or (p_tipo = 'lembretes' and p.lembretes)
          or (p_tipo = 'novidades' and p.novidades) or (p_tipo = 'marcas' and coalesce(p.marcas, false)))
     and (p_local is null or public.esteve_na_casa(d.user_id, p_local));
$$;
revoke all on function public.push_tokens_para(text, uuid) from public, anon, authenticated;
grant execute on function public.push_tokens_para(text, uuid) to service_role;

-- Quantas PESSOAS recebem (por tipo), antes de enviar
create or replace function public.admin_publico_push(p_local uuid default null)
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Só a equipe Dicas.' using errcode = '42501'; end if;
  return (select jsonb_object_agg(t, n) from (
    select t, (select count(distinct d.user_id) from public.push_dispositivos d join public.push_preferencias p on p.user_id = d.user_id
                where d.ativo and ((t = 'festas' and p.festas) or (t = 'cupons' and p.cupons) or (t = 'lembretes' and p.lembretes)
                                   or (t = 'novidades' and p.novidades) or (t = 'marcas' and coalesce(p.marcas, false)))
                  and (p_local is null or public.esteve_na_casa(d.user_id, p_local))) as n
      from unnest(array['festas', 'cupons', 'lembretes', 'novidades', 'marcas']) t) x);
end;
$$;
revoke execute on function public.admin_publico_push(uuid) from public, anon;
grant execute on function public.admin_publico_push(uuid) to authenticated;

-- Conferência
select public.push_tokens_para('festas') is not null as ok;
