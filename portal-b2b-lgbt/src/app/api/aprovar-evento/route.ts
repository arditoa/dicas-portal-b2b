import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { normalizarTelefoneBR, emailSinteticoParceiro, gerarSenhaInicial } from '../../../lib/parceiroAuth';

// Rodada 36 — pedido direto da Andrea: organizador de evento/festa também
// deve poder editar horário/layout/fotos depois de aprovado, igual o dono
// de local já pode desde a Rodada 22/23 — pra isso precisa de um login.
//
// Mas evento tem uma diferença importante em relação a local: ele pode já
// "pertencer" a alguém sem precisar de login novo nenhum —
//   (a) se o evento já tem `criado_por` (organizador já tinha conta e
//       criou o evento logado, ou já foi vinculado antes via
//       solicitacoes_vinculo_evento) — nada a fazer, só aprovar;
//   (b) se o evento tem `local_id` de um local que JÁ TEM DONO (owner_id
//       preenchido) — o dono do local já gerencia esse evento via
//       pode_gerenciar_evento() (008), sem precisar de conta própria;
//   (c) só no caso RESTANTE — organizador independente, sem conta, sem
//       local com dono — é que faz sentido criar um login novo, igual o
//       fluxo de locais.
//
// Mesma exigência de locais: criar conta de autenticação
// (auth.admin.createUser) só é possível a partir do servidor, com a
// service_role key. E por gravar `status`/`criado_por` na mesma chamada,
// bate no gatilho `protect_admin_fields_eventos()` — que só reconhecia
// is_admin() até a migration 022, que passou a reconhecer a service_role
// key também (mesma correção que a 012 já tinha feito pra locais).

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function POST(req: NextRequest) {
  if (!SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { error: 'SUPABASE_SERVICE_ROLE_KEY não configurada no servidor (variável de ambiente da Vercel).' },
      { status: 500 }
    );
  }

  const authHeader = req.headers.get('authorization') || '';
  const token = authHeader.replace('Bearer ', '').trim();
  if (!token) {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  }

  let evento_id: string | undefined;
  let reenviar = false;
  try {
    const body = await req.json();
    evento_id = body?.evento_id;
    // Rodada 39 — pedido da Andrea: mesma ideia do botão "Enviar acesso"
    // que locais já tinham (Rodada 22) — reenviar uma senha nova pro
    // organizador que já tem conta, em vez de só poder ver a senha uma
    // vez no momento da aprovação e nunca mais (senha fica só como hash
    // depois disso, não tem como "buscar" a antiga — regerar é o único
    // jeito seguro de mandar de novo).
    reenviar = body?.reenviar === true;
  } catch {
    // corpo ausente/inválido — cai no erro 400 abaixo
  }
  if (!evento_id) {
    return NextResponse.json({ error: 'evento_id é obrigatório.' }, { status: 400 });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // A service_role key por si só não diz QUEM está chamando — quem prova
  // isso é o token da sessão que o /admin manda no Authorization.
  const { data: userData, error: userErr } = await admin.auth.getUser(token);
  if (userErr || !userData?.user) {
    return NextResponse.json({ error: 'Sessão inválida ou expirada — faça login de novo.' }, { status: 401 });
  }

  const { data: perfil, error: perfilErr } = await admin
    .from('profiles')
    .select('role')
    .eq('id', userData.user.id)
    .maybeSingle();
  if (perfilErr || perfil?.role !== 'admin') {
    return NextResponse.json({ error: 'Só administradores podem aprovar eventos.' }, { status: 403 });
  }

  const { data: evento, error: eventoErr } = await admin
    .from('eventos')
    .select('id, titulo, status, local_id, criado_por, contato_nome, contato_whatsapp')
    .eq('id', evento_id)
    .maybeSingle();
  if (eventoErr || !evento) {
    return NextResponse.json({ error: 'Evento não encontrado.' }, { status: 404 });
  }

  // Caso (b): local com dono já aprovado gerencia o evento — não precisa
  // de login próprio pro organizador.
  let localJaTemDono = false;
  if (evento.local_id) {
    const { data: local } = await admin
      .from('locais')
      .select('owner_id')
      .eq('id', evento.local_id)
      .maybeSingle();
    localJaTemDono = !!local?.owner_id;
  }

  if (reenviar && localJaTemDono) {
    return NextResponse.json(
      { error: 'Esse evento é de um local que já tem dono — o organizador entra com o login do próprio local, não tem senha separada pra reenviar.' },
      { status: 400 }
    );
  }
  if (reenviar && !evento.contato_whatsapp) {
    return NextResponse.json({ error: 'Esse evento não tem WhatsApp de contato cadastrado.' }, { status: 400 });
  }

  const precisaDeLogin = reenviar
    ? !localJaTemDono && !!evento.contato_whatsapp
    : !evento.criado_por && !localJaTemDono && !!evento.contato_whatsapp;

  let userId: string | null = null;
  let senhaGerada: string | null = null;
  let contaNova = false;
  let telefone: string | null = null;

  if (precisaDeLogin) {
    telefone = normalizarTelefoneBR(evento.contato_whatsapp as string);
    const senhaNova = gerarSenhaInicial(telefone);
    const { data: criado, error: criarErr } = await admin.auth.admin.createUser({
      email: emailSinteticoParceiro(telefone),
      password: senhaNova,
      email_confirm: true,
    });

    if (criado?.user) {
      userId = criado.user.id;
      senhaGerada = senhaNova;
      contaNova = true;
    } else {
      const msg = (criarErr?.message || '').toLowerCase();
      const jaExiste = msg.includes('already') || msg.includes('registered') || msg.includes('exists');
      if (!jaExiste) {
        return NextResponse.json({ error: criarErr?.message || 'Não foi possível criar a conta do organizador.' }, { status: 500 });
      }

      // Esse WhatsApp já tem conta (ex.: também é dono de um local, ou já
      // organizou outro evento) — reaproveita a conta em vez de duplicar,
      // e gera uma senha nova mesmo assim, pra garantir que o convite
      // tenha sempre uma senha válida pra usar agora.
      let achou: { id: string } | null = null;
      let pagina = 1;
      while (!achou) {
        const { data: lista, error: listaErr } = await admin.auth.admin.listUsers({ page: pagina, perPage: 200 });
        if (listaErr) return NextResponse.json({ error: listaErr.message }, { status: 500 });
        achou = lista.users.find((u) => u.email === emailSinteticoParceiro(telefone as string)) || null;
        if (achou || lista.users.length < 200) break;
        pagina += 1;
      }
      if (!achou) {
        return NextResponse.json(
          { error: 'Esse WhatsApp já tem conta, mas não conseguimos localizá-la — verifique manualmente no Supabase.' },
          { status: 500 }
        );
      }
      userId = achou.id;
      const { error: senhaErr } = await admin.auth.admin.updateUserById(userId, { password: senhaNova });
      if (senhaErr) {
        return NextResponse.json({ error: senhaErr.message }, { status: 500 });
      }
      senhaGerada = senhaNova;
      contaNova = false;
    }

    // Garante que exista uma linha em profiles pra esse userId antes de
    // vincular como criado_por do evento — mesmo cuidado da 019 pra
    // locais (evita o mesmo tipo de violação de foreign key na
    // aprovação, se essa conta reaproveitada tivesse ficado sem profile
    // por algum motivo).
    const { error: perfilGarantidoErr } = await admin
      .from('profiles')
      .upsert({ id: userId }, { onConflict: 'id', ignoreDuplicates: true });
    if (perfilGarantidoErr) {
      return NextResponse.json({ error: perfilGarantidoErr.message }, { status: 500 });
    }
  }

  const atualizacao: Record<string, unknown> = { status: 'aprovado' };
  if (userId) {
    atualizacao.criado_por = userId;
  }

  const { error: updErr } = await admin
    .from('eventos')
    .update(atualizacao)
    .eq('id', evento_id);
  if (updErr) {
    return NextResponse.json({ error: updErr.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    tituloEvento: evento.titulo,
    loginCriado: !!userId,
    telefone,
    senha: senhaGerada,
    contaNova,
  });
}
