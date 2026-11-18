-- 148 · Subcategorias editáveis pelo Modo equipe (todas as categorias):
--   • mudar nome / nome curto / ícone / ordem de uma subcategoria padrão (mesma chave, a lista do app continua valendo);
--   • criar subcategorias novas (ex.: Festas › Festas afro).
-- Esconder/mostrar e "Em breve" continuam em subcategoria_config (065).
-- Seguro rodar mais de uma vez.
create table if not exists public.subcategorias_app (
  categoria text not null,              -- categoria REAL do banco ('lugares' = Bares) ou 'festas'
  chave text not null,                  -- chave estável (padrão: rótulo original sem acento e minúsculo)
  rotulo text not null,
  curto text,
  icone text,
  palavras text[] not null default '{}', -- sinônimos para reconhecer o texto livre do cadastro (e as tags das festas)
  ordem integer,
  nova boolean not null default false,  -- true = criada pela equipe (não existe na lista padrão do app)
  atualizado_em timestamptz not null default now(),
  primary key (categoria, chave)
);
alter table public.subcategorias_app enable row level security;
drop policy if exists "subcat_app_select" on public.subcategorias_app;
create policy "subcat_app_select" on public.subcategorias_app for select to anon, authenticated using (true);
drop policy if exists "subcat_app_admin" on public.subcategorias_app;
create policy "subcat_app_admin" on public.subcategorias_app for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
grant select on public.subcategorias_app to anon, authenticated;
grant insert, update, delete on public.subcategorias_app to authenticated;
notify pgrst, 'reload schema';
