import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { normalizarTelefoneBR, emailSinteticoParceiro, gerarSenhaTemporaria } from '../../../lib/parceiroAuth';

// Rota nova da Rodada 22 — pedido direto da Andrea depois de testar o
// fluxo antigo (cadastro sem login -> parceiro cria conta com e-mail ->
// vincula digitando o CNPJ de novo em /vincular) e achar confuso demais
// pra quem só usa WhatsApp no dia a dia. A partir de agora, aprovar um
// local aqui já cria a conta de login do parceiro (usando o WhatsApp do
// próprio cadastro, sem precisar de e-mail), gera uma senha temporária, e
// vincula o local à conta no mesmo passo — sem precisar de /vincular.
//
// Só é possível criar conta de autenticação (auth.admin.createUser) a
// partir do servidor, com a service_role key — por isso esta é uma API
// route (nunca roda no navegador). A checagem de "quem está chamando é
// admin mesmo" é feita manualmente aqui dentro (a service_role key sozinha
// não prova isso) antes de qualquer ação. Ver
// supabase-migration/012_aprovacao_gera_login_automatico.sql — o gatilho
// de proteção de `locais` precisou reconhecer essa chave como confiável,
// pelo mesmo motivo do "aprovar no Table Editor volta pra pendente".

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

  let local_id: string | undefined;
  try {
    const body = await req.json();
    local_id = body?.local_id;
  } catch {
    // corpo ausente/inválido — cai no erro 400 abaixo
  }
  if (!local_id) {
    return NextResponse.json({ error: 'local_id é obrigatório.' }, { status: 400 });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // A service_role key por si só não diz QUEM está chamando — quem prova
  // isso é o token da sessão que o /admin manda no Authorization. Sem essa
  // checagem, qualquer um que descobrisse esta rota poderia aprovar locais.
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
    return NextResponse.json({ error: 'Só administradores podem aprovar cadastros.' }, { status: 403 });
  }

  const { data: local, error: localErr } = await admin
    .from('locais')
    .select('id, nome, status, contato_telefone, owner_id')
    .eq('id', local_id)
    .maybeSingle();
  if (localErr || !local) {
    return NextResponse.json({ error: 'Local não encontrado.' }, { status: 404 });
  }
  if (!local.contato_telefone) {
    return NextResponse.json(
      { error: 'Este local não tem WhatsApp cadastrado — não dá pra criar login automático. Aprove direto no banco e avise o suporte.' },
      { status: 400 }
    );
  }

  const telefone = normalizarTelefoneBR(local.contato_telefone);
  let userId: string | null = local.owner_id;
  let senhaGerada: string | null = null;
  let contaNova = false;

  if (userId) {
    // Local já tinha owner_id de uma aprovação anterior. Repara contas
    // "quebradas" criadas ANTES desta correção (Rodada 23) — quando a
    // conta ainda era criada só com telefone no Supabase Auth, e o login
    // por telefone estava desativado no projeto ("Phone logins are
    // disabled"), deixando a conta sem jeito nenhum de entrar. Se a conta
    // já tem e-mail (sintético, criado por esta rota), não faz nada — só
    // reforça o vínculo aprovado/owner_id abaixo, sem gerar senha nova.
    const { data: usuarioExistente, error: getErr } = await admin.auth.admin.getUserById(userId);
    if (getErr || !usuarioExistente?.user) {
      return NextResponse.json(
        { error: getErr?.message || 'Conta do parceiro não encontrada — verifique manualmente no Supabase.' },
        { status: 500 }
      );
    }
    if (!usuarioExistente.user.email) {
      const senhaNova = gerarSenhaTemporaria();
      const { error: repararErr } = await admin.auth.admin.updateUserById(userId, {
        email: emailSinteticoParceiro(telefone),
        email_confirm: true,
        password: senhaNova,
      });
      if (repararErr) {
        return NextResponse.json({ error: repararErr.message }, { status: 500 });
      }
      senhaGerada = senhaNova;
      contaNova = false;
    }
  } else {
    const senhaNova = gerarSenhaTemporaria();
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
        return NextResponse.json({ error: criarErr?.message || 'Não foi possível criar a conta do parceiro.' }, { status: 500 });
      }

      // Esse telefone já tem conta (o mesmo responsável cadastrou outro
      // local antes) — reaproveita a conta em vez de duplicar, e gera uma
      // senha nova mesmo assim, pra garantir que o convite tenha sempre
      // uma senha válida pra usar agora.
      let achou: { id: string } | null = null;
      let pagina = 1;
      while (!achou) {
        const { data: lista, error: listaErr } = await admin.auth.admin.listUsers({ page: pagina, perPage: 200 });
        if (listaErr) return NextResponse.json({ error: listaErr.message }, { status: 500 });
        achou = lista.users.find((u) => u.email === emailSinteticoParceiro(telefone)) || null;
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
  }

  // Garante que exista uma linha em profiles pra esse userId antes de
  // vincular como owner_id do local -- locais.owner_id tem foreign key pra
  // profiles.id (nao pra auth.users.id direto). Uma conta NOVA (criada
  // acima) ja ganha isso automaticamente pelo gatilho handle_new_user, mas
  // uma conta REAPROVEITADA (telefone que ja tinha conta) pode ter ficado
  // sem profile se essa linha foi apagada manualmente depois (ex.: limpeza
  // de teste no Table Editor) -- foi exatamente isso que quebrou a
  // aprovacao da Vezpa Bar com "violates foreign key constraint
  // locais_owner_id_fkey". Este upsert conserta isso sem sobrescrever nada
  // de quem ja tem profile (on conflict do nothing).
  const { error: perfilGarantidoErr } = await admin
    .from('profiles')
    .upsert({ id: userId }, { onConflict: 'id', ignoreDuplicates: true });
  if (perfilGarantidoErr) {
    return NextResponse.json({ error: perfilGarantidoErr.message }, { status: 500 });
  }

  const { error: updErr } = await admin
    .from('locais')
    .update({ status: 'aprovado', owner_id: userId })
    .eq('id', local_id);
  if (updErr) {
    return NextResponse.json({ error: updErr.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    telefone,
    senha: senhaGerada,
    contaNova,
    nomeLocal: local.nome,
  });
}
