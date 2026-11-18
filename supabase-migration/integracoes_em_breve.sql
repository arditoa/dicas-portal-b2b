-- 18/11 · Mercado Pago e Instagram em "Em breve" no app do parceiro (sem botão que dá erro).
-- Quando o ID/chave estiverem no Vercel, troque para true e true. Não precisa de build nem da Apple.
insert into public.app_config (chave, valor, atualizado_em)
values ('integracoes', '{"mp": false, "ig": false}', now())
on conflict (chave) do update set valor = excluded.valor, atualizado_em = now();

-- Para ligar depois:
-- update public.app_config set valor = '{"mp": true, "ig": true}', atualizado_em = now() where chave = 'integracoes';
