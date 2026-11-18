// Tela 2 do Modo parceiro — Minhas festas (Divulgar › Minhas festas). É o único quadradinho de festas na Divulgar.
// Regras copiadas do portal (dashboard/eventos + DestaqueFestaPlano):
//   - começa com "+ Nova festa"; lista das festas do local (próximas e dos últimos 60 dias) com a situação:
//     em análise, aprovada, encerrada, cancelada, não aprovada;
//   - números de cada festa (resumo_da_festa: vistas, cliques no ingresso, Lista VIP) para quem tem 'resultados';
//   - "Repetir da semana passada": copia a festa com a data +7 dias e abre para revisar antes de enviar;
//   - "Destacar com o plano" (destacar_festa_do_plano): só o dono, Fundador/Premium, festa aprovada e futura,
//     4 por mês na cota única festas + agenda (mês da data da festa). Sem plano: fala com a equipe (sem preço).
// Permissão: 'festa'.
import { Feather } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BarraSalvar, CampoData, chaveData, Chips, estiloForm as fm } from '../../components/parceiro/form';
import { CP, ESP, RAIO, TelaParceiro, TituloSecao } from '../../components/parceiro/TelaParceiro';
import { recursosDaCategoria, useModoParceiro } from '../../lib/modoParceiro';
import { destaquesUsadosNoMes, temDestaqueNoPlano, temFestaIntermediaria } from '../../lib/parceiro/agenda';
import {
  cotaEventos, CotaEventos, destacarFesta, emDestaque, encerrada, Festa, LIMITE_DESTAQUES_FESTA, listarFestas, vagasUsadasNoMes, resumoDaFesta, ResumoFesta, situacaoDaFesta,
} from '../../lib/parceiro/festas';
import { euVouDoLocal, vao } from '../../lib/parceiro/publico';
import { falarComEquipe } from '../../lib/parceiroMenu';

