// Modo equipe · Aprovar: casas novas e festas esperando a equipe. Ações de marca: tela própria (/adm/acoes).
// Aprovar casa/festa usa as mesmas rotas do /admin do portal (criam o acesso do parceiro). Ação de marca: liga "Mostrar no app".
import { Feather } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Image, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import TelaAdm, { CA, sa } from '../../../components/adm/TelaAdm';
import { chamarPortalAdmin } from '../../../lib/admin';
import { CATEGORIA_REAL_LABEL } from '../../../lib/categorias';
import { supabase } from '../../../lib/supabase';
import { URL_PORTAL } from '../../../lib/parceiroMenu';

type Casa = { id: string; nome: string; categoria: string; cidade: string | null; bairro: string | null; foto_capa_url: string | null; created_at: string };
type Festa = { id: string; titulo: string; data_inicio: string; foto_capa_url: string | null; locais: { nome: string } | null };
type Acao = { id: string; marca: string; nome: string; brinde: string | null; inicio: string; fim: string; mostrar_no_app: boolean; locais: { nome: string } | null };
const dia = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' }).replace('.', '');
const br = (d: string) => d.split('-').reverse().slice(0, 2).join('/');

export default function AprovarAdm() {
  const router = useRouter();
  const [casas, setCasas] = useState<Casa[] | null>(null);
  const [festas, setFestas] = useState<Festa[]>([]);
  const [acoes, setAcoes] = useState<Acao[]>([]);
  const [fazendo, setFazendo] = useState<string | null>(null);
  const [atualizando, setAtualizando] = useState(false);

  const carregar = useCallback(async () => {
    const hoje = new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 10);
    const [c, f, a] = await Promise.all([
      supabase.from('locais').select('id, nome, categoria, cidade, bairro, foto_capa_url, created_at').eq('status', 'pendente').order('created_at'),
      supabase.from('eventos').select('id, titulo, data_inicio, foto_capa_url, locais(nome)').eq('status', 'pendente').order('data_inicio'),
      supabase.from('acoes_marca').select('id, marca, nome, brinde, inicio, fim, mostrar_no_app, locais(nome)').eq('ativa', true).gte('fim', hoje).order('inicio'),
    ]);
    setCasas((c.data as Casa[]) || []);
    setFestas((f.data as any[]) || []);
    setAcoes((a.data as any[]) || []);
  }, []);
  useFocusEffect(useCallback(() => { void carregar(); }, [carregar]));

  async function aprovarCasa(c: Casa) {
    setFazendo(c.id);
    try {
      const r = await chamarPortalAdmin('/api/aprovar-local', { local_id: c.id });
      await carregar();
      if (r.senha && r.telefone) {
        const msg = `Oi! A ${r.nomeLocal || c.nome} foi aprovada no Dicas LGBT+ 🌈\nEntre no app pelo seu WhatsApp ${r.telefone} com a senha provisória: ${r.senha}\nNo primeiro acesso, o app pede para criar uma senha nova.`;
        Alert.alert('Casa aprovada', `Acesso criado.\nWhatsApp: ${r.telefone}\nSenha provisória: ${r.senha}`, [{ text: 'OK' }, { text: 'Enviar ao parceiro', onPress: () => void Share.share({ message: msg }) }]);
      } else Alert.alert('Casa aprovada', 'Já está no app.');
    } catch (e: any) { Alert.alert('Aprovar', e?.message || 'Não deu agora.'); }
    finally { setFazendo(null); }
  }

  async function aprovarFesta(f: Festa) {
    setFazendo(f.id);
    try {
      const r = await chamarPortalAdmin('/api/aprovar-evento', { evento_id: f.id });
      await carregar();
      if (r.senha && r.telefone) Alert.alert('Festa aprovada', `Acesso do organizador criado.\nWhatsApp: ${r.telefone}\nSenha provisória: ${r.senha}`, [{ text: 'OK' }, { text: 'Enviar', onPress: () => void Share.share({ message: `Sua festa "${f.titulo}" foi aprovada no Dicas LGBT+ 🌈\nEntre pelo WhatsApp ${r.telefone} com a senha provisória ${r.senha}.` }) }]);
      else Alert.alert('Festa aprovada', 'Já está no app.');
    } catch (e: any) { Alert.alert('Aprovar', e?.message || 'Não deu agora.'); }
    finally { setFazendo(null); }
  }

  function recusar(tabela: 'locais' | 'eventos', id: string, nome: string) {
    Alert.alert('Recusar?', `"${nome}" não vai aparecer no app.`, [
      { text: 'Voltar', style: 'cancel' },
      { text: 'Recusar', style: 'destructive', onPress: async () => {
        const { error } = await supabase.from(tabela).update({ status: 'rejeitado' }).eq('id', id);
        if (error) return Alert.alert('Recusar', error.message);
        void carregar();
      } },
    ]);
  }

  async function mostrarAcao(a: Acao, mostrar: boolean) {
    setFazendo(a.id);
    const { error } = await supabase.from('acoes_marca').update({ mostrar_no_app: mostrar }).eq('id', a.id);
    setFazendo(null);
    if (error) return Alert.alert('Ação de marca', error.message);
    void carregar();
  }

  // 144 — link de resultados ao vivo para a marca (sem login)
  async function linkMarca(a: Acao) {
    const { data, error } = await supabase.rpc('admin_link_marca', { p_acao: a.id, p_trocar: false });
    if (error) return Alert.alert('Link da marca', error.message.includes('admin_link_marca') ? 'Rode a migração 144 no Supabase.' : error.message);
    await Share.share({ message: `${a.marca} · resultados ao vivo da ação no Dicas LGBT+:\n${URL_PORTAL}/resultados/${data}` });
  }

  const esperando = acoes.filter((a) => !a.mostrar_no_app);
  const noAr = acoes.filter((a) => a.mostrar_no_app);
  const Botoes = ({ id, aprovar, recusarFn, rotulo = 'Aprovar' }: { id: string; aprovar: () => void; recusarFn: () => void; rotulo?: string }) => (
    <View style={e.botoes}>
      <TouchableOpacity style={[sa.botao, { flex: 1, minHeight: 38 }]} onPress={aprovar} disabled={fazendo === id} accessibilityRole="button">
        {fazendo === id ? <ActivityIndicator color="#FFF" /> : <><Feather name="check" size={15} color="#FFF" /><Text style={sa.botaoTxt}>{rotulo}</Text></>}
      </TouchableOpacity>
      <TouchableOpacity style={[sa.botaoSec, { flex: 1 }]} onPress={recusarFn} accessibilityRole="button"><Text style={sa.botaoSecTxt}>Recusar</Text></TouchableOpacity>
    </View>
  );

  return (
    <TelaAdm titulo="Aprovar" subtitulo="O que espera a equipe para entrar no app." atualizando={atualizando}
      aoAtualizar={async () => { setAtualizando(true); await carregar(); setAtualizando(false); }}>
      {casas === null ? <ActivityIndicator color={CA.rosa} /> : (
        <>
          <Text style={sa.secao}>CASAS NOVAS · {casas.length}</Text>
          {casas.length === 0 ? <Text style={sa.vazio}>Nenhuma casa esperando.</Text> : casas.map((c) => (
            <View key={c.id} style={sa.card}>
              <TouchableOpacity style={e.topo} onPress={() => router.push(`/adm/local/${c.id}` as any)} accessibilityRole="button">
                {c.foto_capa_url ? <Image source={{ uri: c.foto_capa_url }} style={e.foto} /> : <View style={[e.foto, e.semFoto]}><Feather name="map-pin" size={16} color={CA.fraco} /></View>}
                <View style={{ flex: 1 }}>
                  <Text style={sa.tit}>{c.nome}</Text>
                  <Text style={sa.sub}>{CATEGORIA_REAL_LABEL[c.categoria] || c.categoria} · {[c.bairro, c.cidade].filter(Boolean).join(', ')}</Text>
                </View>
                <Feather name="chevron-right" size={16} color={CA.fraco} />
              </TouchableOpacity>
              <Botoes id={c.id} aprovar={() => void aprovarCasa(c)} recusarFn={() => recusar('locais', c.id, c.nome)} />
            </View>
          ))}

          <Text style={sa.secao}>FESTAS · {festas.length}</Text>
          {festas.length === 0 ? <Text style={sa.vazio}>Nenhuma festa esperando.</Text> : festas.map((f) => (
            <View key={f.id} style={sa.card}>
              <View style={e.topo}>
                {f.foto_capa_url ? <Image source={{ uri: f.foto_capa_url }} style={e.foto} /> : <View style={[e.foto, e.semFoto]}><Feather name="music" size={16} color={CA.fraco} /></View>}
                <View style={{ flex: 1 }}>
                  <Text style={sa.tit}>{f.titulo}</Text>
                  <Text style={sa.sub}>{dia(f.data_inicio)}{f.locais?.nome ? ` · ${f.locais.nome}` : ''}</Text>
                </View>
              </View>
              <Botoes id={f.id} aprovar={() => void aprovarFesta(f)} recusarFn={() => recusar('eventos', f.id, f.titulo)} />
            </View>
          ))}

          <TouchableOpacity style={[sa.card, { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14 }]} onPress={() => router.push('/adm/acoes' as any)} accessibilityRole="button">
            <Feather name="gift" size={16} color={CA.rosa} />
            <Text style={[sa.tit, { flex: 1 }]}>Ações de marca{esperando.length ? ` · ${esperando.length} para liberar` : ''}</Text>
            <Feather name="chevron-right" size={16} color={CA.fraco} />
          </TouchableOpacity>
        </>
      )}
    </TelaAdm>
  );
}

const e = StyleSheet.create({
  topo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  foto: { width: 48, height: 48, borderRadius: 10, backgroundColor: '#1B1A26' },
  semFoto: { alignItems: 'center', justifyContent: 'center' },
  botoes: { flexDirection: 'row', gap: 8, marginTop: 10 },
  tirar: { color: '#F87171', fontSize: 12.5, fontWeight: '800' },
});
