-- 091 — Remove TUDO que a 090 criou (contas demo, locais, festas e cupons de exemplo).
-- Rode ANTES de abrir o app ao público e antes de enviar o app à Apple. Só mexe nas contas
-- parceiro.551190000000X@login.vezpabar.app e nos locais marcados como demo. Seguro rodar mais de uma vez.

do $$
declare ids uuid[];
begin
  select coalesce(array_agg(id), '{}') into ids from auth.users where email like 'parceiro.551190000000%@login.vezpabar.app';

  delete from public.eventos where criado_por = any(ids) or local_id in (select id from public.locais where owner_id = any(ids));
  delete from public.cupons where local_id in (select id from public.locais where owner_id = any(ids));
  delete from public.locais where owner_id = any(ids) and atributos->>'demo' = 'true';
  delete from public.profiles where id = any(ids);
  delete from auth.identities where user_id = any(ids);
  delete from auth.users where id = any(ids);
end $$;

-- Conferência: os dois números devem ser 0.
select (select count(*) from auth.users where email like 'parceiro.551190000000%@login.vezpabar.app') as contas_demo_restantes,
       (select count(*) from public.locais where atributos->>'demo' = 'true') as locais_demo_restantes;
