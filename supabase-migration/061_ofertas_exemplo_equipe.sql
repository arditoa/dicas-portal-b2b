-- 061 — Quatro ofertas da equipe para o carrossel lateral de ofertas das categorias.
-- Ficam no local cujo nome contém 'vezpa' (troque o texto abaixo para outro local, se quiser) e podem ser
-- movidas/editadas depois em /admin > Vitrine das categorias > Ofertas da equipe.
-- Precisa da 059 rodada antes. Seguro rodar mais de uma vez (não duplica).
do $$
declare
  v_local uuid;
  v_titulo text;
begin
  select id into v_local from public.locais where nome ilike '%vezpa%' order by created_at limit 1;
  if v_local is null then
    raise notice 'Nenhum local com "vezpa" no nome — ajuste o filtro no script.';
    return;
  end if;
  foreach v_titulo in array array['2 caipirinhas por R$ 49', 'Batata grátis para o date', 'Entrada free', 'Tome 3 pague 2'] loop
    if not exists (select 1 from public.cupons c where c.local_id = v_local and c.titulo = v_titulo) then
      insert into public.cupons (local_id, titulo, ativo, criado_pela_equipe) values (v_local, v_titulo, true, true);
    end if;
  end loop;
end $$;
