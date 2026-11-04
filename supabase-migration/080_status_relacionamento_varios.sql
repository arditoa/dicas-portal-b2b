-- 080: Status de relacionamento com varias opcoes (ex.: "Casado(a)" + "Quem sabe, uma bagunça") e linguagem normal.
-- Valores novos da lista: solteiro, namorando, casado, aberto, bagunca (lista vazia = prefere nao informar).
-- A coluna antiga (status_relacionamento) continua sendo gravada com o valor equivalente, por compatibilidade.
-- Seguro rodar mais de uma vez.
alter table public.profiles add column if not exists status_relacionamento_lista text[] not null default '{}';

update public.profiles
set status_relacionamento_lista = array[
  case status_relacionamento::text
    when 'comprometido' then 'namorando'
    else status_relacionamento::text
  end
]
where status_relacionamento::text <> 'nao_informado'
  and coalesce(array_length(status_relacionamento_lista, 1), 0) = 0;
