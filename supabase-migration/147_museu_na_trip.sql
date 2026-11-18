-- 147 · Museu da Diversidade Sexual também como casa de viagem (Dicas Trip):
-- categoria principal continua Cultura; Turismo entra como categoria extra.
-- Assim ele roda no Topo 2 da aba Trip e no Topo 2 da página de São Paulo, com o mesmo banner de Fundador.
insert into public.local_categorias_extra (local_id, categoria, subcategoria)
values ('a69cff13-1cdb-4d21-bfd9-82a8362e0601', 'turismo', 'Museu')
on conflict do nothing;

-- Conferir:
select l.nome, l.categoria, l.plano_comercial, x.categoria as extra, x.subcategoria
from public.locais l left join public.local_categorias_extra x on x.local_id = l.id
where l.id = 'a69cff13-1cdb-4d21-bfd9-82a8362e0601';
