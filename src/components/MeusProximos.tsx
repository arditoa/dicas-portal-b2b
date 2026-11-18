// Rodada 148 — Conta › MEUS PRÓXIMOS PROGRAMAS: junta num lugar só o que a pessoa marcou para os próximos dias.
//   • Lista VIP (com o QR code pronto para mostrar na porta)
//   • Reservas (aguardando ou confirmadas)
//   • "Eu vou" em festas e na agenda dos bares
import { TITULO_SECAO } from '../constants/theme';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { supabase } from '../lib/supabase';

type Tipo = 'lista' | 'reserva' | 'euvou';
type Item = {
  chave: string;
  tipo: Tipo;
  quando: Date;
  titulo: string;
  sub: string;
  rota?: string;
  qr?: string; // id do pedido da lista VIP
  aguardando?: boolean;
};

const MESES = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
const hojeISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const deDia = (iso: string, hora?: string | null) => {
  const [a, m, d] = iso.split('-').map(Number);
  const [h, mi] = (hora || '00:00').split(':').map(Number);
  return new Date(a, (m || 1) - 1, d || 1, h || 0, mi || 0);
};
const hhmm = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

const ROTULO: Record<Tipo, { txt: string; icone: string; cor: string }> = {
  lista: { txt: 'Lista VIP', icone: 'maximize', cor: '#4CAF7D' },
  reserva: { txt: 'Reserva', icone: 'calendar', cor: '#B39DDB' },
  euvou: { txt: 'Eu vou', icone: 'check', cor: '#E1306C' },
};

