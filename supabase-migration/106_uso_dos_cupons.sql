-- 106 — Quantas vezes cada cupom foi usado (tela Cupons do Modo parceiro, 13/11/2026).
--
-- Antes: cupons_resgatados só deixa cada pessoa ler os PRÓPRIOS resgates (política cupons_resgatados_dono, 001).
-- Por isso o "X resgatados" do portal (dashboard/cupons, que lê cupons_resgatados(count)) mostra sempre 0
-- para o dono, e o app não tinha como mostrar o uso de cada cupom.
-- Agora: a função uso_dos_cupons devolve só a CONTAGEM por cupom (nunca quem usou), para quem tem a permissão
-- 'cupons' ou 'resultados' no local (dono, admin e equipe, pela pode_no_local da 099).
-- Não muda nenhuma tabela nem política. Seguro rodar mais de uma vez. Rode depois da 099.
-- (O portal pode trocar o cupons_resgatados(count) por esta função quando for mexido.)

create or replace function public.uso_dos_cupons(p_local uuid)
returns table (cupom_id uuid, resgates integer, ultimo_uso timestamptz)
language plpgsql stable security definer
set search_path = public
as $$
begin
  if not (public.pode_no_local(p_local, 'cupons') or public.pode_no_local(p_local, 'resultados')) then
    raise exception 'Sem permissão para ver o uso dos cupons deste local.' using errcode = '42501';
  end if;
  return query
    select c.id, count(r.id)::integer, max(r.resgatado_em)
      from public.cupons c
      left join public.cupons_resgatados r on r.cupom_id = c.id
     where c.local_id = p_local
     group by c.id;
end;
$$;
revoke execute on function public.uso_dos_cupons(uuid) from public, anon;
grant execute on function public.uso_dos_cupons(uuid) to authenticated;

-- Conferência (troque pelo id de um local seu, logado como dono, ou rode como admin):
-- select * from public.uso_dos_cupons('00000000-0000-0000-0000-000000000000');
