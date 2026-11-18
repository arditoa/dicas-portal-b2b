// Modo parceiro — Fechamento da noite (migração 141). Chega por notificação às 6h; aqui dá para ver qualquer noite.
// A "noite" vai das 14h do dia às 10h do dia seguinte. Só números da casa (nunca quem).
import { Feather } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { CP, ESP, RAIO, TelaParceiro, TituloSecao } from '../../components/parceiro/TelaParceiro';
import { useModoParceiro } from '../../lib/modoParceiro';
import { supabase } from '../../lib/supabase';

type Fech = { dia: string; pessoas: number; checkins: number; ingressos_entraram: number; ingressos_vendidos_hoje: number; vendas_centavos: number;
  cupons_usados: number; estou_aqui: number; pedidos_de_ajuda: number; ajuda_atendida: number; presentes_aniversario: number;
  pico: { hora: number; n: number } | null; selo: { tem_selo: boolean; suspenso?: boolean; media: number | null; respostas: number } | null };
const ontem = () => new Date(Date.now() - 3 * 3600e3 - 864e5).toISOString().slice(0, 10);
const somar = (dia: string, n: number) => new Date(new Date(dia + 'T12:00:00Z').getTime() + n * 864e5).toISOString().slice(0, 10);
const nomeDia = (dia: string) => new Date(dia + 'T12:00:00Z').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit', timeZone: 'UTC' });
const reais = (c: number) => (c / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function Fechamento() {
  const { localAtivo } = useModoParceiro();
  const localId = localAtivo?.local_id;
  const [dia, setDia] = useState(ontem());
  const [f, setF] = useState<Fech | null>(null);
  const [erro, setErro] = useState('');

  const carregar = useCallback(async () => {
    if (!localId) return;
    setF(null); setErro('');
    const { data, error } = await supabase.rpc('fechamento_da_noite', { p_local: localId, p_dia: dia });
    if (error) setErro(error.message.includes('fechamento_da_noite') ? 'Peça à equipe Dicas para ligar esta função (migração 141).' : error.message);
    else setF(data as Fech);
  }, [localId, dia]);
  useEffect(() => { void carregar(); }, [carregar]);

  const itens: [string, string, string][] = f ? [
    ['users', 'Pessoas registradas', String(f.pessoas)],
    ['check-circle', 'Check-ins', String(f.checkins)],
    ['credit-card', 'Entraram com ingresso', String(f.ingressos_entraram)],
    ['shopping-bag', 'Ingressos vendidos', `${f.ingressos_vendidos_hoje} · ${reais(f.vendas_centavos)}`],
    ['tag', 'Cupons usados', String(f.cupons_usados)],
    ['map-pin', '"Estou aqui agora"', String(f.estou_aqui)],
    ['gift', 'Presentes de aniversário', String(f.presentes_aniversario)],
  ] : [];

  return (
    <TelaParceiro titulo="Fechamento da noite" subtitulo="O que o app registrou na sua casa">
      <View style={s.nav}>
        <TouchableOpacity onPress={() => setDia(somar(dia, -1))} style={s.seta} accessibilityLabel="Noite anterior"><Feather name="chevron-left" size={20} color={CP.texto} /></TouchableOpacity>
        <Text style={s.dia}>{nomeDia(dia)}</Text>
        <TouchableOpacity onPress={() => dia < ontem() && setDia(somar(dia, 1))} style={[s.seta, dia >= ontem() && { opacity: 0.3 }]} accessibilityLabel="Próxima noite"><Feather name="chevron-right" size={20} color={CP.texto} /></TouchableOpacity>
      </View>
      {!!erro && <Text style={s.nota}>{erro}</Text>}
      {!f && !erro ? <ActivityIndicator color={CP.rosa} /> : f && (
        <>
          {f.pico && (
            <View style={s.destaque}>
              <Feather name="trending-up" size={18} color="#F2C94C" />
              <Text style={s.destaqueTxt}>Pico de chegada às {String(f.pico.hora).padStart(2, '0')}h</Text>
            </View>
          )}
          <View style={s.grade}>
            {itens.map(([ic, r, v]) => (
              <View key={r} style={s.caixa}>
                <Feather name={ic as any} size={15} color={CP.dim} />
                <Text style={s.valor}>{v}</Text>
                <Text style={s.rot}>{r}</Text>
              </View>
            ))}
          </View>

          <TituloSecao texto="Segurança" />
          <View style={s.card}>
            <Text style={s.linha}>
              {f.pedidos_de_ajuda === 0 ? 'Nenhum pedido de ajuda pelo app.' : `${f.pedidos_de_ajuda} pedido(s) de ajuda, ${f.ajuda_atendida} atendido(s).`}
            </Text>
            <Text style={[s.linha, { marginTop: 6 }]}>
              {f.selo?.suspenso ? 'Selo Lugar seguro suspenso: fale com a equipe Dicas.'
                : f.selo?.tem_selo ? `Selo Lugar seguro ativo · nota ${f.selo.media?.toFixed(1)}`
                : f.selo && f.selo.respostas >= 5 ? `Nota de segurança ${f.selo.media?.toFixed(1)} (${f.selo.respostas} avaliações). Selo a partir de 10 avaliações e nota 4,3.`
                : 'Selo Lugar seguro: ainda poucas avaliações de quem veio.'}
            </Text>
          </View>
          <Text style={s.nota}>Conta quem usou o app (check-in, ingresso, "Estou aqui"). O público total da casa costuma ser maior.</Text>
        </>
      )}
    </TelaParceiro>
  );
}

const s = StyleSheet.create({
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: ESP.m },
  seta: { padding: 8 },
  dia: { color: CP.texto, fontSize: 15, fontWeight: '800', textTransform: 'capitalize' },
  destaque: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#F2C94C1A', borderRadius: RAIO.m, padding: ESP.m, marginBottom: ESP.m },
  destaqueTxt: { color: CP.texto, fontSize: 14, fontWeight: '800' },
  grade: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  caixa: { width: '48.5%', backgroundColor: CP.card, borderWidth: 1, borderColor: CP.borda, borderRadius: RAIO.m, padding: ESP.m, gap: 4 },
  valor: { color: CP.texto, fontSize: 18, fontWeight: '900' },
  rot: { color: CP.dim, fontSize: 12 },
  card: { backgroundColor: CP.card, borderWidth: 1, borderColor: CP.borda, borderRadius: RAIO.m, padding: ESP.m },
  linha: { color: CP.texto, fontSize: 13.5, lineHeight: 19 },
  nota: { color: CP.fraco, fontSize: 12, lineHeight: 17, marginTop: ESP.m },
});
