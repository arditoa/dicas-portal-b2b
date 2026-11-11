-- 090 — Usuários de TESTE do portal B2B para demonstrar a plataforma em reuniões de venda.
-- Cria 8 contas de parceiro (uma por plano/categoria), com local aprovado, cupons e festas de exemplo.
-- Tudo é fictício. Seguro rodar mais de uma vez: se a conta já existe, só reaplica a senha e não duplica nada.
-- Para tirar tudo do ar (ANTES de abrir o app ao público / enviar à Apple): rode a 091_remover_usuarios_demo.sql.
--
-- COMO ENTRAR NO PORTAL: tela de login > campo WhatsApp > senha abaixo.
--   WhatsApp (só números)  Plano / categoria
--   11900000001            Fundador      · Bares & Vida Noturna  (Boteco Arco-Íris)
--   11900000002            Premium       · Bares & Vida Noturna  (Pub Cinema Rosa)
--   11900000003            Intermediário · Bares & Vida Noturna  (Café Bar Aurora)
--   11900000004            Gratuito      · Bares & Vida Noturna  (Bar do Zé)
--   11900000005            Premium       · Festas & Eventos      (Pulso Produtora) — 4 festas, 2 em destaque
--   11900000006            Festa avulsa  · Festas & Eventos      (Festa da Laje)   — 1 festa em destaque (R$ 89)
--   11900000007            Intermediário · Saúde & Bem-estar     (Espaço Acolher, psicologia)
--   11900000008            Intermediário · Moda & Acessórios     (Ateliê Prisma)
-- SENHA DE TODAS: Demo@Dicas2026   (troque na linha "senha_demo" abaixo se quiser outra)

do $$
declare
  senha_demo constant text := 'Demo@Dicas2026';
  r record;
  uid uuid;
  lid uuid;
  mail text;
  base_dia timestamp := date_trunc('day', now() at time zone 'America/Sao_Paulo');
  dt_ini timestamptz;
