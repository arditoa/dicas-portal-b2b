// Rodada 145 — aba Fidelizar: quem são os clientes que voltam (VIPs e aniversariantes) + ferramentas.
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { CP, GradeItens, TelaParceiro, TituloSecao } from '../../../components/parceiro/TelaParceiro';
import { inicial, quandoAniversario, useClientesVip } from '../../../lib/clientesVip';
import { itensDaAba } from '../../../lib/parceiroMenu';
import { useModoParceiro } from '../../../lib/modoParceiro';

const DOURADO = '#C8853C';

export default function Fidelizar() {
  const router = useRouter();
  const { localAtivo, pode } = useModoParceiro();
  const podeVer = pode('resultados');
  const { clientes, vips, aniversariantes, carregando, erro, recarregar } = useClientesVip(podeVer ? localAtivo?.local_id : undefined);
  if (!localAtivo) return null;
  const itens = itensDaAba('fidelizar', localAtivo, pode).filter((i) => i.chave !== 'clientes');
  const abrir = (filtro?: string) => router.push({ pathname: '/parceiro/clientes', params: filtro ? { filtro } : {} });

  return (
    <TelaParceiro
      titulo="Fidelizar"
      subtitulo="Cada check-in e cada entrada pela Lista VIP somam uma visita. Quem volta sempre vira VIP."
      atualizando={carregando && clientes.length > 0} aoAtualizar={podeVer ? recarregar : undefined}>
      {podeVer && (
        <>
          <TituloSecao
            texto="Seus clientes"
            direita={clientes.length > 0 ? <TouchableOpacity onPress={() => abrir()}><Text style={f.verTodos}>Ver todos</Text></TouchableOpacity> : undefined}
          />
          {erro === 'atualizar' ? (
            <Text style={f.aviso}>A lista de clientes chega com a próxima atualização do sistema.</Text>
          ) : (
            <>
              <View style={f.resumo}>
                <Caixa valor={clientes.length} rotulo="Clientes" sub="com visita" cor="#7E57C2" icone="users" onPress={() => abrir()} />
                <Caixa valor={vips.length} rotulo="VIPs" sub="vêm sempre" cor={DOURADO} icone="award" onPress={() => abrir('vip')} />
                <Caixa valor={aniversariantes.length} rotulo="Aniversários" sub="em 30 dias" cor={CP.rosa} icone="gift" onPress={() => abrir('aniversario')} />
              </View>

              {aniversariantes.length > 0 && (
                <TouchableOpacity style={f.niver} onPress={() => abrir('aniversario')} activeOpacity={0.85}>
                  <View style={f.niverIcone}><Feather name="gift" size={18} color="#FFFFFF" /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={f.niverTitulo} numberOfLines={1}>
                      {aniversariantes[0].nome} · {aniversariantes[0].aniversario}
                    </Text>
                    <Text style={f.niverSub}>
                      {quandoAniversario(aniversariantes[0].dias_para_aniversario)}
                      {aniversariantes.length > 1 ? ` · e mais ${aniversariantes.length - 1}` : ''} · bom dia para um mimo da casa
                    </Text>
                  </View>
                  <Feather name="chevron-right" size={18} color="#FFFFFF" />
                </TouchableOpacity>
              )}

              {vips.slice(0, 3).map((c, i) => (
                <TouchableOpacity key={c.user_id} style={[f.vip, i === 0 && { marginTop: 10 }]} onPress={() => abrir('vip')} activeOpacity={0.85}>
                  <View style={f.avatar}><Text style={f.avatarTxt}>{inicial(c.nome)}</Text></View>
                  <View style={{ flex: 1 }}>
                    <Text style={f.vipNome} numberOfLines={1}>{c.nome}</Text>
                    <Text style={f.vipSub}>{c.visitas_periodo} visitas em 90 dias · {c.visitas_total} no total</Text>
                  </View>
                  <View style={f.selo}><Feather name="award" size={11} color={DOURADO} /><Text style={f.seloTxt}>VIP</Text></View>
                </TouchableOpacity>
              ))}
              {!carregando && clientes.length === 0 && (
                <Text style={f.aviso}>Quando o público fizer check-in ou entrar pela Lista VIP, os clientes aparecem aqui.</Text>
              )}
            </>
          )}
        </>
      )}

      {itens.length > 0 && (
        <>
          <TituloSecao texto="Ferramentas" />
          <GradeItens itens={itens} />
        </>
      )}
    </TelaParceiro>
  );
}

function Caixa({ valor, rotulo, sub, cor, icone, onPress }: { valor: number; rotulo: string; sub: string; cor: string; icone: keyof typeof Feather.glyphMap; onPress: () => void }) {
  return (
    <TouchableOpacity style={[f.caixa, { backgroundColor: cor + '1C', borderColor: cor + '55' }]} onPress={onPress} activeOpacity={0.85}>
      <Feather name={icone} size={16} color={cor} />
      <Text style={f.caixaValor}>{valor}</Text>
      <Text style={f.caixaRotulo}>{rotulo}</Text>
      <Text style={f.caixaSub}>{sub}</Text>
    </TouchableOpacity>
  );
}

const f = StyleSheet.create({
  intro: { color: CP.dim, fontSize: 13, lineHeight: 19 },
  verTodos: { color: CP.rosa, fontSize: 12, fontWeight: '800' },
  aviso: { color: CP.dim, fontSize: 13, lineHeight: 19, backgroundColor: CP.card, borderRadius: 14, padding: 14, marginTop: 4 },
  resumo: { flexDirection: 'row', gap: 8 },
  caixa: { flex: 1, borderRadius: 16, borderWidth: 1, padding: 12, minHeight: 104 },
  caixaValor: { color: '#FFFFFF', fontSize: 26, fontWeight: '800', marginTop: 6 },
  caixaRotulo: { color: CP.texto, fontSize: 12, fontWeight: '800' },
  caixaSub: { color: CP.dim, fontSize: 10, marginTop: 1 },
  niver: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#B0245A', borderRadius: 16, padding: 12, marginTop: 10 },
  niverIcone: { width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  niverTitulo: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  niverSub: { color: 'rgba(255,255,255,0.85)', fontSize: 11, marginTop: 2 },
  vip: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: CP.card, borderColor: CP.borda, borderWidth: 1, borderRadius: 14, padding: 10, marginTop: 6 },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#3A2A14', alignItems: 'center', justifyContent: 'center' },
  avatarTxt: { color: DOURADO, fontSize: 14, fontWeight: '800' },
  vipNome: { color: CP.texto, fontSize: 14, fontWeight: '700' },
  vipSub: { color: CP.dim, fontSize: 11, marginTop: 1 },
  selo: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#3A2A14', borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3 },
  seloTxt: { color: DOURADO, fontSize: 10, fontWeight: '800' },
});
