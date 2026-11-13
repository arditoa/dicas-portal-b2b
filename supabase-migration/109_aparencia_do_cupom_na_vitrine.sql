-- 109 — Um cupom, dois lugares (13/11/2026).
--
-- O cupom é o MESMO nos dois lugares (nome, regra, dias, horário, validade, limite do plano):
--   • na página da casa, a linha de ticket com "Usar" (não muda);
--   • na faixa de Ofertas da categoria, o cartão ganha uma APARÊNCIA OPCIONAL, como o banner:
--     oferta em destaque (até 24), detalhe (até 30), fundo em degradê do app ou foto (com véu escuro) e cor dos dizeres.
--   Sem aparência, o cartão segue automático como hoje (oferta e detalhe tirados do título, degradê magenta→azul).
-- Foto em fotos-locais/<local_id>/cupom-… (só do próprio local). Equipe com 'cupons' pode subir essa foto.
-- Seguro rodar mais de uma vez. Rode depois da 099 (e da 103).

alter table public.cupons add column if not exists vitrine_oferta text;
alter table public.cupons add column if not exists vitrine_detalhe text;
alter table public.cupons add column if not exists vitrine_foto_url text;
alter table public.cupons add column if not exists vitrine_estilo text;
alter table public.cupons add column if not exists vitrine_cor1 text;
alter table public.cupons add column if not exists vitrine_cor2 text;
alter table public.cupons add column if not exists vitrine_cor_texto text;

alter table public.cupons drop constraint if exists cupons_vitrine_valida;
alter table public.cupons add constraint cupons_vitrine_valida check (
  (vitrine_oferta is null or char_length(vitrine_oferta) <= 24)
  and (vitrine_detalhe is null or char_length(vitrine_detalhe) <= 30)
  and (vitrine_estilo is null or vitrine_estilo in ('degrade', 'foto'))
  and (vitrine_cor1 is null or vitrine_cor1 ~ '^#[0-9A-Fa-f]{6}$')
  and (vitrine_cor2 is null or vitrine_cor2 ~ '^#[0-9A-Fa-f]{6}$')
  and (vitrine_cor_texto is null or vitrine_cor_texto ~ '^#[0-9A-Fa-f]{6}$')
  -- foto só do próprio local, no bucket fotos-locais, com nome "cupom-…" (nada de link de fora)
  and (vitrine_foto_url is null or position(('/storage/v1/object/public/fotos-locais/' || local_id::text || '/cupom-') in vitrine_foto_url) > 0)
);

comment on column public.cupons.vitrine_oferta is 'Etapa "um cupom, dois lugares": oferta em destaque no cartão da faixa de Ofertas (até 24). Null = automático pelo título.';

-- Equipe com 'cupons' sobe a foto do cartão (o dono já podia pela 007)
drop policy if exists "fotos_locais_cupom_insert_equipe" on storage.objects;
create policy "fotos_locais_cupom_insert_equipe" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'fotos-locais' and (storage.filename(name)) like 'cupom-%'
    and public.pode_no_local(public.uuid_ou_nulo((storage.foldername(name))[1]), 'cupons')
  );
drop policy if exists "fotos_locais_cupom_update_equipe" on storage.objects;
create policy "fotos_locais_cupom_update_equipe" on storage.objects for update to authenticated
  using (
    bucket_id = 'fotos-locais' and (storage.filename(name)) like 'cupom-%'
    and public.pode_no_local(public.uuid_ou_nulo((storage.foldername(name))[1]), 'cupons')
  );
drop policy if exists "fotos_locais_cupom_delete_equipe" on storage.objects;
create policy "fotos_locais_cupom_delete_equipe" on storage.objects for delete to authenticated
  using (
    bucket_id = 'fotos-locais' and (storage.filename(name)) like 'cupom-%'
    and public.pode_no_local(public.uuid_ou_nulo((storage.foldername(name))[1]), 'cupons')
  );

-- Conferência: 7 colunas e 3 políticas.
select column_name from information_schema.columns where table_schema = 'public' and table_name = 'cupons' and column_name like 'vitrine_%' order by 1;
select policyname from pg_policies where policyname like 'fotos_locais_cupom_%' order by 1;