begin
  -- Desliga só os gatilhos de proteção que forçam status 'pendente'/dono nulo no SQL Editor. Tudo roda numa
  -- transação: se algo falhar, volta sozinho e os gatilhos continuam ligados.
  alter table public.locais disable trigger before_insert_locais;
  alter table public.locais disable trigger before_update_locais;
  alter table public.locais disable trigger before_update_plano_comercial;
  alter table public.locais disable trigger locais_proteger_selos;
  alter table public.eventos disable trigger before_insert_eventos;
  alter table public.eventos disable trigger before_update_eventos;
  alter table public.cupons disable trigger before_insert_cupons_limite;

  for r in
    select * from (values
      ('11900000001','Marcos (demo)','Boteco Arco-Íris','lugares','Botecos & Bares Tradicionais','fundador','Vila Madalena','Boteco de bairro acolhedor, com petiscos, cerveja gelada e música ao vivo às quintas.','@botecoarcoiris',-23.5535,-46.6915),
      ('11900000002','Camila (demo)','Pub Cinema Rosa','lugares','Pubs e Cervejarias','premium','Pinheiros','Pub com cervejas artesanais, trilha de cinema e noite de quiz toda terça.','@pubcinemarosa',-23.5614,-46.6823),
      ('11900000003','Rafa (demo)','Café Bar Aurora','lugares','Café Bar & Bar e Restaurante','intermediario','Centro','Café de dia, bar à noite. Espaço seguro, drinks autorais e pet friendly.','@cafebaraurora',-23.5440,-46.6420),
      ('11900000004','Zé (demo)','Bar do Zé','lugares','Botecos & Bares Tradicionais','freemium','Consolação','Boteco simples e querido da vizinhança, sinuca e porção em dobro.','@bardoze',-23.5532,-46.6580),
      ('11900000005','Bia (demo)','Pulso Produtora','eventos','Todos','premium','Centro','Produtora de festas e baladas para o público LGBT+, com pistas, drag shows e noites temáticas.','@pulsoprodutora',-23.5489,-46.6388),
      ('11900000006','Lu (demo)','Festa da Laje','eventos','Festa avulsa','freemium','Vila Madalena','Organizadora de festa avulsa: sunset e pagode na laje, com Lista VIP.','@festadalaje',-23.5560,-46.6900),
      ('11900000007','Dra. Helena (demo)','Espaço Acolher','saude','Psicologia, Terapia & Psiquiatria','intermediario','Pinheiros','Psicologia e terapia com acolhimento e respeito, atendimento presencial e online.','@espacoacolher',-23.5650,-46.6890),
      ('11900000008','Nando (demo)','Ateliê Prisma','produtos','Moda Sem Gênero & Pride','intermediario','Vila Madalena','Moda, acessórios e peças autorais para todas as expressões.','@ateliprisma',-23.5545,-46.6930)
    ) as t(fone, resp, nome, cat, sub, plano, bairro, descr, insta, lat, lng)
  loop
    mail := 'parceiro.55' || r.fone || '@login.vezpabar.app';
    select id into uid from auth.users where email = mail;

    if uid is null then
      uid := gen_random_uuid();
      insert into auth.users (
        instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
        raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
        confirmation_token, recovery_token, email_change, email_change_token_new,
        email_change_token_current, phone_change, phone_change_token, reauthentication_token
      ) values (
        '00000000-0000-0000-0000-000000000000', uid, 'authenticated', 'authenticated', mail,
        extensions.crypt(senha_demo, extensions.gen_salt('bf')), now(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        jsonb_build_object('full_name', r.resp),
        now(), now(), '', '', '', '', '', '', '', ''
      );
      insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at, id)
      values (uid::text, uid, jsonb_build_object('sub', uid::text, 'email', mail, 'email_verified', true, 'phone_verified', false),
              'email', now(), now(), now(), gen_random_uuid());
    else
      update auth.users
         set encrypted_password = extensions.crypt(senha_demo, extensions.gen_salt('bf')),
             email_confirmed_at = coalesce(email_confirmed_at, now()), banned_until = null
       where id = uid;
    end if;

    -- O gatilho handle_new_user cria o perfil; se não existir, cria aqui.
    insert into public.profiles (id, full_name) values (uid, r.resp) on conflict (id) do nothing;
    update public.profiles set role = 'parceiro', full_name = r.resp where id = uid;

    select id into lid from public.locais where owner_id = uid and categoria = r.cat::public.categoria_tipo limit 1;
    if lid is null then
      insert into public.locais (
        owner_id, categoria, subcategoria, nome, descricao, endereco, bairro, cidade, lat, lng, instagram,
        contato_nome, contato_telefone, status, safe_space, publico_tags,
        plano_comercial, plano_comercial_status, plano_destaque, atributos
      ) values (
        uid, r.cat::public.categoria_tipo, r.sub, r.nome, r.descr, 'Rua Exemplo, 100 (endereço fictício)', r.bairro, 'São Paulo', r.lat, r.lng, r.insta,
        r.resp, r.fone, 'aprovado', true, array['todos']::public.publico_tag[],
        r.plano::public.plano_comercial, 'ativo',
        case when r.plano in ('premium','fundador') then 'destaque' else 'basico' end::public.plano_destaque,
        '{"demo": true}'::jsonb
      ) returning id into lid;
    end if;

    -- Cupom de exemplo para os bares com plano (o Premium/Fundador de Festas não usam cupom).
    if r.cat in ('lugares','saude','produtos') and r.plano <> 'freemium'
       and not exists (select 1 from public.cupons where local_id = lid) then
      insert into public.cupons (local_id, titulo, descricao, codigo, limite_uso, ativo)
      values (lid,
        case r.plano when 'fundador' then 'Petisco de cortesia na primeira visita'
                     when 'premium' then '10% de desconto no consumo'
                     else 'Condição especial para quem mostra o app' end,
        'Cupom de demonstração. Mostre o app no balcão.', 'DEMO' || right(r.fone, 1), 100, true);
    end if;

  end loop;

  -- ======================= FESTAS DE EXEMPLO =======================
  -- (título, dono (WhatsApp), dias a partir de hoje, hora, público, estilo, destaque pago?, lista VIP?)
  for r in
    select * from (values
      ('11900000005','Noite das Divas',3,23,'gay','pop_eletronica',true,true,'Pista pop com DJs convidados e show de drag à meia-noite.'),
      ('11900000005','Baile Sapphic',4,22,'lesbica','funk',true,false,'A noite das mulheres que amam mulheres: funk, pop e muita pista.'),
      ('11900000005','Sunset na Laje',10,17,'misto_lgbt','techno_house',false,true,'Sunset com open bar e DJs ao ar livre.'),
      ('11900000005','Drag Night: Reis e Rainhas',11,21,'gay','drag_cabare',false,false,'Show de drag com a cena paulistana.'),
      ('11900000006','Pagode da Resenha',5,15,'misto_lgbt','mpb_samba',true,true,'Pagode, petisco e roda de samba na laje. Entrada com Lista VIP.'),
      ('11900000001','Karaokê do Boteco',2,20,'todos','pop_eletronica',true,false,'Quinta de karaokê, com microfone aberto e drinks em dobro.'),
      ('11900000003','Drag Brunch',6,11,'misto_lgbt','drag_cabare',true,false,'Brunch com show de drag no café bar.')
    ) as t(fone, titulo, dias, hora, publico, estilo, paga, vip, descr)
  loop
    select u.id into uid from auth.users u where u.email = 'parceiro.55' || r.fone || '@login.vezpabar.app';
    select id into lid from public.locais where owner_id = uid limit 1;
    dt_ini := (base_dia + (r.dias || ' days')::interval + (r.hora || ' hours')::interval) at time zone 'America/Sao_Paulo';
    if not exists (select 1 from public.eventos where local_id = lid and titulo = r.titulo) then
      insert into public.eventos (
        local_id, criado_por, tipo, titulo, descricao, data_inicio, data_fim, estilos_musicais, publico_tags,
        status, destaque_secoes, quer_lista_vip, contato_nome, contato_whatsapp
      ) values (
        lid, uid, 'evento', r.titulo, r.descr, dt_ini, dt_ini + interval '5 hours',
        array[r.estilo]::public.estilo_musical[], array[r.publico]::public.publico_tag[],
        'aprovado', case when r.paga then array['patrocinado']::text[] else '{}'::text[] end,
        r.vip, 'Equipe demo', r.fone
      );
    end if;
  end loop;

  alter table public.locais enable trigger before_insert_locais;
  alter table public.locais enable trigger before_update_locais;
  alter table public.locais enable trigger before_update_plano_comercial;
  alter table public.locais enable trigger locais_proteger_selos;
  alter table public.eventos enable trigger before_insert_eventos;
  alter table public.eventos enable trigger before_update_eventos;
  alter table public.cupons enable trigger before_insert_cupons_limite;
end $$;

-- Conferência: deve listar 8 contas demo, cada uma com seu local, plano e quantidade de festas.
select u.email, p.role, l.nome, l.categoria, l.plano_comercial, l.plano_comercial_status, l.status,
       (select count(*) from public.eventos e where e.local_id = l.id) as festas
  from auth.users u
  join public.profiles p on p.id = u.id
  join public.locais l on l.owner_id = u.id
 where u.email like 'parceiro.551190000000%@login.vezpabar.app'
 order by u.email;
