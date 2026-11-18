// Modo equipe · Carteira de clientes: lembretes das casas (o que falta cada uma fazer) e cobrança no WhatsApp.
// Saiu do Início para não poluir. Padrão: só casas com plano pago (quem a equipe acompanha de perto).
// Futuro: cada casa ganha um "executivo de contas" (pessoa ou agente de IA) e cada um vê só a carteira dele.
import { Feather } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import TelaAdm, { CA, sa } from '../../components/adm/TelaAdm';
import { supabase } from '../../lib/supabase';

type Lembrete = { chave: string; local_id: string; casa: string; telefone: string | null; titulo: string; corpo: string; avisado_em: string | null };
const PAGOS = ['intermediario', 'premium', 'fundador'];
const NOME_PLANO: Record<string, string> = { intermediario: 'Intermediário', premium: 'Premium', fundador: 'Fundador' };

function linkWhats(tel: string, texto: string) {
  let n = tel.replace(/\D/g, '');
  if (n.length === 10 || n.length === 11) n = '55' + n;
  return `https://api.whatsapp.com/send?phone=${n}&text=${encodeURIComponent(texto)}`;
}

export default function CarteiraAdm() {
  const router = useRouter();
  const [lembretes, setLembretes] = useState<Lembrete[] | null>(null);
  const [planos, setPlanos] = useState<Record<string, string | null>>({});
  const [todas, setTodas] = useState(false);
  const [erro, setErro] = useState('');

  const carregar = useCallback(async () => {
    const lb = await supabase.rpc('admin_lembretes_casas');
    if (lb.error) { setErro(lb.error.message); setLembretes([]); return; }
    const lista = (lb.data as Lembrete[]) || [];
    const ids = Array.from(new Set(lista.map((l) => l.local_id)));
    if (ids.length) {
      const { data } = await supabase.from('locais').select('id, plano_comercial').in('id', ids);
      setPlanos(Object.fromEntries(((data as any[]) || []).map((x) => [x.id, x.plano_comercial])));
    }
    setLembretes(lista);
  }, []);
  useFocusEffect(useCallback(() => { void carregar(); }, [carregar]));

  const cobrar = (l: Lembrete) => {
    if (!l.telefone) return Alert.alert('Sem telefone', `${l.casa} não tem telefone de contato cadastrado.`);
    const texto = `Oi, ${l.casa}! Aqui é a equipe Dicas LGBT+ 🌈\n\n${l.titulo}: ${l.corpo}\n\nQualquer dúvida é só chamar.`;
    void Linking.openURL(linkWhats(l.telefone, texto));
  };

  const visiveis = (lembretes || []).filter((l) => todas || PAGOS.includes(planos[l.local_id] || ''));
  // Agrupa por casa: uma casa, vários lembretes.
  const porCasa = new Map<string, Lembrete[]>();
  for (const l of visiveis) porCasa.set(l.local_id, [...(porCasa.get(l.local_id) || []), l]);

  return (
    <TelaAdm titulo="Carteira de clientes" subtitulo="O que cada casa precisa fazer · os lembretes vão sozinhos às 10h no celular dela" voltar>
      <View style={c.filtros}>
        {[[false, 'Planos pagos'], [true, 'Todas as casas']].map(([v, r]) => (
          <TouchableOpacity key={r as string} style={[c.chip, todas === v && c.chipOn]} onPress={() => setTodas(v as boolean)}>
            <Text style={[c.chipTxt, todas === v && { color: '#0B0B0E' }]}>{r as string}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {!!erro && <Text style={[sa.sub, { color: CA.amarelo }]}>{erro.includes('admin_lembretes') ? 'Rode a migração 135 no Supabase.' : erro}</Text>}
      {lembretes === null ? <ActivityIndicator color={CA.rosa} /> : porCasa.size === 0 ? (
        <View style={[sa.card, { flexDirection: 'row', alignItems: 'center', gap: 10 }]}>
          <Feather name="check-circle" size={18} color={CA.verde} /><Text style={sa.tit}>Nenhuma casa {todas ? '' : 'paga '}com pendência.</Text>
        </View>
      ) : Array.from(porCasa.entries()).map(([id, ls]) => (
        <View key={id} style={sa.card}>
          <TouchableOpacity style={c.cab} onPress={() => router.push(`/adm/local/${id}` as any)} accessibilityRole="button">
            <Text style={[sa.tit, { flex: 1 }]} numberOfLines={1}>{ls[0].casa}</Text>
            {!!NOME_PLANO[planos[id] || ''] && <View style={c.plano}><Text style={c.planoTxt}>{NOME_PLANO[planos[id] || '']}</Text></View>}
            <Feather name="chevron-right" size={15} color={CA.fraco} />
          </TouchableOpacity>
          {ls.map((l) => (
            <View key={l.chave} style={c.item}>
              <View style={{ flex: 1 }}>
                <Text style={sa.sub}>{l.titulo}. {l.corpo}</Text>
                <Text style={[sa.sub, { marginTop: 3, fontSize: 11, color: l.avisado_em ? CA.verde : CA.fraco }]}>{l.avisado_em ? 'Avisado no app' : 'Ainda não avisado'}</Text>
              </View>
              <TouchableOpacity style={c.whats} onPress={() => cobrar(l)} accessibilityRole="button" accessibilityLabel={`Cobrar ${l.casa} no WhatsApp`}>
                <Feather name="message-circle" size={14} color="#FFF" /><Text style={c.whatsTxt}>WhatsApp</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      ))}
    </TelaAdm>
  );
}

const c = StyleSheet.create({
  filtros: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  chip: { borderWidth: 1, borderColor: CA.borda, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 7 },
  chipOn: { backgroundColor: '#FFF', borderColor: '#FFF' },
  chipTxt: { color: CA.texto, fontSize: 12, fontWeight: '700' },
  cab: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  plano: { backgroundColor: '#7E57C233', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  planoTxt: { color: '#C4B5FD', fontSize: 10.5, fontWeight: '800' },
  item: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 8, marginTop: 6, borderTopWidth: 1, borderTopColor: CA.borda },
  whats: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#25D366', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  whatsTxt: { color: '#FFF', fontSize: 11.5, fontWeight: '800' },
});
