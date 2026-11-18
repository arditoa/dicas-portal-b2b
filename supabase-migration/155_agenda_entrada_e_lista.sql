-- 155 · Agenda dos bares: entrada (grátis ou paga) e "nome na lista" por noite (pedido da Andrea, 18/11/2026).
--   entrada: 'gratis' | 'pago' | null (não informado)
--   lista:   true = a noite tem nome na lista (como colocar o nome: no link da programação)
-- Seguro rodar mais de uma vez.

alter table public.agenda_semanal add column if not exists entrada text;
alter table public.agenda_semanal add column if not exists lista boolean not null default false;

alter table public.agenda_semanal drop constraint if exists agenda_semanal_entrada_ck;
alter table public.agenda_semanal add constraint agenda_semanal_entrada_ck
  check (entrada is null or entrada in ('gratis', 'pago'));

notify pgrst, 'reload schema';
