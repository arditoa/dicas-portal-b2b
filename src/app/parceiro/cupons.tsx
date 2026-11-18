// Tela 4 do Modo parceiro — Cupons (Divulgar › Cupons). Regras do portal (dashboard/cupons); dados em src/lib/parceiro/cupons.ts.
//   - lista com a situação (no ar, pausado, vencido, esgotado, começa dd/mm) e o uso de cada cupom (uso_dos_cupons, 106);
//   - etiqueta do plano "Liberado agora / Libera dd/mm" (uso_ofertas_periodo);
//   - Premium e Fundador: 1 a cada 7 dias · Intermediário: 1 a cada 14 · Gratuito: cadeado e "Falar com a equipe" (sem preço);
//   - pausar/retomar direto na lista; tocar abre a edição. O app não apaga cupom.
// Permissão: 'cupons' (dono e equipe; a equipe precisa da 104 para ver o "Libera dd/mm").
import { Feather } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { CP, ESP, RAIO, TelaParceiro, TituloSecao } from '../../components/parceiro/TelaParceiro';
import { textoJanela } from '../../lib/janelaCupom';
import { recursosDaCategoria, useModoParceiro } from '../../lib/modoParceiro';
import {
  Cupom, ddmm, etiquetaDoPlano, listarCupons, pausarCupom, situacaoDoCupom, textoDoLimite, UsoCupom, usoDoPlano, UsoPlano, usoDosCupons,
} from '../../lib/parceiro/cupons';
import { falarComEquipe, MSG_CUPOM_PLANO_PAGO, nivelDoPlano } from '../../lib/parceiroMenu';

