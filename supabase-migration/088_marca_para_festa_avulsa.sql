-- 088 — Portal completo para toda festa avulsa: dá uma "marca" (registro em locais, categoria Festas) a cada organizador
-- que já tem festa aprovada mas ainda não estava ligado a nenhuma, e liga as festas dele a ela.
-- As festas aprovadas DE AGORA EM DIANTE já ganham a marca sozinhas na aprovação (rota /api/aprovar-evento);
-- este script só conserta as que foram aprovadas antes. Seguro rodar mais de uma vez.
-- Se o dono já tem uma marca de Festas, a festa entra nela; senão cria uma com o nome da primeira festa dele
-- (ele renomeia em "Minha página" no portal).

do $$
declare
  r record;
  marca uuid;
begin
  -- Desliga só os 3 gatilhos de proteção (o de criação forçaria status 'pendente' e dono nulo; os de edição desfariam o status/dono
  -- no SQL Editor, que não é "admin"). Tudo roda em uma transação: se der erro, volta sozinho e os gatilhos ficam ligados.
  alter table public.locais disable trigger before_insert_locais;
  alter table public.locais disable trigger before_update_locais;
  alter table public.eventos disable trigger before_update_eventos;

  for r in
    select e.criado_por as dono,
           (array_agg(e.titulo order by e.created_at))[1] as titulo,
           (array_agg(e.contato_nome order by e.created_at))[1] as contato_nome,
           (array_agg(e.contato_whatsapp order by e.created_at))[1] as whatsapp,
           (array_agg(e.foto_capa_url order by e.created_at))[1] as foto
      from public.eventos e
     where e.local_id is null
       and e.criado_por is not null
       and e.status = 'aprovado'
     group by e.criado_por
  loop
    select l.id into marca
      from public.locais l
     where l.owner_id = r.dono and l.categoria = 'eventos'
     order by l.created_at
     limit 1;

    if marca is null then
      insert into public.locais (nome, categoria, subcategoria, cidade, contato_nome, contato_telefone, foto_capa_url, status, owner_id)
      values (r.titulo, 'eventos', 'Festa avulsa', 'São Paulo', r.contato_nome, r.whatsapp, r.foto, 'aprovado', r.dono)
      returning id into marca;
    end if;

    update public.eventos
       set local_id = marca
     where local_id is null and criado_por = r.dono and status = 'aprovado';
  end loop;

  alter table public.locais enable trigger before_insert_locais;
  alter table public.locais enable trigger before_update_locais;
  alter table public.eventos enable trigger before_update_eventos;
end $$;

-- Conferência: marcas de Festas e quantas festas cada uma tem.
select l.nome as marca, l.subcategoria, l.owner_id, count(e.id) as festas
  from public.locais l
  left join public.eventos e on e.local_id = l.id
 where l.categoria = 'eventos'
 group by l.id
 order by l.created_at desc;
