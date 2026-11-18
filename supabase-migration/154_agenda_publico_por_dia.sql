-- 154 · Público predominante por dia na Agenda dos bares (pedido da Andrea, 16/11/2026).
--   Cada programação da agenda (agenda_semanal) pode ter o público daquela noite
--   (ex.: quinta das meninas = 'lesbica', sábado dos ursos = 'ursos').
--   Vazio = o app usa a "Predominância de público" do cadastro do bar (locais.publico_tags).
-- Seguro rodar mais de uma vez.

alter table public.agenda_semanal add column if not exists publico text;

alter table public.agenda_semanal drop constraint if exists agenda_semanal_publico_ck;
alter table public.agenda_semanal add constraint agenda_semanal_publico_ck
  check (publico is null or publico in ('gay', 'lesbica', 'misto_lgbt', 'trans', 'ursos', 'drag', 'aliados'));

notify pgrst, 'reload schema';
