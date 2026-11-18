-- 137 — Onde o público mora: CEP → bairro, para o Mapa Dicas (16/11/2026). Rode depois da 136. Seguro rodar mais de uma vez.
--
-- Privacidade (como o app é LGBT+, saber que alguém usa o app pode revelar a orientação: tratar como dado sensível):
-- * O app consulta o CEP no ViaCEP e manda para cá só bairro, cidade, UF e os 5 primeiros dígitos do CEP.
--   O CEP completo nunca é guardado (no Brasil, um CEP pode ser uma rua ou um prédio).
-- * Dois usos, com consentimentos separados e nunca pré-marcados:
--     1) sugerir lugares perto de casa (só a própria pessoa vê);
--     2) entrar, de forma anônima, no Mapa Dicas (contagem por bairro).
-- * O Mapa só mostra bairro com 20 pessoas ou mais, arredondado de 10 em 10; o resto vira "Outros bairros".
--   Nunca cruza com idade, gênero ou outro dado. Só a equipe Dicas consulta; estudos para fora passam pela advogada.

create table if not exists public.perfil_regiao (
  user_id uuid primary key default auth.uid() references public.profiles(id) on delete cascade,
  cep5 text check (cep5 is null or cep5 ~ '^[0-9]{5}$'),
  bairro text check (bairro is null or char_length(bairro) <= 80),
  cidade text not null check (char_length(cidade) between 2 and 80),
  uf text check (uf is null or uf ~ '^[A-Z]{2}$'),
  mapa_consentido boolean not null default false,
  consentido_em timestamptz,
  atualizado_em timestamptz not null default now()
);
alter table public.perfil_regiao enable row level security;
drop policy if exists perfil_regiao_dono on public.perfil_regiao;
create policy perfil_regiao_dono on public.perfil_regiao for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Registro do momento do consentimento (LGPD: provar quando a pessoa aceitou)
create or replace function public.perfil_regiao_consentimento() returns trigger language plpgsql as $$
begin
  new.atualizado_em := now();
  if new.mapa_consentido and (tg_op = 'INSERT' or not old.mapa_consentido) then new.consentido_em := now(); end if;
  if not new.mapa_consentido then new.consentido_em := null; end if;
  return new;
end; $$;
drop trigger if exists perfil_regiao_consentimento on public.perfil_regiao;
create trigger perfil_regiao_consentimento before insert or update on public.perfil_regiao for each row execute function public.perfil_regiao_consentimento();

-- Mapa Dicas (só equipe): pessoas por bairro, com mínimo de 20 e arredondamento
create or replace function public.mapa_dicas(p_cidade text default null)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare minimo constant int := 20;
begin
  if not public.is_admin() then raise exception 'Só a equipe Dicas.' using errcode = '42501'; end if;
  return (
    with base as (
      select cidade, uf, coalesce(nullif(bairro, ''), 'Sem bairro') as bairro from public.perfil_regiao
       where mapa_consentido and (p_cidade is null or cidade ilike p_cidade)
    ), por_bairro as (
      select cidade, uf, bairro, count(*) as n from base group by 1, 2, 3
    ), por_cidade as (
      select cidade, uf, sum(n) as n from por_bairro group by 1, 2 having sum(n) >= minimo
    )
    select coalesce(jsonb_agg(jsonb_build_object(
      'cidade', c.cidade, 'uf', c.uf, 'pessoas', (floor(c.n / 10) * 10)::int,
      'bairros', coalesce((select jsonb_agg(jsonb_build_object('bairro', b.bairro, 'pessoas', (floor(b.n / 10) * 10)::int) order by b.n desc)
                             from por_bairro b where b.cidade = c.cidade and b.uf is not distinct from c.uf and b.n >= minimo), '[]'::jsonb),
      'outros_bairros', (floor(coalesce((select sum(b.n) from por_bairro b where b.cidade = c.cidade and b.uf is not distinct from c.uf and b.n < minimo), 0) / 10) * 10)::int
    ) order by c.n desc), '[]'::jsonb)
    from por_cidade c);
end; $$;
revoke execute on function public.mapa_dicas(text) from public, anon;
grant execute on function public.mapa_dicas(text) to authenticated;
