-- 159 · Bairro e cidade sempre no mesmo formato (18/11/2026): "Jardim Paulista", "República", "Consolação".
--   Cadastros vêm como "REPUBLICA", "republica", "CONSOLACAO" e o filtro de bairro mostrava repetido.
--   1) função nome_bonito(): primeira letra maiúscula, "de/da/do/dos/das/e" minúsculas, acentos dos nomes comuns.
--   2) gatilho em locais: todo cadastro novo ou editado (portal, app do parceiro, Modo equipe) já salva assim.
--   3) arruma os que já estão no banco.
-- Seguro rodar mais de uma vez.

create or replace function public.nome_bonito(p text)
returns text language plpgsql immutable as $$
declare
  t text := btrim(regexp_replace(coalesce(p, ''), '\s+', ' ', 'g'));
  chave text;
  acentos jsonb := '{
    "republica":"República","consolacao":"Consolação","sao paulo":"São Paulo","santa cecilia":"Santa Cecília","paraiso":"Paraíso",
    "cerqueira cesar":"Cerqueira César","se":"Sé","bras":"Brás","butanta":"Butantã","agua branca":"Água Branca",
    "balneario camboriu":"Balneário Camboriú","goiania":"Goiânia","brasilia":"Brasília","florianopolis":"Florianópolis","sao jose":"São José",
    "guaruja":"Guarujá","campos do jordao":"Campos do Jordão","santa rita do sapucai":"Santa Rita do Sapucaí","higienopolis":"Higienópolis",
    "tatuape":"Tatuapé","sao bernardo do campo":"São Bernardo do Campo","niteroi":"Niterói","belem":"Belém","maceio":"Maceió",
    "vitoria":"Vitória","joao pessoa":"João Pessoa","sao luis":"São Luís","cuiaba":"Cuiabá","macapa":"Macapá"
  }'::jsonb;
begin
  if t = '' then return null; end if;
  chave := lower(translate(t, 'ÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇáàâãäéèêëíìîïóòôõöúùûüç', 'AAAAAEEEEIIIIOOOOOUUUUCaaaaaeeeeiiiiooooouuuuc'));
  if acentos ? chave then return acentos->>chave; end if;
  -- Já veio bem escrito (mistura maiúsculas e minúsculas): mantém.
  if t <> upper(t) and t <> lower(t) then return t; end if;
  t := initcap(lower(t));
  t := regexp_replace(t, ' (De|Da|Do|Das|Dos|E|Em|Na|No) ', ' \1 ', 'g');
  t := regexp_replace(t, ' De ', ' de ', 'g'); t := regexp_replace(t, ' Da ', ' da ', 'g'); t := regexp_replace(t, ' Do ', ' do ', 'g');
  t := regexp_replace(t, ' Das ', ' das ', 'g'); t := regexp_replace(t, ' Dos ', ' dos ', 'g'); t := regexp_replace(t, ' E ', ' e ', 'g');
  return t;
end;
$$;

create or replace function public.locais_nomes_bonitos()
returns trigger language plpgsql as $$
begin
  new.bairro := public.nome_bonito(new.bairro);
  new.bairro_exibicao := public.nome_bonito(new.bairro_exibicao);
  new.cidade := coalesce(public.nome_bonito(new.cidade), new.cidade);
  return new;
end;
$$;
drop trigger if exists trg_locais_nomes_bonitos on public.locais;
create trigger trg_locais_nomes_bonitos before insert or update of bairro, bairro_exibicao, cidade on public.locais
  for each row execute function public.locais_nomes_bonitos();

update public.locais
   set bairro = public.nome_bonito(bairro),
       bairro_exibicao = public.nome_bonito(bairro_exibicao),
       cidade = coalesce(public.nome_bonito(cidade), cidade)
 where bairro is distinct from public.nome_bonito(bairro)
    or bairro_exibicao is distinct from public.nome_bonito(bairro_exibicao)
    or cidade is distinct from coalesce(public.nome_bonito(cidade), cidade);
