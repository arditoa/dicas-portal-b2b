-- 133 — Modo equipe (app admin) (16/11/2026). Rode depois da 132. Seguro rodar mais de uma vez.
-- Só funções de LEITURA para a equipe Dicas (is_admin). As edições usam as tabelas que o admin já pode
-- editar (banners_app, home_caixas, categoria_patrocinio, locais, eventos, acoes_marca…).
--   admin_resumo()            → caixa de entrada do dia + números
--   admin_onde_aparece(local) → em que lugares do app uma casa aparece (e por quê)

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
      'fotos_marca', (select count(*) from public.memorias where enviar_para_marca and expira_em > now() and enviado_marca_em > now() - interval '7 days'),
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
revoke execute on function public.admin_resumo() from public, anon;
grant execute on function public.admin_resumo() to authenticated;

-- Onde uma casa aparece no app (lista de "lugares" com o motivo)
create or replace function public.admin_onde_aparece(p_local uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare l public.locais; v_plano text; saida jsonb := '[]'::jsonb;

begin
  if not public.is_admin() then raise exception 'Só a equipe Dicas.' using errcode = '42501'; end if;
  select * into l from public.locais where id = p_local;
  if not found then raise exception 'Local não encontrado.'; end if;
  v_plano := coalesce(l.plano_comercial::text, 'freemium');

  saida := saida || jsonb_build_array(jsonb_build_object('lugar', 'Busca e mapa', 'motivo', case when l.status = 'aprovado' then 'Casa aprovada' else 'NÃO aparece: status ' || l.status::text end, 'ok', l.status = 'aprovado'));
  saida := saida || jsonb_build_array(jsonb_build_object('lugar', 'Categoria: ' || l.categoria::text, 'motivo', 'Categoria principal', 'ok', true));
  saida := saida || coalesce((select jsonb_agg(jsonb_build_object('lugar', 'Categoria: ' || c.categoria::text, 'motivo', 'Categoria extra', 'ok', true))
                               from public.local_categorias_extra c where c.local_id = l.id), '[]'::jsonb);
  if v_plano = 'fundador' then
    saida := saida || jsonb_build_array(
      jsonb_build_object('lugar', 'Home · carrossel do topo', 'motivo', 'Banner de Membro Fundador (4 por hora)', 'ok', true),
      jsonb_build_object('lugar', 'Destaques (Membros Fundadores)', 'motivo', 'Fundador', 'ok', true),
      jsonb_build_object('lugar', 'Home · rodapé com logos', 'motivo', 'Fundador', 'ok', true));
  end if;
  if v_plano in ('premium', 'fundador') then
    saida := saida || jsonb_build_array(jsonb_build_object('lugar', 'Carrossel da categoria', 'motivo', 'Banner ' || initcap(v_plano) || ' (4 por hora)', 'ok', coalesce(l.plano_comercial_status::text, 'ativo') = 'ativo'));
  end if;
  saida := saida || coalesce((select jsonb_agg(jsonb_build_object('lugar',
              case when s = 'em_alta' then 'Home · caixa Em Alta' when s like 'caixa:%' then 'Home · caixa ' || coalesce((select h.titulo from public.home_caixas h where h.chave = substr(s, 7)), substr(s, 7)) else 'Seção ' || s end,
              'motivo', 'Escolha da equipe', 'ok', true))
            from unnest(coalesce(l.destaque_secoes, '{}')) s), '[]'::jsonb);
  saida := saida || coalesce((select jsonb_agg(jsonb_build_object('lugar', 'Patrocínio Master: ' || p.categoria, 'motivo', p.titulo, 'ok', p.ativo))
                               from public.categoria_patrocinio p where p.local_id = l.id), '[]'::jsonb);
  saida := saida || coalesce((select jsonb_agg(jsonb_build_object('lugar', 'Banner "' || b.titulo || '"', 'motivo', 'Em: ' || array_to_string(b.telas, ', '), 'ok', b.ativo, 'banner_id', b.id))
                               from public.banners_app b where b.destino = 'local:' || l.id::text), '[]'::jsonb);
  saida := saida || coalesce((select jsonb_agg(jsonb_build_object('lugar', 'Ação de marca: ' || a.marca, 'motivo', case when a.mostrar_no_app then 'Liberada (Ações da semana)' else 'Esperando a equipe liberar' end, 'ok', a.mostrar_no_app))
                               from public.acoes_marca a where a.local_id = l.id and a.ativa and a.fim >= (now() at time zone 'America/Sao_Paulo')::date), '[]'::jsonb);
  saida := saida || coalesce((select jsonb_agg(jsonb_build_object('lugar', 'Cupom "' || c.titulo || '"', 'motivo', 'Página da casa e ofertas da categoria', 'ok', true))
                               from public.cupons c where c.local_id = l.id and c.ativo and (c.valido_ate is null or c.valido_ate >= now())), '[]'::jsonb);
  saida := saida || coalesce((select jsonb_agg(jsonb_build_object('lugar', 'Festa "' || e.titulo || '"', 'motivo', to_char(e.data_inicio at time zone 'America/Sao_Paulo', 'DD/MM HH24:MI') || case when e.ingressos_ativos then ' · ingressos à venda' else '' end, 'ok', e.status = 'aprovado'))
                               from public.eventos e where e.local_id = l.id and coalesce(e.data_fim, e.data_inicio) >= now() and e.status <> 'cancelado'), '[]'::jsonb);
  saida := saida || coalesce((select jsonb_agg(jsonb_build_object('lugar', 'Enquete "' || q.titulo || '"', 'motivo', 'Prêmio: ' || q.premio, 'ok', true))
                               from public.enquetes_casa q where q.local_id = l.id and q.ativa and (now() at time zone 'America/Sao_Paulo')::date between q.inicio and q.fim), '[]'::jsonb);
  return jsonb_build_object('plano', v_plano, 'plano_status', coalesce(l.plano_comercial_status::text, 'ativo'), 'status', l.status::text,
    'mp_conectado', exists (select 1 from public.mp_contas m where m.local_id = l.id), 'lugares', saida);
end;
$$;
revoke execute on function public.admin_onde_aparece(uuid) from public, anon;
grant execute on function public.admin_onde_aparece(uuid) to authenticated;

-- Conferência
select to_regprocedure('public.admin_resumo()') as resumo, to_regprocedure('public.admin_onde_aparece(uuid)') as onde;
