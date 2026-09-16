-- Rodada 32 -- bug real reportado pela Andrea: cadastro anonimo em
-- /cadastro/rapido deu "insert or update on table \"locais\" violates
-- foreign key constraint \"locais_owner_id_fkey\"".
--
-- Causa: o trigger `enforce_local_seguro_insert()` (001_migrar_para_locais.sql)
-- forca `new.owner_id := auth.uid();` em TODO insert, sem checar se esse
-- auth.uid() tem mesmo uma linha correspondente em `public.profiles`. Isso
-- funciona quando quem esta cadastrando esta de fato deslogado (auth.uid()
-- e null, e null nunca viola foreign key) ou logado com uma conta cujo
-- profile existe -- mas quebra se o navegador tiver uma sessao "orfa"
-- guardada (um token de login antigo, ainda valido, de uma conta cujo
-- profile foi apagado depois, por exemplo limpeza manual de dado de teste
-- direto no Table Editor) -- nesse caso auth.uid() devolve um uuid de
-- verdade, so que sem par em profiles, e o insert trava.
--
-- Fix: em vez de confiar cegamente em auth.uid(), so usar esse valor como
-- owner_id se ele realmente existir em profiles -- senao, cai pra null
-- (equivalente a cadastro anonimo, nunca trava o cadastro por causa de
-- uma sessao orfa). Aditivo: substitui so o corpo da funcao, o trigger
-- que ja existe continua apontando pro mesmo nome, nao precisa recriar.

create or replace function public.enforce_local_seguro_insert()
returns trigger as $$
begin
  new.status := 'pendente';
  new.safe_space := false;
  new.plano_destaque := 'basico';
  new.destaque_ate := null;
  new.owner_id := (select id from public.profiles where id = auth.uid());
  new.rating_media := 0;
  new.rating_total := 0;
  return new;
end;
$$ language plpgsql security definer set search_path = public;
