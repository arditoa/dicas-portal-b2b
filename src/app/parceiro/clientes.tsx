// Rodada 145 — Clientes VIP (aba Fidelizar › Clientes VIP).
// Nome, visitas (90 dias e total), última visita e aniversário (DD/MM, só de quem autorizou na Conta).
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { CP, TelaParceiro } from '../../components/parceiro/TelaParceiro';
import { ClienteVip, haQuanto, inicial, quandoAniversario, useClientesVip } from '../../lib/clientesVip';
import { useModoParceiro } from '../../lib/modoParceiro';

type Filtro = 'todos' | 'vip' | 'aniversario';
const DOURADO = '#C8853C';

export default function Clientes() {
  const router = useRouter();
  const params = useLocalSearchParams<{ filtro?: string }>();
  const { localAtivo, pode } = useModoParceiro();
  const { clientes, vips, aniversariantes, carregando, erro, recarregar } = useClientesVip(
    pode('resultados') ? localAtivo?.local_id : undefined,
  );
  const [filtro, setFiltro] = useState<Filtro>('todos');
  const [busca, setBusca] = useState('');

  useEffect(() => {
    if (params.filtro === 'vip' || params.filtro === 'aniversario') setFiltro(params.filtro);
  }, [params.filtro]);

  const lista = useMemo(() => {
    const base: ClienteVip[] = filtro === 'vip' ? vips : filtro === 'aniversario' ? aniversariantes : clientes;
    const q = busca.trim().toLowerCase();
    return q ? base.filter((c) => c.nome.toLowerCase().includes(q)) : base;
  }, [filtro, busca, clientes, vips, aniversariantes]);

  if (!localAtivo) return null;
  const meta = clientes[0]?.meta_vip ?? 3;

  return (
    <TelaParceiro atualizando={carregando && clientes.length > 0} aoAtualizar={recarregar}>
      <TouchableOpacity style={c.voltar} onPress={() => router.back()} accessibilityRole="button">
        <Feather name="chevron-left" size={18} color={CP.texto} />
        <Text style={c.voltarTxt}>Voltar</Text>
      </TouchableOpacity>
      <Text style={c.titulo}>Clientes VIP</Text>
      <Text style={c.sub}>Só quem já fez check-in na casa ou entrou pela Lista VIP. VIP = {meta} visitas ou mais nos últimos 90 dias.</Text>

      <View style={c.filtros}>
        {([
          ['todos', `Todos · ${clientes.length}`],
          ['vip', `VIP · ${vips.length}`],
          ['aniversario', `Aniversário · ${aniversariantes.length}`],
        ] as [Filtro, string][]).map(([k, t]) => (
          <TouchableOpacity key={k} style={[c.chip, filtro === k && c.chipAtivo]} onPress={() => setFiltro(k)}>
            <Text style={[c.chipTxt, filtro === k && { color: '#FFFFFF' }]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {clientes.length > 8 && (
        <View style={c.busca}>
          <Feather name="search" size={15} color={CP.fraco} />
          <TextInput value={busca} onChangeText={setBusca} placeholder="Buscar pelo nome" placeholderTextColor={CP.fraco} style={c.buscaInput} />
        </View>
      )}

      {erro === 'atualizar' ? (
        <Text style={c.vazio}>A lista de clientes chega com a próxima atualização do sistema.</Text>
      ) : erro ? (
        <Text style={c.vazio}>Não foi possível carregar agora. Puxe para atualizar.</Text>
      ) : !carregando && lista.length === 0 ? (
        <Text style={c.vazio}>
          {filtro === 'aniversario'
            ? 'Nenhum cliente que já veio à casa faz aniversário nos próximos 30 dias (ou ainda não autorizou mostrar a data).'
            : 'Ainda ninguém fez check-in na casa. Quem fizer check-in ou entrar pela Lista VIP aparece aqui.'}
        </Text>
      ) : (
        <View style={c.lista}>
          {lista.map((cl, i) => (
            <View key={cl.user_id} style={[c.linha, i > 0 && c.borda]}>
              <View style={[c.avatar, cl.vip && { backgroundColor: '#3A2A14' }]}>
                <Text style={[c.avatarTxt, cl.vip && { color: DOURADO }]}>{inicial(cl.nome)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={c.nome} numberOfLines={1}>{cl.nome}</Text>
                  {cl.vip && <View style={c.seloVip}><Text style={c.seloVipTxt}>VIP</Text></View>}
                </View>
                <Text style={c.linhaSub}>
                  {cl.visitas_periodo} em 90 dias · {cl.visitas_total} no total · {haQuanto(cl.ultima_visita)}
                </Text>
              </View>
              {cl.aniversario ? (
                <View style={[c.niver, cl.dias_para_aniversario !== null && cl.dias_para_aniversario <= 7 && { backgroundColor: '#B0245A' }]}>
                  <Feather name="gift" size={11} color="#FFFFFF" />
                  <View>
                    <Text style={c.niverData}>{cl.aniversario}</Text>
                    {cl.dias_para_aniversario !== null && cl.dias_para_aniversario <= 30 && (
                      <Text style={c.niverQuando}>{quandoAniversario(cl.dias_para_aniversario)}</Text>
                    )}
                  </View>
                </View>
              ) : null}
            </View>
          ))}
        </View>
      )}

      <View style={c.lgpd}>
        <Feather name="shield" size={13} color={CP.fraco} />
        <Text style={c.lgpdTxt}>
          O aniversário (só dia e mês) aparece apenas para quem autorizou na Conta do app. Use para um mimo da casa, nunca repasse a lista.
        </Text>
      </View>
    </TelaParceiro>
  );
}

const c = StyleSheet.create({
  voltar: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 16, alignSelf: 'flex-start' },
  voltarTxt: { color: CP.texto, fontSize: 13, fontWeight: '700' },
  titulo: { color: CP.texto, fontSize: 22, fontWeight: '800', marginTop: 8 },
  sub: { color: CP.dim, fontSize: 12, lineHeight: 17, marginTop: 2 },
  filtros: { flexDirection: 'row', gap: 6, marginTop: 14, flexWrap: 'wrap' },
  chip: { borderRadius: 16, borderWidth: 1, borderColor: CP.borda, backgroundColor: CP.card, paddingHorizontal: 12, height: 32, justifyContent: 'center' },
  chipAtivo: { backgroundColor: CP.rosa, borderColor: CP.rosa },
  chipTxt: { color: CP.dim, fontSize: 12, fontWeight: '700' },
  busca: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: CP.card, borderRadius: 12, paddingHorizontal: 12, height: 42, marginTop: 10, borderColor: CP.borda, borderWidth: 1 },
  buscaInput: { flex: 1, color: CP.texto, fontSize: 14 },
  vazio: { color: CP.dim, fontSize: 13, lineHeight: 19, backgroundColor: CP.card, borderRadius: 14, padding: 14, marginTop: 12 },
  lista: { backgroundColor: CP.card, borderColor: CP.borda, borderWidth: 1, borderRadius: 16, overflow: 'hidden', marginTop: 12 },
  linha: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, paddingVertical: 10, minHeight: 60 },
  borda: { borderTopColor: CP.borda, borderTopWidth: StyleSheet.hairlineWidth },
  avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#24223A', alignItems: 'center', justifyContent: 'center' },
  avatarTxt: { color: '#B9A6FF', fontSize: 15, fontWeight: '800' },
  nome: { color: CP.texto, fontSize: 14, fontWeight: '700', flexShrink: 1 },
  seloVip: { backgroundColor: '#3A2A14', borderRadius: 6, paddingHorizontal: 5, paddingVertical: 1 },
  seloVipTxt: { color: DOURADO, fontSize: 9, fontWeight: '800' },
  linhaSub: { color: CP.dim, fontSize: 11, marginTop: 2 },
  niver: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#3A2034', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 5 },
  niverData: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
  niverQuando: { color: 'rgba(255,255,255,0.8)', fontSize: 9, fontWeight: '700' },
  lgpd: { flexDirection: 'row', gap: 8, marginTop: 14 },
  lgpdTxt: { flex: 1, color: CP.fraco, fontSize: 11, lineHeight: 16 },
});