export default function MeusProximos({ userId }: { userId: string | null }) {
  const router = useRouter();
  const [itens, setItens] = useState<Item[] | null>(null);
  const [verTodos, setVerTodos] = useState(false);
  const [qrAberto, setQrAberto] = useState<Item | null>(null);

  useFocusEffect(useCallback(() => {
    if (!userId) { setItens(null); return; }
    let vivo = true;
    (async () => {
      const desde = new Date(Date.now() - 6 * 3600 * 1000).toISOString();
      const [listas, reservas, presencas] = await Promise.all([
        (supabase.from('listas_vip_solicitacoes') as any)
          .select('id, status, listas_vip!inner(titulo, eventos!inner(id, titulo, data_inicio, locais(nome)))')
          .eq('user_id', userId)
          .in('status', ['solicitada', 'aprovada'])
          .gte('listas_vip.eventos.data_inicio', desde),
        (supabase.from('reservas') as any)
          .select('id, local_id, area_nome, data, horario, pessoas, status, locais(nome)')
          .eq('user_id', userId)
          .gte('data', hojeISO())
          .in('status', ['aguardando', 'confirmada']),
        (supabase.from('presencas') as any)
          .select('id, data, evento_id, agenda_id, local_id, eventos(titulo, data_inicio), agenda_semanal(titulo, horario), locais(nome)')
          .eq('user_id', userId)
          .gte('data', hojeISO()),
      ]);
      if (!vivo) return;
      const lista: Item[] = [];
      const eventosNaLista = new Set<string>();
      for (const p of (listas.data as any[]) || []) {
        const ev = p.listas_vip?.eventos;
        if (!ev) continue;
        eventosNaLista.add(ev.id);
        const quando = new Date(ev.data_inicio);
        lista.push({
          chave: `l-${p.id}`, tipo: 'lista', quando, titulo: ev.titulo,
          sub: [ev.locais?.nome, hhmm(quando), p.status === 'aprovada' ? 'QR pronto' : 'aguardando a casa'].filter(Boolean).join(' · '),
          rota: `/evento/${ev.id}`, qr: p.status === 'aprovada' ? p.id : undefined, aguardando: p.status !== 'aprovada',
        });
      }
      for (const r of (reservas.data as any[]) || []) {
        lista.push({
          chave: `r-${r.id}`, tipo: 'reserva', quando: deDia(r.data, r.horario), titulo: r.locais?.nome || 'Reserva',
          sub: [r.horario?.slice(0, 5), `${r.pessoas} ${r.pessoas === 1 ? 'pessoa' : 'pessoas'}`, r.area_nome, r.status === 'confirmada' ? 'confirmada' : 'aguardando a casa'].filter(Boolean).join(' · '),
          rota: '/minhas-reservas',
        });
      }
      for (const e of (presencas.data as any[]) || []) {
        if (e.evento_id && eventosNaLista.has(e.evento_id)) continue; // já aparece como Lista VIP
        const titulo = e.eventos?.titulo || e.agenda_semanal?.titulo || e.locais?.nome || 'Programa';
        const quando = e.eventos?.data_inicio ? new Date(e.eventos.data_inicio) : deDia(e.data, e.agenda_semanal?.horario?.slice(0, 5));
        lista.push({
          chave: `p-${e.id}`, tipo: 'euvou', quando, titulo,
          sub: [e.locais?.nome, e.eventos?.data_inicio ? hhmm(quando) : e.agenda_semanal?.horario].filter(Boolean).join(' · '),
          rota: e.evento_id ? `/evento/${e.evento_id}` : e.local_id ? `/business/${e.local_id}` : undefined,
        });
      }
      lista.sort((a, b) => a.quando.getTime() - b.quando.getTime());
      setItens(lista);
    })().catch(() => { if (vivo) setItens([]); });
    return () => { vivo = false; };
  }, [userId]));

  if (!userId || itens === null) return null;

  const mostrar = verTodos ? itens : itens.slice(0, 3);

  return (
    <View style={s.bloco}>
      <Text style={s.secao}>MEUS PRÓXIMOS PROGRAMAS</Text>
      {itens.length === 0 ? (
        <TouchableOpacity style={s.vazio} onPress={() => router.push('/(tabs)/events' as any)} accessibilityRole="button">
          <Feather name="calendar" size={16} color="#8E8BA3" />
          <Text style={s.vazioTxt}>Nada marcado ainda. Entre numa lista VIP, faça uma reserva ou toque em "Eu vou".</Text>
          <Feather name="chevron-right" size={16} color="#8E8BA3" />
        </TouchableOpacity>
      ) : (
        <View style={s.card}>
          {mostrar.map((it, i) => {
            const r = ROTULO[it.tipo];
            return (
              <TouchableOpacity
                key={it.chave}
                style={[s.linha, i < mostrar.length - 1 && s.borda]}
                activeOpacity={0.7}
                onPress={() => (it.qr ? setQrAberto(it) : it.rota ? router.push(it.rota as any) : undefined)}
                accessibilityRole="button"
              >
                <View style={s.data}>
                  <Text style={s.dataDia}>{String(it.quando.getDate()).padStart(2, '0')}</Text>
                  <Text style={s.dataMes}>{MESES[it.quando.getMonth()]}</Text>
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[s.tipo, { color: r.cor }]}>{r.txt}</Text>
                  <Text style={s.titulo} numberOfLines={1}>{it.titulo}</Text>
                  <Text style={s.sub} numberOfLines={1}>{it.sub}</Text>
                </View>
                {it.qr ? (
                  <View style={s.qrBtn}><Feather name="maximize" size={14} color="#FFF" /><Text style={s.qrBtnTxt}>QR</Text></View>
                ) : (
                  <Feather name="chevron-right" size={16} color="#8E8BA3" />
                )}
              </TouchableOpacity>
            );
          })}
          {itens.length > 3 && !verTodos && (
            <TouchableOpacity style={s.verTodos} onPress={() => setVerTodos(true)} accessibilityRole="button">
              <Text style={s.verTodosTxt}>Ver todos ({itens.length})</Text>
              <Feather name="chevron-down" size={14} color="#A0A0B2" />
            </TouchableOpacity>
          )}
        </View>
      )}

      <Modal visible={!!qrAberto} transparent animationType="fade" onRequestClose={() => setQrAberto(null)}>
        <Pressable style={s.veu} onPress={() => setQrAberto(null)}>
          <Pressable style={s.folha} onPress={() => {}}>
            <Text style={s.folhaTipo}>LISTA VIP</Text>
            <Text style={s.folhaTitulo} numberOfLines={2}>{qrAberto?.titulo}</Text>
            <Text style={s.folhaSub}>{qrAberto?.sub}</Text>
            {!!qrAberto?.qr && (
              <View style={s.qrCaixa}>
                <QRCode value={`dicasvip:${qrAberto.qr}`} size={200} backgroundColor="#FFFFFF" color="#000000" />
              </View>
            )}
            {!!qrAberto?.qr && <Text style={s.codigo}>{qrAberto.qr.replace(/-/g, '').slice(0, 6).toUpperCase()}</Text>}
            <Text style={s.dica}>Mostre este QR code na porta. Se a câmera não ler, diga o código acima. Leve um documento com foto.</Text>
            <View style={s.folhaBotoes}>
              {!!qrAberto?.rota && (
                <TouchableOpacity style={s.folhaSec} onPress={() => { const r = qrAberto.rota!; setQrAberto(null); router.push(r as any); }} accessibilityRole="button">
                  <Text style={s.folhaSecTxt}>Ver a festa</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={s.folhaPri} onPress={() => setQrAberto(null)} accessibilityRole="button">
                <Text style={s.folhaPriTxt}>Fechar</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  bloco: { marginBottom: 18 },
  secao: { ...TITULO_SECAO, marginTop: 8, marginBottom: 8, marginLeft: 6 },
  card: { backgroundColor: '#161520', borderColor: '#232230', borderWidth: 1, borderRadius: 16, overflow: 'hidden' },
  linha: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, paddingVertical: 11 },
  borda: { borderBottomWidth: 1, borderBottomColor: '#232230' },
  data: { width: 42, height: 46, borderRadius: 10, backgroundColor: '#232230', alignItems: 'center', justifyContent: 'center' },
  dataDia: { color: '#FFFFFF', fontSize: 16, fontWeight: '800', lineHeight: 18 },
  dataMes: { color: '#A0A0B2', fontSize: 10, fontWeight: '800', letterSpacing: 0.4 },
  tipo: { fontSize: 10.5, fontWeight: '800', letterSpacing: 0.3 },
  titulo: { color: '#F5F5F7', fontSize: 14, fontWeight: '800', marginTop: 1 },
  sub: { color: '#A0A0B2', fontSize: 12, marginTop: 1 },
  qrBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#4CAF7D', borderRadius: 999, paddingHorizontal: 10, height: 30 },
  qrBtnTxt: { color: '#FFF', fontSize: 12, fontWeight: '800' },
  verTodos: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#232230' },
  verTodosTxt: { fontSize: 12, fontWeight: '700', color: '#A0A0B2' },
  vazio: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#161520', borderColor: '#232230', borderWidth: 1, borderRadius: 16, padding: 14 },
  vazioTxt: { flex: 1, color: '#A0A0B2', fontSize: 12, lineHeight: 17 },
  veu: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  folha: { width: '100%', maxWidth: 380, backgroundColor: '#14131C', borderColor: '#232230', borderWidth: 1, borderRadius: 20, padding: 20, alignItems: 'center' },
  folhaTipo: { color: '#4CAF7D', fontSize: 11, fontWeight: '800', letterSpacing: 1.2 },
  folhaTitulo: { color: '#FFF', fontSize: 18, fontWeight: '800', textAlign: 'center', marginTop: 4 },
  folhaSub: { color: '#A0A0B2', fontSize: 13, textAlign: 'center', marginTop: 2 },
  qrCaixa: { backgroundColor: '#FFF', padding: 14, borderRadius: 16, marginTop: 16 },
  codigo: { color: '#FFF', fontSize: 22, fontWeight: '800', letterSpacing: 4, marginTop: 12 },
  dica: { color: '#A0A0B2', fontSize: 12, textAlign: 'center', marginTop: 8, lineHeight: 17 },
  folhaBotoes: { flexDirection: 'row', gap: 10, marginTop: 16, alignSelf: 'stretch' },
  folhaSec: { flex: 1, height: 44, borderRadius: 22, borderWidth: 1, borderColor: '#2E2E3D', alignItems: 'center', justifyContent: 'center' },
  folhaSecTxt: { color: '#F5F5F7', fontSize: 14, fontWeight: '700' },
  folhaPri: { flex: 1, height: 44, borderRadius: 22, backgroundColor: '#E1306C', alignItems: 'center', justifyContent: 'center' },
  folhaPriTxt: { color: '#FFF', fontSize: 14, fontWeight: '800' },
});