export default function Cupons() {
  const router = useRouter();
  const { localAtivo, pode } = useModoParceiro();
  const localId = localAtivo?.local_id || '';
  const r = localAtivo ? recursosDaCategoria(localAtivo.categoria) : null;
  const liberado = !!localAtivo && !!r && r.cupom !== false && pode('cupons');
  const gratuito = nivelDoPlano(localAtivo?.plano_comercial) === 'gratuito';
  const desconto = r?.cupom === 'desconto';

  const [cupons, setCupons] = useState<Cupom[]>([]);
  const [uso, setUso] = useState<Record<string, UsoCupom>>({});
  const [plano, setPlano] = useState<UsoPlano | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [mudando, setMudando] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    if (!localId) return;
    setErro('');
    try {
      const [lista, usos, p] = await Promise.all([listarCupons(localId), usoDosCupons(localId), gratuito ? Promise.resolve(null) : usoDoPlano(localId)]);
      setCupons(lista);
      setUso(usos);
      setPlano(p);
    } catch (e: any) {
      setErro(e?.message || 'Não deu para carregar os cupons.');
    } finally {
      setCarregando(false);
    }
  }, [localId, gratuito]);

  useFocusEffect(useCallback(() => { if (liberado) void carregar(); }, [liberado, carregar]));

  const etiqueta = etiquetaDoPlano(plano);
  const podeCriar = !gratuito && (etiqueta ? etiqueta.livre : true);

  const novo = () => {
    if (gratuito) {
      return Alert.alert('Cupons', MSG_CUPOM_PLANO_PAGO, [
        { text: 'Agora não', style: 'cancel' },
        { text: 'Falar com a equipe', onPress: () => void falarComEquipe(`Olá! Sou do ${localAtivo?.nome || 'meu local'} e quero liberar os cupons no app.`) },
      ]);
    }
    if (!podeCriar) {
      return Alert.alert('Próximo cupom', `${textoDoLimite(plano) || ''}\n\n${etiqueta?.txt || ''}. Enquanto isso, o cupom atual segue valendo.`.trim());
    }
    router.push('/parceiro/cupom-editar');
  };

  const alternar = async (c: Cupom) => {
    const executar = async () => {
      setMudando(c.id);
      try {
        await pausarCupom(c.id, !c.ativo);
        setCupons((l) => l.map((x) => (x.id === c.id ? { ...x, ativo: !c.ativo } : x)));
      } catch (e: any) {
        Alert.alert('Cupom', e?.message || 'Não deu para mudar agora.');
      } finally {
        setMudando(null);
      }
    };
    if (c.ativo) {
      return Alert.alert('Pausar este cupom?', 'Ele sai da página da casa e da faixa de cupons até você retomar.', [
        { text: 'Manter no ar', style: 'cancel' },
        { text: 'Pausar', style: 'destructive', onPress: () => void executar() },
      ]);
    }
    void executar();
  };

  if (!localAtivo || !liberado) {
    return (
      <TelaParceiro titulo="Cupons">
        <Text style={a.aviso}>Seu acesso não inclui os cupons deste local. Peça para o dono liberar a permissão de cupons.</Text>
        <TouchableOpacity style={a.voltar} onPress={() => router.back()}><Feather name="chevron-left" size={16} color={CP.dim} /><Text style={a.voltarTxt}>Voltar</Text></TouchableOpacity>
      </TelaParceiro>
    );
  }

  return (
    <TelaParceiro
      titulo={desconto ? 'Cupons de desconto' : 'Cupons'}
      subtitulo="Aparecem na página da casa e na faixa de cupons da categoria."
      atualizando={false}
      aoAtualizar={() => void carregar()}
     aoVoltar={() => router.back()}>

      {/* Plano: cadeado no Gratuito; nos pagos, o limite e quando libera o próximo */}
      {gratuito ? (
        <TouchableOpacity style={a.plano} onPress={novo} accessibilityRole="button">
          <View style={[a.planoIcone, { backgroundColor: '#2A2938' }]}><Feather name="lock" size={16} color="#FFF" /></View>
          <View style={{ flex: 1 }}>
            <Text style={a.titulo}>Cupons nos planos pagos</Text>
            <Text style={a.sub}>{MSG_CUPOM_PLANO_PAGO} Toque para falar com a equipe.</Text>
          </View>
        </TouchableOpacity>
      ) : (
        <View style={a.plano}>
          <View style={[a.planoIcone, { backgroundColor: etiqueta?.livre === false ? '#3A3950' : '#4CAF7D' }]}><Feather name={etiqueta?.livre === false ? 'clock' : 'check'} size={16} color="#FFF" /></View>
          <View style={{ flex: 1 }}>
            <Text style={a.titulo}>{etiqueta?.txt || 'Cupons do plano'}</Text>
            <Text style={a.sub}>{textoDoLimite(plano) || 'Premium e Fundador: 1 a cada 7 dias · Intermediário: 1 a cada 14 dias.'}</Text>
          </View>
        </View>
      )}

      <TouchableOpacity style={[a.novo, !podeCriar && a.novoTravado]} onPress={novo} activeOpacity={0.85} accessibilityRole="button" accessibilityState={{ disabled: !podeCriar }}>
        <Feather name={podeCriar ? 'plus' : 'lock'} size={20} color="#FFF" />
        <Text style={a.novoTxt}>{podeCriar ? 'Novo cupom' : gratuito ? 'Novo cupom · planos pagos' : `Novo cupom · ${etiqueta?.txt.toLowerCase() || 'aguarde'}`}</Text>
      </TouchableOpacity>

      {!!erro && <Text style={a.erro}>{erro}</Text>}

      {carregando ? (
        <ActivityIndicator color={CP.rosa} style={{ marginTop: ESP.xl }} />
      ) : cupons.length === 0 ? (
        <Text style={a.aviso}>{gratuito ? 'Nenhum cupom por aqui.' : 'Nenhum cupom ainda. Crie o primeiro: ele aparece na página da casa e na faixa de cupons da categoria.'}</Text>
      ) : (
        <>
          <TituloSecao texto="Seus cupons" info="Para o cliente usar, ele faz check-in na casa e vocês confirmam em Aprovações › Check-ins. O cupom só libera nos dias e horários escolhidos." />
          <View style={{ gap: ESP.s }}>
            {cupons.map((c) => {
              const u = uso[c.id];
              const sit = situacaoDoCupom(c, u);
              const janela = textoJanela(c.dias_semana, c.hora_inicio, c.hora_fim);
              const vencido = sit.txt === 'Vencido';
              const linhaUso = u ? (c.limite_uso ? `${u.resgates} de ${c.limite_uso} usos` : `${u.resgates} ${u.resgates === 1 ? 'uso' : 'usos'}`) : c.limite_uso ? `limite de ${c.limite_uso} usos` : null;
              return (
                <TouchableOpacity key={c.id} style={[a.cartao, !sit.noAr && { opacity: 0.85 }]} onPress={() => router.push(`/parceiro/cupom-editar?id=${c.id}`)} activeOpacity={0.85} accessibilityRole="button" accessibilityLabel={`${c.titulo}. ${sit.txt}. Toque para editar`}>
                  <View style={a.linha}>
                    <View style={a.icone}><Feather name="tag" size={16} color="#F2A900" /></View>
                    <View style={{ flex: 1 }}>
                      <Text style={a.titulo} numberOfLines={2}>{c.titulo}</Text>
                      {!!c.descricao && <Text style={a.sub} numberOfLines={2}>{c.descricao}</Text>}
                      <View style={a.selos}>
                        <View style={[a.selo, { backgroundColor: sit.cor + '22' }]}><Text style={[a.seloTxt, { color: sit.cor }]}>{sit.txt}</Text></View>
                        {!!linhaUso && <Text style={a.meta}>{linhaUso}</Text>}
                      </View>
                      <Text style={a.meta} numberOfLines={2}>
                        {[c.codigo ? `Código ${c.codigo}` : null, c.valido_ate ? `até ${ddmm(c.valido_ate)}` : null, janela ? `vale ${janela}` : null].filter(Boolean).join(' · ') || 'Vale todos os dias, o dia todo'}
                      </Text>
                    </View>
                    <Feather name="edit-2" size={16} color={CP.fraco} />
                  </View>
                  {/* Gratuito pausa, mas não retoma (migração 112 trava no banco também) */}
                  {!vencido && (c.ativo || !gratuito) && (
                    <TouchableOpacity style={[a.acao, c.ativo ? null : a.acaoRetomar]} onPress={() => void alternar(c)} disabled={mudando === c.id} accessibilityRole="button">
                      {mudando === c.id ? <ActivityIndicator size="small" color={CP.dim} /> : <Feather name={c.ativo ? 'pause' : 'play'} size={14} color={c.ativo ? CP.dim : '#FFF'} />}
                      <Text style={[a.acaoTxt, !c.ativo && { color: '#FFF' }]}>{c.ativo ? 'Pausar' : 'Retomar'}</Text>
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </>
      )}
    </TelaParceiro>
  );
}

const a = StyleSheet.create({
  voltar: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: ESP.s, minHeight: 44, alignSelf: 'flex-start' },
  voltarTxt: { color: CP.dim, fontSize: 12, fontWeight: '700' },
  aviso: { color: CP.dim, fontSize: 13, lineHeight: 19, backgroundColor: CP.card, borderRadius: RAIO.m, padding: ESP.m, marginTop: ESP.l },
  erro: { color: '#FF7A7A', fontSize: 13, backgroundColor: '#FF7A7A14', borderRadius: RAIO.s, padding: ESP.m, marginTop: ESP.m },
  plano: { flexDirection: 'row', alignItems: 'center', gap: ESP.m, marginTop: ESP.m, backgroundColor: CP.card, borderColor: CP.borda, borderWidth: 1, borderRadius: RAIO.m, padding: ESP.m, minHeight: 56 },
  planoIcone: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  novo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: ESP.s, minHeight: 52, borderRadius: RAIO.m, backgroundColor: '#F2A900', marginTop: ESP.s },
  novoTravado: { backgroundColor: '#3A3950' },
  novoTxt: { color: '#FFF', fontSize: 15, fontWeight: '800' },
  cartao: { backgroundColor: CP.card, borderColor: CP.borda, borderWidth: 1, borderRadius: RAIO.m, padding: ESP.m },
  linha: { flexDirection: 'row', alignItems: 'flex-start', gap: ESP.m },
  icone: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#F2A90022', alignItems: 'center', justifyContent: 'center' },
  titulo: { color: CP.texto, fontSize: 14, fontWeight: '800' },
  sub: { color: CP.dim, fontSize: 12, marginTop: 2, lineHeight: 16 },
  selos: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: ESP.s, marginTop: 6 },
  selo: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  seloTxt: { fontSize: 11, fontWeight: '800' },
  meta: { color: CP.fraco, fontSize: 11, marginTop: 4 },
  acao: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 44, marginTop: ESP.m, borderRadius: RAIO.s, borderWidth: 1, borderColor: CP.borda },
  acaoRetomar: { backgroundColor: CP.rosa, borderColor: CP.rosa },
  acaoTxt: { color: CP.dim, fontSize: 12, fontWeight: '800' },
});