const pad = (n: number) => String(n).padStart(2, '0');
const quando = (iso: string) => {
  const d = new Date(iso);
  const dia = d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
  return `${dia} ${pad(d.getDate())}/${pad(d.getMonth() + 1)} · ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const mesDe = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { month: 'long' });
const hojeIso = () => new Date().toISOString();

export default function MinhasFestas() {
  const router = useRouter();
  const { localAtivo, pode } = useModoParceiro();
  const localId = localAtivo?.local_id || '';
  const dono = localAtivo?.papel === 'dono';
  const r = localAtivo ? recursosDaCategoria(localAtivo.categoria) : null;
  const liberado = !!localAtivo && !!r?.eventos && pode('festa');
  const verNumeros = pode('resultados');

  const [festas, setFestas] = useState<Festa[]>([]);
  const [resumos, setResumos] = useState<Record<string, ResumoFesta>>({});
  const [temPlano, setTemPlano] = useState<boolean | null>(null);
  const [intermediaria, setIntermediaria] = useState(false); // Intermediário Festas: véspera e dia
  const [usadas, setUsadas] = useState<number | null>(null);
  // 157 (18/11): cota de destaque de eventos em vagas por mês; o pedido abre a folha "Destacar evento".
  const [cota, setCota] = useState<CotaEventos | null>(null);
  const [pedido, setPedido] = useState<{ f: Festa; dias: number; inicio: string } | null>(null);
  const limite = cota ? cota.vagas : LIMITE_DESTAQUES_FESTA;
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [destacando, setDestacando] = useState<string | null>(null);
  const [verTodas, setVerTodas] = useState(false);
  const [vaoPorFesta, setVaoPorFesta] = useState<Record<string, number>>({}); // "Eu vou" (migração 113)

  const carregar = useCallback(async () => {
    if (!localId) return;
    setErro('');
    try {
      const ct = dono ? await cotaEventos(localId) : null;
      setCota(ct);
      const [lista, plano, n] = await Promise.all([
        listarFestas(localId),
        !dono ? Promise.resolve(false)
          : ct ? Promise.resolve(ct.vagas > 0).then((v) => { setIntermediaria(ct.tipo === 'festas_intermediario'); return v; })
          : Promise.all([temDestaqueNoPlano(localId), temFestaIntermediaria(localId)]).then(([a, b]) => { setIntermediaria(!a && b); return a || b; }),
        !dono ? Promise.resolve(null) : ct ? vagasUsadasNoMes(localId, chaveData(new Date())) : destaquesUsadosNoMes(localId, chaveData(new Date())),
      ]);
      setFestas(lista);
      void euVouDoLocal(localId).then((x) => setVaoPorFesta(x?.porEvento || {}));
      setTemPlano(plano);
      setUsadas(n);
      if (verNumeros) {
        const alvo = lista.filter((f) => f.status !== 'cancelado').slice(0, 20);
        const res = await Promise.all(alvo.map(async (f) => [f.id, await resumoDaFesta(f.id)] as const));
        setResumos(Object.fromEntries(res.filter(([, x]) => !!x)) as Record<string, ResumoFesta>);
      }
    } catch (e: any) {
      setErro(e?.message || 'Não deu para carregar as festas.');
    } finally {
      setCarregando(false);
    }
  }, [localId, dono, verNumeros]);

  useFocusEffect(useCallback(() => { if (liberado) void carregar(); }, [liberado, carregar]));

  const executarPedido = useRef<((dias?: number, inicio?: string) => Promise<void>) | null>(null);
  const alternarDestaque = (f: Festa) => {
    const ligado = emDestaque(f);
    const mes = mesDe(f.data_inicio);
    const executar = async (dias?: number, inicio?: string) => {
      setDestacando(f.id);
      try {
        const res = await destacarFesta(f.id, !ligado, dias, inicio);
        setFestas((l) => l.map((x) => (x.id === f.id
          ? { ...x, destaque_secoes: ligado ? (x.destaque_secoes || []).filter((s) => s !== 'plano_festa') : [...(x.destaque_secoes || []), 'plano_festa'] }
          : x)));
        if (f.data_inicio.slice(0, 7) === hojeIso().slice(0, 7)) setUsadas(res.usadas);
        Alert.alert(ligado ? 'Destaque tirado' : 'Em destaque!', `${!ligado && res.inicio ? `No ar de ${res.inicio.split('-').reverse().slice(0, 2).join('/')} até o dia do evento. ` : ''}Destaques de eventos de ${mes}: ${res.usadas} de ${res.limite} vagas.`);
      } catch (e: any) {
        Alert.alert('Destaque', e?.message || 'Não deu para destacar agora.');
      } finally {
        setDestacando(null);
      }
    };
    if (ligado) {
      return Alert.alert('Tirar do destaque?', `"${f.titulo}" sai de Em destaque nessa semana e o destaque volta para a cota de ${mes}.`, [
        { text: 'Manter', style: 'cancel' },
        { text: 'Tirar destaque', style: 'destructive', onPress: () => void executar() },
      ]);
    }
    // Folha "Destacar evento": quantos dias (7, ou 15 para Fundador/Premium de Festas) e quando começa.
    const diaEv = f.data_inicio.slice(0, 10);
    const hoje = chaveData(new Date());
    const ini = (dias: number) => { const d = new Date(`${diaEv}T12:00:00`); d.setDate(d.getDate() - (dias - 1)); const k = chaveData(d); return k < hoje ? hoje : k; };
    executarPedido.current = executar;
    setPedido({ f, dias: 7, inicio: ini(7) });
  };

  if (!localAtivo || !liberado) {
    return (
      <TelaParceiro titulo="Minhas festas">
        <Text style={a.aviso}>Seu acesso não inclui as festas deste local. Peça para o dono liberar a permissão de festas.</Text>
        <TouchableOpacity style={a.voltar} onPress={() => router.back()}><Feather name="chevron-left" size={16} color={CP.dim} /><Text style={a.voltarTxt}>Voltar</Text></TouchableOpacity>
      </TelaParceiro>
    );
  }

  const agora = Date.now();
  const ativas = festas.filter((f) => f.status !== 'cancelado' && f.status !== 'rejeitado' && !encerrada(f)).sort((x, y) => x.data_inicio.localeCompare(y.data_inicio));
  const passadas = festas.filter((f) => !ativas.includes(f));
  const passadasVisiveis = verTodas ? passadas : passadas.slice(0, 5);
  // "Repetir da semana passada": a mais recente que começou nos últimos 8 dias (e não foi cancelada).
  const daSemanaPassada = festas.find((f) => f.status !== 'cancelado' && new Date(f.data_inicio).getTime() <= agora && new Date(f.data_inicio).getTime() >= agora - 8 * 864e5);
  const repetir = (f: Festa) => router.push(`/parceiro/festa-editar?repetir=${f.id}`);
  const ehFesta = localAtivo.categoria === 'eventos';

  const cartao = (f: Festa) => {
    const sit = situacaoDaFesta(f);
    const res = resumos[f.id];
    const ligado = emDestaque(f);
    const podeDestacar = dono && temPlano === true && (ligado || (f.status === 'aprovado' && !encerrada(f)));
    const lista = f.listas_vip?.find((l) => l.ativa);
    return (
      <TouchableOpacity key={f.id} style={a.cartao} onPress={() => router.push(`/parceiro/festa-editar?id=${f.id}`)} activeOpacity={0.85} accessibilityRole="button" accessibilityLabel={`${f.titulo}. ${sit.txt}. Toque para editar`}>
        <View style={a.linha}>
          <View style={a.thumb}>
            {f.foto_capa_url ? <Image source={{ uri: f.foto_capa_url }} style={StyleSheet.absoluteFill} resizeMode="cover" /> : <Feather name="music" size={18} color={CP.rosa} />}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={a.titulo} numberOfLines={1}>{f.titulo}</Text>
            <Text style={a.sub} numberOfLines={1}>{quando(f.data_inicio)}{lista ? ` · Lista VIP${lista.vagas_limite ? ` ${lista.vagas_ocupadas}/${lista.vagas_limite}` : ''}` : ''}</Text>
            <View style={a.selos}>
              <View style={[a.selo, { backgroundColor: sit.cor + '22' }]}><Text style={[a.seloTxt, { color: sit.cor }]}>{sit.txt}</Text></View>
              {ligado && <View style={[a.selo, { backgroundColor: '#FFD54F22' }]}><Feather name="star" size={10} color="#FFD54F" /><Text style={[a.seloTxt, { color: '#FFD54F' }]}>Em destaque</Text></View>}
              {!!vaoPorFesta[f.id] && <View style={[a.selo, { backgroundColor: '#B39DDB22' }]}><Feather name="users" size={10} color="#B39DDB" /><Text style={[a.seloTxt, { color: '#B39DDB' }]}>{vao(vaoPorFesta[f.id])}</Text></View>}
            </View>
          </View>
          <Feather name="edit-2" size={16} color={CP.fraco} />
        </View>
        {res && (
          <View style={a.numeros}>
            <Numero n={res.vistas} rotulo="vistas" />
            <Numero n={res.cliquesIngresso} rotulo="no ingresso" />
            {(lista || res.pedidos > 0) && <Numero n={res.pedidos} rotulo="pedidos" />}
            {(lista || res.pedidos > 0) && <Numero n={res.pessoasEntraram} rotulo="entraram" />}
          </View>
        )}
        <View style={a.acoes}>
          <TouchableOpacity style={a.acao} onPress={() => repetir(f)} accessibilityRole="button" accessibilityLabel={`Repetir ${f.titulo} 7 dias depois`}>
            <Feather name="copy" size={14} color={CP.dim} /><Text style={a.acaoTxt}>Repetir +7 dias</Text>
          </TouchableOpacity>
          {podeDestacar && (
            <TouchableOpacity style={[a.acao, a.destacar, ligado && a.destacarOn]} onPress={() => alternarDestaque(f)} disabled={destacando === f.id} accessibilityRole="button" accessibilityState={{ selected: ligado, busy: destacando === f.id }}>
              {destacando === f.id ? <ActivityIndicator size="small" color="#FFD54F" /> : <Feather name="star" size={14} color={ligado ? '#1A1020' : '#FFD54F'} />}
              <Text style={[a.acaoTxt, { color: ligado ? '#1A1020' : '#FFD54F' }]}>{ligado ? 'Tirar destaque' : 'Destacar com o plano'}</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <TelaParceiro titulo={ehFesta ? 'Minhas festas' : 'Meus eventos'} subtitulo="Aparecem na aba Eventos do app assim que você publica." atualizando={false} aoAtualizar={() => void carregar()} aoVoltar={() => router.back()}>

      <TouchableOpacity style={a.nova} onPress={() => router.push('/parceiro/festa-editar')} activeOpacity={0.85} accessibilityRole="button">
        <Feather name="plus" size={20} color="#FFF" />
        <Text style={a.novaTxt}>Nova festa</Text>
      </TouchableOpacity>

      {daSemanaPassada && (
        <TouchableOpacity style={a.repetir} onPress={() => repetir(daSemanaPassada)} activeOpacity={0.85} accessibilityRole="button">
          <View style={a.repetirIcone}><Feather name="repeat" size={16} color="#FFF" /></View>
          <View style={{ flex: 1 }}>
            <Text style={a.titulo}>Repetir da semana passada</Text>
            <Text style={a.sub} numberOfLines={1}>{daSemanaPassada.titulo} · vai para {quando(new Date(new Date(daSemanaPassada.data_inicio).getTime() + 7 * 864e5).toISOString())}</Text>
          </View>
          <Feather name="chevron-right" size={18} color={CP.fraco} />
        </TouchableOpacity>
      )}

      {dono && temPlano === true && (
        <View style={a.cota}>
          <View style={{ flex: 1 }}>
            <Text style={a.titulo}>Destaques de eventos de {mesDe(hojeIso())}: {usadas ?? '–'} de {limite}</Text>
            <Text style={a.sub}>{cota?.tipo === 'festas_premium' ? 'Cada destaque fica 7 dias (1 vaga) ou 15 dias (2 vagas), terminando no dia do evento.'
              : cota?.tipo === 'festas_intermediario' ? 'Intermediário Festas: 2 eventos por mês, 7 dias cada, terminando no dia do evento.'
              : cota?.tipo === 'premium' ? '1 evento por mês em destaque por 7 dias, terminando no dia do evento. Os demais eventos entram na agenda sem destaque.'
              : 'Cada evento conta no mês da data dele.'}</Text>
          </View>
          <View style={a.pontos}>
            {Array.from({ length: limite }, (_, i) => <View key={i} style={[a.ponto, i < (usadas ?? 0) && { backgroundColor: '#FFD54F' }]} />)}
          </View>
        </View>
      )}
      {dono && temPlano === false && (
        <TouchableOpacity style={a.cota} onPress={() => void falarComEquipe(`Olá! Sou do ${localAtivo.nome} e quero destacar minhas festas no topo de Eventos.`)} accessibilityRole="button">
          <Feather name="lock" size={16} color={CP.dim} />
          <View style={{ flex: 1 }}>
            <Text style={a.titulo}>Em destaque nessa semana</Text>
            <Text style={a.sub}>Destaque avulso: 7 ou 21 dias, terminando no dia do evento. Premium e Fundador têm 1 por mês incluído. Toque para falar com a equipe.</Text>
          </View>
        </TouchableOpacity>
      )}

      {!!erro && <Text style={a.erro}>{erro}</Text>}

      {carregando ? (
        <ActivityIndicator color={CP.rosa} style={{ marginTop: ESP.xl }} />
      ) : festas.length === 0 ? (
        <Text style={a.aviso}>Nenhuma festa por aqui ainda. Toque em "Nova festa" para cadastrar a primeira.</Text>
      ) : (
        <>
          <TituloSecao texto="Próximas" />
          {ativas.length ? <View style={{ gap: ESP.s }}>{ativas.map(cartao)}</View> : <Text style={a.vazio}>Nenhuma festa marcada. Que tal repetir a última?</Text>}
          {passadas.length > 0 && (
            <>
              <TituloSecao texto="Encerradas e canceladas" />
              <View style={{ gap: ESP.s }}>{passadasVisiveis.map(cartao)}</View>
              {passadas.length > 5 && (
                <TouchableOpacity style={a.verTodas} onPress={() => setVerTodas((v) => !v)} accessibilityRole="button">
                  <Text style={a.verTodasTxt}>{verTodas ? 'Ver menos' : `Ver todas (${passadas.length})`}</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </>
      )}
      {!!pedido && (
        <Modal visible animationType="slide" transparent onRequestClose={() => setPedido(null)}>
          <View style={fm.fundo}>
            <View style={fm.folha}>
              <View style={fm.folhaTopo}>
                <Text style={fm.folhaTitulo}>Destacar evento</Text>
                <TouchableOpacity onPress={() => setPedido(null)} accessibilityLabel="Fechar"><Feather name="x" size={22} color={CP.texto} /></TouchableOpacity>
              </View>
              <ScrollView keyboardShouldPersistTaps="handled">
                <Text style={a.sub}>"{pedido.f.titulo}" aparece em “Em destaque nessa semana”, na tela de Eventos, da data escolhida até o dia do evento.</Text>
                {(cota?.maxDias ?? 7) >= 15 && (
                  <Chips rotulo="Por quanto tempo" preencher
                    opcoes={[{ valor: 7, rotulo: '7 dias · 1 vaga' }, { valor: 15, rotulo: '15 dias · 2 vagas' }]}
                    valor={pedido.dias}
                    aoMudar={(v) => {
                      const d = new Date(`${pedido.f.data_inicio.slice(0, 10)}T12:00:00`); d.setDate(d.getDate() - ((v as number) - 1));
                      const k = chaveData(d); const hoje = chaveData(new Date());
                      setPedido({ ...pedido, dias: v as number, inicio: k < hoje ? hoje : k });
                    }} />
                )}
                <CampoData rotulo="Começa em" valor={pedido.inicio} aoMudar={(v) => setPedido({ ...pedido, inicio: v })}
                  min={(() => { const d = new Date(`${pedido.f.data_inicio.slice(0, 10)}T12:00:00`); d.setDate(d.getDate() - (pedido.dias - 1)); const k = chaveData(d); const hoje = chaveData(new Date()); return k < hoje ? hoje : k; })()}
                  max={pedido.f.data_inicio.slice(0, 10)}
                  ajuda={`Até ${pedido.dias} dias, terminando no dia do evento. Começar mais tarde não devolve dias.`} />
              </ScrollView>
              <BarraSalvar emFolha rotulo="Destacar" salvando={destacando === pedido.f.id} aoSalvar={() => { const p = pedido; setPedido(null); void executarPedido.current?.(p.dias, p.inicio); }} />
            </View>
          </View>
        </Modal>
      )}
    </TelaParceiro>
  );
}

function Numero({ n, rotulo }: { n: number; rotulo: string }) {
  return (
    <View style={a.numero}>
      <Text style={a.numeroN}>{n}</Text>
      <Text style={a.numeroR}>{rotulo}</Text>
    </View>
  );
}

const a = StyleSheet.create({
  voltar: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: ESP.s, minHeight: 44, alignSelf: 'flex-start' },
  voltarTxt: { color: CP.dim, fontSize: 12, fontWeight: '700' },
  aviso: { color: CP.dim, fontSize: 13, lineHeight: 19, backgroundColor: CP.card, borderRadius: RAIO.m, padding: ESP.m, marginTop: ESP.l },
  erro: { color: '#FF7A7A', fontSize: 13, backgroundColor: '#FF7A7A14', borderRadius: RAIO.s, padding: ESP.m, marginTop: ESP.m },
  nova: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: ESP.s, minHeight: 52, borderRadius: RAIO.m, backgroundColor: '#9B3CFF', marginTop: ESP.m },
  novaTxt: { color: '#FFF', fontSize: 16, fontWeight: '800' },
  repetir: { flexDirection: 'row', alignItems: 'center', gap: ESP.m, marginTop: ESP.s, backgroundColor: CP.card, borderColor: CP.borda, borderWidth: 1, borderRadius: RAIO.m, padding: ESP.m, minHeight: 56 },
  repetirIcone: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#7E57C2', alignItems: 'center', justifyContent: 'center' },
  cota: { flexDirection: 'row', alignItems: 'center', gap: ESP.m, marginTop: ESP.s, backgroundColor: CP.card, borderColor: CP.borda, borderWidth: 1, borderRadius: RAIO.m, padding: ESP.m, minHeight: 56 },
  pontos: { flexDirection: 'row', gap: 4 },
  ponto: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#2A2938' },
  cartao: { backgroundColor: CP.card, borderColor: CP.borda, borderWidth: 1, borderRadius: RAIO.m, padding: ESP.m },
  linha: { flexDirection: 'row', alignItems: 'center', gap: ESP.m },
  thumb: { width: 52, height: 64, borderRadius: 10, backgroundColor: '#2A1B3D', overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  titulo: { color: CP.texto, fontSize: 14, fontWeight: '800' },
  sub: { color: CP.dim, fontSize: 12, marginTop: 2 },
  selos: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  selo: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  seloTxt: { fontSize: 11, fontWeight: '800' },
  numeros: { flexDirection: 'row', gap: ESP.s, marginTop: ESP.m },
  numero: { flex: 1, backgroundColor: '#0F0E15', borderRadius: RAIO.s, paddingVertical: ESP.s, alignItems: 'center' },
  numeroN: { color: CP.texto, fontSize: 16, fontWeight: '800' },
  numeroR: { color: CP.fraco, fontSize: 10, fontWeight: '700', marginTop: 1 },
  acoes: { flexDirection: 'row', gap: ESP.s, marginTop: ESP.m },
  acao: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 44, borderRadius: RAIO.s, borderWidth: 1, borderColor: CP.borda, paddingHorizontal: ESP.m },
  acaoTxt: { color: CP.dim, fontSize: 12, fontWeight: '800' },
  destacar: { flex: 1, borderColor: '#FFD54F55', backgroundColor: '#FFD54F12' },
  destacarOn: { backgroundColor: '#FFD54F', borderColor: '#FFD54F' },
  vazio: { color: CP.fraco, fontSize: 13 },
  verTodas: { alignItems: 'center', minHeight: 44, justifyContent: 'center' },
  verTodasTxt: { color: CP.rosa, fontSize: 13, fontWeight: '800' },
});
