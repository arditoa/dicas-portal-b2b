// @ts-nocheck — código Deno (Edge Function), conferido pelo Deno no deploy, não pelo tsc do app.
// Edge Function "avisar-reserva" — avisa o cliente por push quando a casa confirma ou recusa a reserva
// (Reservas fase 2, 13/11/2026). Chamada pelo app (Modo parceiro › Aprovações) e pelo portal (Reservas) logo
// depois de responder_reserva.
//
// Entrada (JSON): { reserva_id: string }
// Segurança: lê a reserva com o login de quem chama — a RLS de public.reservas só mostra a reserva para quem pode
// responder (dono, equipe com 'lista_vip', admin) ou para o próprio cliente. O cliente não avisa a si mesmo.
// Só avisa reservas "confirmada" ou "recusada", e só uma vez por resposta (push_envios guarda o histórico).
// É um aviso da própria reserva da pessoa (transacional): vai para os aparelhos dela com os avisos ligados,
// sem depender do tipo de aviso escolhido em Conta › Notificações.
//
// Publicar: supabase functions deploy avisar-reserva
import { createClient } from 'jsr:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (corpo: unknown, status = 200) => new Response(JSON.stringify(corpo), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
const DIAS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ erro: 'Método não permitido.' }, 405);

  const url = Deno.env.get('SUPABASE_URL')!;
  const auth = req.headers.get('Authorization') ?? '';
  const quem = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } } });
  const { data: u } = await quem.auth.getUser();
  if (!u?.user) return json({ erro: 'Entre de novo.' }, 401);

  let b: any;
  try { b = await req.json(); } catch { return json({ erro: 'Pedido inválido.' }, 400); }
  const id = String(b?.reserva_id ?? '');
  if (!/^[0-9a-f-]{36}$/i.test(id)) return json({ erro: 'Reserva inválida.' }, 400);

  // Lê com o login de quem chama (RLS decide se pode).
  const { data: r } = await quem
    .from('reservas')
    .select('id, user_id, local_id, status, data, horario, area_nome, pessoas, resposta, respondido_em, locais(nome)')
    .eq('id', id)
    .maybeSingle();
  if (!r) return json({ erro: 'Reserva não encontrada.' }, 404);
  if (r.user_id === u.user.id) return json({ erro: 'Sem permissão.' }, 403);
  if (r.status !== 'confirmada' && r.status !== 'recusada') return json({ ok: true, enviado: false, motivo: 'situação sem aviso' });

  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  // Uma vez por resposta: se já avisou depois desta resposta, não repete.
  const chave = `reserva:${r.id}:${r.status}`;
  const { data: ja } = await admin.from('push_envios').select('id').eq('tipo', 'lembretes').eq('rota', '/minhas-reservas').eq('titulo', chave.slice(0, 60)).limit(1);
  if (ja && ja.length) return json({ ok: true, enviado: false, motivo: 'já avisado' });

  const { data: aparelhos } = await admin.from('push_dispositivos').select('token').eq('user_id', r.user_id).eq('ativo', true);
  const tokens = (aparelhos ?? []).map((x: any) => x.token);
  if (!tokens.length) return json({ ok: true, enviado: false, motivo: 'cliente sem avisos ligados' });

  const d = new Date(`${r.data}T12:00:00`);
  const quando = `${DIAS[d.getDay()]} ${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')} às ${String(r.horario).slice(0, 5)}`;
  const casa = (r as any).locais?.nome || 'a casa';
  const titulo = r.status === 'confirmada' ? 'Reserva confirmada!' : 'Reserva não confirmada';
  const corpo = (r.status === 'confirmada'
    ? `${casa} confirmou sua reserva: ${quando}, ${r.pessoas} pessoa${r.pessoas === 1 ? '' : 's'} · ${r.area_nome}.`
    : `${casa} não conseguiu confirmar sua reserva de ${quando}.${r.resposta ? ` ${r.resposta}` : ''}`).slice(0, 170);

  const cab: Record<string, string> = { 'Content-Type': 'application/json', Accept: 'application/json' };
  const tokenExpo = Deno.env.get('EXPO_ACCESS_TOKEN');
  if (tokenExpo) cab.Authorization = `Bearer ${tokenExpo}`;
  let aceitos = 0, erros = 0;
  const invalidos: string[] = [];
  try {
    const resp = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST', headers: cab,
      body: JSON.stringify(tokens.map((to) => ({ to, title: titulo, body: corpo, sound: 'default', priority: 'high', data: { tipo: 'reserva', rota: '/minhas-reservas' } }))),
    });
    const j = await resp.json();
    const tickets: any[] = Array.isArray(j?.data) ? j.data : [];
    tickets.forEach((t, k) => {
      if (t?.status === 'ok') aceitos++;
      else { erros++; if (t?.details?.error === 'DeviceNotRegistered') invalidos.push(tokens[k]); }
    });
  } catch {
    erros = tokens.length;
  }
  if (invalidos.length) await admin.from('push_dispositivos').update({ ativo: false, atualizado_em: new Date().toISOString() }).in('token', invalidos);
  // Histórico (e trava de "uma vez só": o título guarda a chave da resposta).
  await admin.from('push_envios').insert({ tipo: 'lembretes', titulo: chave.slice(0, 60), corpo, rota: '/minhas-reservas', so_teste: false, enviado_por: u.user.id, total: tokens.length, aceitos, erros });
  return json({ ok: true, enviado: aceitos > 0, aceitos, erros });
});
