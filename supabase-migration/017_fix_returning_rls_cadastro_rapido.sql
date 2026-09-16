-- ============================================================================
-- 017 - Corrige "new row violates row-level security policy for table
-- locais/eventos" no /cadastro/rapido (aditivo, nao recria nada existente)
-- ============================================================================
-- Contexto: depois da 016 corrigir o erro de FK (owner_id orfao), o
-- /cadastro/rapido passou a bater num segundo problema, mais sutil: o
-- codigo do portal faz `.insert({...}).select('id').single()` pra pegar o
-- id da linha recem-criada (precisa dele pra depois anexar a foto). Esse
-- `.select()` faz o Postgres pedir o RETURNING da linha inserida - e pra
-- devolver essa linha, o Postgres tambem precisa que ela passe pela
-- POLICY DE SELECT da tabela, nao so pela de insert. A policy de select
-- (`locais_select_aprovados_ou_dono`) so permite ver linhas aprovadas, ou
-- a propria (dono = auth.uid()), ou admin - uma linha recem-criada por um
-- visitante anonimo (pendente, owner_id nulo, auth.uid() nulo) nao bate em
-- nenhuma das tres, entao o Postgres recusa devolver a linha e o
-- supabase-js reporta isso como "new row violates row-level security
-- policy" (mesma frase do erro de insert, mas a causa aqui e o RETURNING,
-- nao o INSERT em si - o INSERT sempre foi permitido, `with check (true)`).
--
-- Esse buraco e antigo (existe desde a Rodada 9) mas so apareceu agora
-- porque, antes da 016, o cadastro de sessao orfa nunca chegava a esse
-- ponto - travava antes, no erro de FK. Corrigido o FK, o cadastro
-- anonimo "de verdade" (sem sessao nenhuma) passou a completar o INSERT e
-- bater direto nesse segundo problema.
--
-- Solucao: 2 funcoes SECURITY DEFINER por tabela (locais/eventos), que
-- fazem o insert/update por dentro do banco (sem depender do RETURNING
-- do cliente bater a policy de select) - os triggers de sempre
-- (enforce_*_seguro_insert) continuam rodando normalmente e continuam
-- sendo a unica fonte de verdade pra status/owner_id/plano_destaque etc.,
-- entao isso nao abre nenhuma porta nova: so contorna a exigencia de
-- SELECT que o RETURNING impoe. A funcao de foto e deliberadamente
-- restrita a linhas ainda pendentes E ainda sem dono (`status = 'pendente'
-- and owner_id/criado_por is null`) - ou seja, so funciona na mesma janela
-- em que o cadastro rapido anonimo ja podia editar livremente; depois de
-- aprovado ou vinculado a uma conta, essa porta se fecha sozinha.
--
-- Testado localmente (Postgres 16, RLS real simulada com role
-- nao-superusuario): anonimo cria local/evento e recebe o id de volta;
-- anonimo anexa foto no proprio cadastro ainda pendente; depois que um
-- admin de verdade aprova e vincula um dono, uma segunda tentativa de
-- trocar a foto pelo mesmo caminho e corretamente recusada (confirmado
-- que a foto legitima anterior nao e sobrescrita); reaplicacao do arquivo
-- duas vezes seguidas sem erro.
-- ============================================================================

create or replace function public.cadastro_rapido_criar_local(
  p_nome text,
  p_categoria text,
  p_cnpj text,
  p_contato_telefone text,
  p_instagram text,
  p_bairro text,
  p_cidade text,
  p_lat double precision,
  p_lng double precision,
  p_publico_tags text[]
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  insert into public.locais (
    nome, categoria, cnpj, contato_telefone, instagram,
    bairro, cidade, lat, lng, publico_tags
  ) values (
    p_nome,
    p_categoria::public.categoria_tipo,
    p_cnpj,
    p_contato_telefone,
    p_instagram,
    p_bairro,
    coalesce(p_cidade, 'São Paulo'),
    p_lat,
    p_lng,
    coalesce(p_publico_tags, array['todos'])::public.publico_tag[]
  )
  returning id into v_id;

  return v_id;
end;
$$;

grant execute on function public.cadastro_rapido_criar_local(
  text, text, text, text, text, text, text, double precision, double precision, text[]
) to anon, authenticated;

create or replace function public.cadastro_rapido_definir_foto_local(
  p_id uuid,
  p_url text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.locais
    set foto_capa_url = p_url
    where id = p_id
      and status = 'pendente'
      and owner_id is null;

  return found;
end;
$$;

grant execute on function public.cadastro_rapido_definir_foto_local(uuid, text) to anon, authenticated;

create or replace function public.cadastro_rapido_criar_evento(
  p_titulo text,
  p_descricao text,
  p_data_inicio timestamptz,
  p_estilos_musicais text[],
  p_publico_tags text[]
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  insert into public.eventos (
    titulo, descricao, data_inicio, estilos_musicais, publico_tags
  ) values (
    p_titulo,
    p_descricao,
    p_data_inicio,
    coalesce(p_estilos_musicais, array[]::text[])::public.estilo_musical[],
    coalesce(p_publico_tags, array['todos'])::public.publico_tag[]
  )
  returning id into v_id;

  return v_id;
end;
$$;

grant execute on function public.cadastro_rapido_criar_evento(
  text, text, timestamptz, text[], text[]
) to anon, authenticated;

create or replace function public.cadastro_rapido_definir_foto_evento(
  p_id uuid,
  p_url text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.eventos
    set foto_capa_url = p_url
    where id = p_id
      and status = 'pendente'
      and criado_por is null;

  return found;
end;
$$;

grant execute on function public.cadastro_rapido_definir_foto_evento(uuid, text) to anon, authenticated;
