-- 150 · Corrige o Início do Modo equipe (admin_resumo dava erro 400 e a tela ficava vazia).
-- Motivo: as fotos (memorias) passaram a ir para a CASA, não para a marca; a coluna enviar_para_marca não existe mais.
-- Agora conta as fotos enviadas para as casas nos últimos 7 dias (mesma chave 'fotos_marca' para o app não quebrar).
-- Seguro rodar mais de uma vez.
create or replace function public.admin_resumo()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_hoje timestamptz := ((now() at time zone 'America/Sao_Paulo')::date)::timestamp at time zone 'America/Sao_Paulo';
begin
  if not public.is_admin() then raise exception 'Só a equipe Dicas.' using errcode = '42501'; end if;
  return jsonb_build_object(
    'pendencias', jsonb_build_object(
      'casas', (select count(*) from public.locais where status = 'pendente'),
      'festas', (select count(*) from public.eventos where status = 'pendente'),
      'acoes_marca', (select count(*) from public.acoes_marca where ativa and not mostrar_no_app and fim >= (now() at time zone 'America/Sao_Paulo')::date),
      'fotos_marca', (select count(*) from public.memorias where enviar_para_casa and expira_em > now() and enviado_em > now() - interval '7 days'),
      'planos_interesse', (select count(*) from public.locais where plano_comercial_status::text in ('interesse', 'aguardando_pagamento'))
    ),
    'numeros', jsonb_build_object(
      'usuarios', (select count(*) from public.profiles),
      'usuarios_7d', (select count(*) from public.profiles where created_at > now() - interval '7 days'),
      'casas_no_ar', (select count(*) from public.locais where status = 'aprovado'),
      'checkins_hoje', (select count(*) from public.checkins where created_at >= v_hoje and cancelado_em is null),
      'presencas_marca_hoje', (select count(*) from public.acoes_marca_presencas where created_at >= v_hoje),
      'ingressos_hoje', (select count(*) from public.ingressos where status in ('valido', 'usado') and created_at >= v_hoje and not cortesia),
      'taxa_ingressos_hoje_centavos', (select coalesce(sum(taxa_centavos), 0) from public.ingresso_pedidos where status = 'pago' and pago_em >= v_hoje),
      'taxa_ingressos_mes_centavos', (select coalesce(sum(taxa_centavos), 0) from public.ingresso_pedidos where status = 'pago'
                                        and pago_em >= date_trunc('month', now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo'),
      'enquetes_hoje', (select count(*) from public.enquetes_respostas where created_at >= v_hoje)
    ),
    'planos', (select coalesce(jsonb_object_agg(p, n), '{}'::jsonb) from (
                 select coalesce(plano_comercial::text, 'freemium') as p, count(*) as n from public.locais where status = 'aprovado' group by 1) x)
  );
end;
$$;
revoke all on function public.admin_resumo() from public, anon;
grant execute on function public.admin_resumo() to authenticated;
notify pgrst, 'reload schema';
