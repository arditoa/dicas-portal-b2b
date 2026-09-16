-- ============================================================================
-- 019 -- Corrige de novo "insert or update on table locais violates foreign
-- key constraint locais_owner_id_fkey", agora no UPDATE da APROVACAO (nao no
-- INSERT do cadastro, que a 016 ja tinha corrigido)
-- ============================================================================
-- Contexto: a 016 corrigiu esse erro no INSERT (quando o navegador tem uma
-- sessao "orfa" -- token de login antigo de uma conta cujo profile foi
-- apagado depois, por exemplo limpeza manual de teste direto no Table
-- Editor). O MESMO tipo de orfandade apareceu agora num lugar diferente:
-- api/aprovar-local/route.ts, ao aprovar a Vezpa Bar, tentou vincular o
-- local a conta do parceiro (locais.owner_id = profiles.id) usando um
-- userId de auth.users que, nesse momento, nao tinha mais linha
-- correspondente em profiles -- e o UPDATE travou com esse erro.
--
-- Reproduzido localmente antes de corrigir: um profile apagado manualmente
-- (a conta de auth.users continua existindo -- so a linha de profiles some,
-- porque nao ha cascade nesse sentido) faz qualquer UPDATE que tente gravar
-- esse id em locais.owner_id quebrar com foreign key violation, mesmo
-- rodando com a service_role key.
--
-- Duas partes, as duas aditivas:
--
-- 1) Backfill -- conserta o que JA ficou inconsistente: cria a linha de
--    profiles que falta pra qualquer conta de auth.users que nao tenha uma
--    hoje, usando os mesmos dados que o gatilho handle_new_user (001) usa
--    num cadastro novo. "on conflict do nothing" garante que quem ja tem
--    profile nao e tocado (nem o role, nem nenhum outro campo).
--
-- 2) Reforco no gatilho de proteção de UPDATE de locais (mesmo espirito da
--    016, so que pro lado do update): se algum dia um owner_id sem par em
--    profiles tentar ser gravado -- por QUALQUER caminho, nao so a rota de
--    aprovacao -- a operacao nao quebra mais com erro de foreign key, so
--    mantem o owner_id anterior. Isso e uma rede de seguranca (evita o
--    crash), nao o conserto do vinculo em si -- o conserto de verdade pra
--    esse caso e o ajuste feito em api/aprovar-local/route.ts (cria o
--    profile que falta ANTES de vincular como owner_id, entao o vinculo
--    novo sempre vinga, em vez de silenciosamente ficar com o antigo).
-- ============================================================================

insert into public.profiles (id, full_name, social_name, phone, birth_date, avatar_url)
select
  au.id,
  coalesce(au.raw_user_meta_data->>'full_name', au.raw_user_meta_data->>'name', split_part(coalesce(au.email,''), '@', 1)),
  au.raw_user_meta_data->>'social_name',
  au.raw_user_meta_data->>'phone',
  nullif(au.raw_user_meta_data->>'birth_date', '')::date,
  au.raw_user_meta_data->>'avatar_url'
from auth.users au
where not exists (select 1 from public.profiles p where p.id = au.id)
on conflict (id) do nothing;

create or replace function public.protect_admin_fields_locais()
returns trigger as $$
begin
  if pg_trigger_depth() > 1 then
    return new;
  end if;
  if not (public.is_admin() or auth.role() = 'service_role') then
    new.status := old.status;
    new.safe_space := old.safe_space;
    new.plano_destaque := old.plano_destaque;
    new.destaque_ate := old.destaque_ate;
    new.owner_id := old.owner_id;
    new.rating_media := old.rating_media;
    new.rating_total := old.rating_total;
  end if;

  if new.owner_id is not null and not exists (select 1 from public.profiles where id = new.owner_id) then
    new.owner_id := old.owner_id;
  end if;

  return new;
end;
$$ language plpgsql security definer set search_path = public;
