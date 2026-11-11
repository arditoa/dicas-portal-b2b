-- 092 — Rodada 135: limpeza dos controles antigos do /admin (pedido da Andrea: "pode tirar até banco antigo").
--
-- O que muda:
--   locais.destaque_secoes  : sai 'patrocinado', 'destaque' (Destaque da Semana) e 'turismo' (Dicas Trip manual).
--                             Ficam 'em_alta', 'hoje' e 'selo_dicas', que o app ainda usa.
--   locais.plano_destaque   : todos voltam para 'basico' (a "Prioridade" antiga). A posição vem do plano.
--   locais.experiencias     : zeradas só nas marcas de Festas (lista de bar, não serve para festa).
--   locais.subcategoria     : 'Festa avulsa' vira 'Festas e baladas' (antes caía em "Outros" no app).
--   locais.arte_destaque_url: coluna apagada (a arte 1080×540 não aparecia em lugar nenhum do app).
--   eventos.destaque_secoes : sai 'destaque' (selo antigo de R$69).
--   eventos.plano_destaque  : todos voltam para 'basico'.
--
-- Colunas plano_destaque, destaque_secoes e experiencias NÃO são apagadas: o app que está na Apple ainda
-- pede essas colunas nas consultas; apagar quebraria as telas. Só os valores antigos saem.
--
-- Cópia de segurança antes de mudar: tabelas _backup_092_locais e _backup_092_eventos (com RLS ligada e sem
-- política, ou seja, invisíveis pelo app e pelo portal). Para desfazer, peça o SQL de restauração.
-- Rode uma vez, inteira, no SQL Editor. Tudo numa transação: se der erro, nada muda.

create table if not exists public._backup_092_locais as
  select id, destaque_secoes, plano_destaque, experiencias, subcategoria, arte_destaque_url, now() as copiado_em
    from public.locais;
alter table public._backup_092_locais enable row level security;

create table if not exists public._backup_092_eventos as
  select id, destaque_secoes, plano_destaque, now() as copiado_em
    from public.eventos;
alter table public._backup_092_eventos enable row level security;

do $$
begin
  -- Os gatilhos de proteção desfariam a mudança de campos de admin no SQL Editor (mesmo padrão da 088).
  alter table public.locais disable trigger before_update_locais;
  alter table public.eventos disable trigger before_update_eventos;

  update public.locais
     set destaque_secoes = array(select x from unnest(destaque_secoes) x where x not in ('patrocinado', 'destaque', 'turismo'))
   where destaque_secoes && array['patrocinado', 'destaque', 'turismo'];

  update public.locais set plano_destaque = 'basico' where plano_destaque is distinct from 'basico';

  update public.locais set experiencias = '{}'
   where categoria = 'eventos' and coalesce(array_length(experiencias, 1), 0) > 0;

  update public.locais set subcategoria = 'Festas e baladas'
   where categoria = 'eventos' and subcategoria = 'Festa avulsa';

  update public.eventos
     set destaque_secoes = array(select x from unnest(destaque_secoes) x where x <> 'destaque')
   where 'destaque' = any(destaque_secoes);

  update public.eventos set plano_destaque = 'basico' where plano_destaque is distinct from 'basico';

  alter table public.locais enable trigger before_update_locais;
  alter table public.eventos enable trigger before_update_eventos;
end $$;

alter table public.locais drop column if exists arte_destaque_url;

-- Conferência: deve voltar tudo zero.
select
  (select count(*) from public.locais where destaque_secoes && array['patrocinado', 'destaque', 'turismo']) as locais_secoes_antigas,
  (select count(*) from public.locais where plano_destaque <> 'basico') as locais_prioridade_antiga,
  (select count(*) from public.locais where categoria = 'eventos' and subcategoria = 'Festa avulsa') as marcas_festa_avulsa,
  (select count(*) from public.eventos where 'destaque' = any(destaque_secoes) or plano_destaque <> 'basico') as eventos_antigos;
