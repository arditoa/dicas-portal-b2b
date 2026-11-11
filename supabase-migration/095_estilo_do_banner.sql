-- 095 — Rodada 140: estilo do banner de Fundador/Premium (pedido da Andrea): fundo em degradê com as cores do app,
-- foto à direita, à esquerda ou de fundo inteira, cor dos dizeres e palavra de impacto com cor própria. Tudo opcional: sem preenchimento, o app usa o
-- degradê padrão e dizeres brancos, como hoje. Rode uma vez no SQL Editor.
alter table public.destaque_chamada add column if not exists estilo text not null default 'degrade';
alter table public.destaque_chamada add column if not exists cor1 text;
alter table public.destaque_chamada add column if not exists cor2 text;
alter table public.destaque_chamada add column if not exists cor_texto text;
-- Palavra de impacto: parte da frase pintada com outra cor (ex.: "Vezpa Queen?"). A mesma cor pode ir no botão.
alter table public.destaque_chamada add column if not exists destaque_texto text;
alter table public.destaque_chamada add column if not exists cor_destaque text;

alter table public.destaque_chamada drop constraint if exists destaque_chamada_estilo_valido;
alter table public.destaque_chamada add constraint destaque_chamada_estilo_valido
  check (estilo in ('degrade', 'foto_metade', 'foto_esquerda', 'foto_fundo'));
alter table public.destaque_chamada drop constraint if exists destaque_chamada_cores_validas;
alter table public.destaque_chamada add constraint destaque_chamada_cores_validas
  check ((cor1 is null or cor1 ~ '^#[0-9A-Fa-f]{6}$') and (cor2 is null or cor2 ~ '^#[0-9A-Fa-f]{6}$') and (cor_texto is null or cor_texto ~ '^#[0-9A-Fa-f]{6}$') and (cor_destaque is null or cor_destaque ~ '^#[0-9A-Fa-f]{6}$'));

-- Quem já tinha foto continua como estava (meio a meio).
update public.destaque_chamada set estilo = 'foto_metade' where imagem_url is not null and estilo = 'degrade';

select column_name from information_schema.columns where table_name = 'destaque_chamada' order by ordinal_position;
