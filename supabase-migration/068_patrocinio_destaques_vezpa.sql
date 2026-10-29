-- 068 — Patrocínio master da aba Destaques (Membros Fundadores): Vezpa Bar & Rooftop.
-- Liga o único slot de patrocínio da categoria "destaques" ao local cujo nome contém 'vezpa'
-- (o clique abre a página do local). Pode ser editado/desligado em /admin > Vitrine das categorias > Destaques.
-- Seguro rodar mais de uma vez. Precisa da 059 rodada antes.
do $$
declare
  v_local uuid;
begin
  select id into v_local from public.locais where nome ilike '%vezpa%' order by created_at limit 1;
  insert into public.categoria_patrocinio (categoria, local_id, tag, titulo, subtitulo, cta, destino, cor1, cor2, ativo, inicio, fim)
  values (
    'destaques', v_local, 'PATROCINADOR MASTER', 'Vezpa Bar & Rooftop',
    'O Vezpa Bar & Rooftop apoia os Membros Fundadores e a construção desta comunidade.',
    'Conhecer', coalesce('local:' || v_local::text, ''), '#E1306C', '#7E57C2', true, null, null
  )
  on conflict (categoria) do update set
    local_id = excluded.local_id, tag = excluded.tag, titulo = excluded.titulo, subtitulo = excluded.subtitulo,
    cta = excluded.cta, destino = excluded.destino, cor1 = excluded.cor1, cor2 = excluded.cor2,
    ativo = true, inicio = null, fim = null;
end $$;
select categoria, titulo, destino, ativo from public.categoria_patrocinio where categoria = 'destaques';
