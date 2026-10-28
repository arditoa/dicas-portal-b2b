-- 063 — Liga o banner de EXEMPLO "Bares by Ambev" (criado desligado pela 062) só para TESTE, por 14 dias.
-- Depois desse prazo ele some sozinho (campo "fim"). Para desligar antes: /admin > Vitrine das categorias > Bares > desmarcar "Ativo".
-- Só mexe no exemplo (etiqueta com "EXEMPLO"); não altera um patrocínio real de Bares.
update public.categoria_patrocinio
   set ativo = true,
       inicio = now(),
       fim = now() + interval '14 days'
 where categoria = 'bares'
   and tag ilike '%EXEMPLO%';
