-- ============================================================================
-- 073 — Agenda da semana dos bares vai para a aba EVENTOS ("Essa semana")
-- ============================================================================
-- Pedido da Andrea: "em eventos colocar a opção 'essa semana' como filtro,
-- porque os bares poderão subir a agenda da semana (a agenda da semana não
-- irá para o perfil, e sim para a aba eventos)".
--
-- Reaproveita a tabela public.agenda_semanal (migration 023) — NADA é apagado:
--   * linhas antigas (data = null) viram "toda semana" (ex.: "toda segunda:
--     karaokê"), continuam valendo e passam a aparecer em Eventos.
--   * linhas novas com `data` preenchida valem só para aquele dia/semana.
--   * tipo = 'semana' é o cartaz (flyer) da semana inteira; data = segunda-feira.
--
-- Rode inteira no SQL Editor (não mexe em enum, pode rodar de uma vez).
-- ============================================================================

alter table public.agenda_semanal add column if not exists data date;
alter table public.agenda_semanal add column if not exists horario text;
alter table public.agenda_semanal add column if not exists tipo text not null default 'dia';

do $$ begin
  alter table public.agenda_semanal
    add constraint agenda_semanal_tipo_valido check (tipo in ('dia', 'semana'));
exception when duplicate_object then null;
end $$;

-- Mantém dia_semana coerente com a data (0 = domingo ... 6 = sábado), mesmo
-- se algum cliente mandar errado.
create or replace function public.agenda_semanal_ajusta_dia()
returns trigger language plpgsql as $$
begin
  if new.data is not null then
    new.dia_semana := extract(dow from new.data)::smallint;
  end if;
  return new;
end $$;

drop trigger if exists agenda_semanal_ajusta_dia on public.agenda_semanal;
create trigger agenda_semanal_ajusta_dia
  before insert or update on public.agenda_semanal
  for each row execute function public.agenda_semanal_ajusta_dia();

create index if not exists agenda_semanal_data_idx
  on public.agenda_semanal (data) where ativo;

comment on column public.agenda_semanal.data is
  'Rodada 126: data exata do dia (só naquela semana). Null = repete toda semana no dia_semana.';
comment on column public.agenda_semanal.horario is
  'Rodada 126: horário livre (ex.: "21h", "a partir das 22h").';
comment on column public.agenda_semanal.tipo is
  'Rodada 126: dia = atração de um dia; semana = cartaz/flyer da semana inteira (data = segunda-feira).';
comment on table public.agenda_semanal is
  'Rodada 126: agenda do bar publicada SÓ na aba Eventos > "Essa semana" do app (não aparece mais no perfil do local). Preenchida pelo dono em Agenda da semana no portal B2B.';
