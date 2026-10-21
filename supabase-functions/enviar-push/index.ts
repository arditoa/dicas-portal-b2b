// Edge Function "enviar-push" — envia notificações push pelo serviço da Expo.
// Só administradores (profiles.role = 'admin') conseguem chamar.
//
// Entrada (JSON): { tipo: 'festas'|'cupons'|'lembretes'|'novidades',
//                   titulo: string, corpo: string, rota?: string,
//                   so_teste?: boolean }
// so_teste = true → envia só para os aparelhos de quem está chamando.
//
// Variáveis: SUPABASE_URL, SUPABASE_ANON_KEY e SUPABASE_SERVICE_ROLE_KEY já
// existem sozinhas nas Edge Functions. EXPO_ACCESS_TOKEN é opcional (só se
// você ligar "Enhanced Push Security" no painel da Expo).
import { createClient } from 'jsr:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const TIPOS = ['festas', 'cupons', 'lembretes', 'novidades'];
// Telas do app que o toque na notificação pode abrir (o app confere de novo).
const ROTA_OK = /^\/(evento\/[\w-]+|business\/[\w-]+|coupons|roteiro\/[\w-]+|roteiros|plans|\(tabs\)(\/\w+)?)?$/;

function json(corpo: unknown, status = 200) {
  return new Response(JSON.stringify(corpo), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ erro: 'Método não permitido.' }, 405);

  const url = Deno.env.get('SUPABASE_URL')!;
  const auth = req.headers.get('Authorization') ?? '';
  const quem = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } } });
  const { data: u } = await quem.auth.getUser();
  if (!u?.user) return json({ erro: 'Entre de novo no painel.' }, 401);
  const { data: ehAdmin } = await quem.rpc('is_admin');
  if (ehAdmin !== true) return json({ erro: 'Só administradores podem enviar avisos.' }, 403);

  let b: any;
  try { b = await req.json(); } catch { return json({ erro: 'Pedido inválido.' }, 400); }
  const tipo = String(b?.tipo ?? '');
  const titulo = String(b?.titulo ?? '').trim();
  const corpo = String(b?.corpo ?? '').trim();
  const rota = b?.rota ? String(b.rota).trim() : '';
  const soTeste = b?.so_teste === true;
  if (!TIPOS.includes(tipo)) return json({ erro: 'Tipo de aviso inválido.' }, 400);
  if (titulo.length < 2 || titulo.length > 60) return json({ erro: 'O título precisa ter de 2 a 60 caracteres.' }, 400);
  if (corpo.length < 2 || corpo.length > 170) return json({ erro: 'A mensagem precisa ter de 2 a 170 caracteres.' }, 400);
  if (rota && !ROTA_OK.test(rota)) return json({ erro: 'Tela de destino não permitida.' }, 400);

  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  // 1) quem recebe
  let tokens: string[] = [];
  if (soTeste) {
    const { data } = await admin.from('push_dispositivos').select('token').eq('user_id', u.user.id).eq('ativo', true);
    tokens = (data ?? []).map((x: any) => x.token);
    if (!tokens.length) return json({ erro: 'Nenhum aparelho seu está com os avisos ativados. Ative em Conta > Notificações no app.' }, 400);
  } else {
    const { data, error } = await admin.rpc('push_tokens_para', { p_tipo: tipo });
    if (error) return json({ erro: 'Não consegui listar os aparelhos.' }, 500);
    tokens = (data ?? []).map((x: any) => x.token);
    if (!tokens.length) return json({ erro: 'Ninguém aceitou receber esse tipo de aviso ainda.' }, 400);
  }

  // 2) envio em lotes de 100 (limite da Expo)
  let aceitos = 0, erros = 0;
  const invalidos: string[] = [];
  const cab: Record<string, string> = { 'Content-Type': 'application/json', Accept: 'application/json' };
  const tokenExpo = Deno.env.get('EXPO_ACCESS_TOKEN');
  if (tokenExpo) cab.Authorization = `Bearer ${tokenExpo}`;

  for (let i = 0; i < tokens.length; i += 100) {
    const lote = tokens.slice(i, i + 100);
    const msgs = lote.map((to) => ({
      to, title: titulo, body: corpo, sound: 'default', priority: 'high',
      data: { tipo, rota: rota || null },
    }));
    try {
      const r = await fetch('https://exp.host/--/api/v2/push/send', { method: 'POST', headers: cab, body: JSON.stringify(msgs) });
      const j = await r.json();
      const tickets: any[] = Array.isArray(j?.data) ? j.data : [];
      if (!r.ok || !tickets.length) { erros += lote.length; continue; }
      tickets.forEach((t, k) => {
        if (t?.status === 'ok') aceitos++;
        else {
          erros++;
          if (t?.details?.error === 'DeviceNotRegistered') invalidos.push(lote[k]);
        }
      });
    } catch {
      erros += lote.length;
    }
  }

  // 3) aparelhos que não existem mais saem da lista; guarda o histórico
  if (invalidos.length) {
    await admin.from('push_dispositivos').update({ ativo: false, atualizado_em: new Date().toISOString() }).in('token', invalidos);
  }
  await admin.from('push_envios').insert({
    tipo, titulo, corpo, rota: rota || null, so_teste: soTeste,
    enviado_por: u.user.id, total: tokens.length, aceitos, erros,
  });

  return json({ ok: true, total: tokens.length, aceitos, erros, removidos: invalidos.length });
});
