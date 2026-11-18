// Modo equipe · Novo cupom numa casa da categoria (Vitrine › categoria › 3. Quadradinhos de ofertas).
// O cupom é da casa (entra no grupo do plano dela: Premium, Fundador ou Intermediário). A equipe não tem a trava
// de frequência do plano. Aparência na faixa (foto, dizeres) continua no editor da casa ou no portal.
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import TelaAdm, { CA, sa } from '../../components/adm/TelaAdm';
import { NOMES_DIAS } from '../../lib/janelaCupom';
import { supabase } from '../../lib/supabase';

type Casa = { id: string; nome: string; plano_comercial: string | null };
const PLANO: Record<string, string> = { premium: 'Premium', fundador: 'Fundador', intermediario: 'Intermediário' };
const deBr = (t: string) => { const m = t.trim().match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?$/); if (!m) return null; const y = m[3] || String(new Date().getFullYear()); return `${y}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`; };
const hora = (t: string) => { const m = t.trim().match(/^(\d{1,2})(?:[:h]?(\d{2}))?h?$/); if (!m) return null; return `${m[1].padStart(2, '0')}:${m[2] || '00'}`; };

export default function CupomNovo() {
  const router = useRouter();
  const { categoria, fila, id } = useLocalSearchParams<{ categoria?: string; fila?: string; id?: string }>();
  const [ativo, setAtivo] = useState(true);
  const [carregandoCupom, setCarregandoCupom] = useState(!!id);
  const [casas, setCasas] = useState<Casa[] | null>(null);
  const [casa, setCasa] = useState<Casa | null>(null);
  const [busca, setBusca] = useState('');
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [codigo, setCodigo] = useState('');
  const [dias, setDias] = useState<number[]>([]);
  const [de, setDe] = useState('');
  const [ate, setAte] = useState('');
  const [validade, setValidade] = useState('');
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    (async () => {
      const planos = fila === 'int' ? ['intermediario'] : fila === 'top' ? ['premium', 'fundador'] : ['premium', 'fundador', 'intermediario'];
      let q = supabase.from('locais').select('id, nome, plano_comercial').eq('status', 'aprovado').in('plano_comercial', planos).order('nome').limit(200);
      if (categoria) q = q.eq('categoria', categoria);
      const { data } = await q;
      setCasas((data as Casa[]) || []);
    })();
  }, [categoria, fila]);

  // Editar: carrega o cupom e preenche os campos.
  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data, error } = await (supabase.from('cupons') as any).select('*, locais(id, nome, plano_comercial)').eq('id', id).maybeSingle();
      if (error || !data) { Alert.alert('Cupom', error?.message || 'Cupom não encontrado.'); router.back(); return; }
      const k = data as any;
      setCasa(k.locais); setTitulo(k.titulo || ''); setDescricao(k.descricao || ''); setCodigo(k.codigo || '');
      setDias(k.dias_semana || []); setAtivo(!!k.ativo);
      const hh = (h?: string | null) => (h ? h.slice(0, 5).replace(':00', 'h').replace(':', 'h') : '');
      setDe(hh(k.hora_inicio)); setAte(hh(k.hora_fim));
      if (k.valido_ate) { const d = new Date(k.valido_ate); setValidade(d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Sao_Paulo' })); }
      setCarregandoCupom(false);
    })();
  }, [id]);

  const salvar = async () => {
    if (!casa) return Alert.alert('Cupom', 'Escolha a casa.');
    if (!titulo.trim()) return Alert.alert('Cupom', 'Escreva o cupom (ex.: Drink em dobro até 21h).');
    const hi = de.trim() ? hora(de) : null; const hf = ate.trim() ? hora(ate) : null;
    if ((de.trim() && !hi) || (ate.trim() && !hf)) return Alert.alert('Cupom', 'Horário no formato 18h ou 18:30.');
    const val = validade.trim() ? deBr(validade) : null;
    if (validade.trim() && !val) return Alert.alert('Cupom', 'Validade no formato dia/mês.');
    setSalvando(true);
    const dados = {
      local_id: casa.id, titulo: titulo.trim().slice(0, 80), descricao: descricao.trim() || null, codigo: codigo.trim().toUpperCase() || null,
      dias_semana: dias.length > 0 && dias.length < 7 ? [...dias].sort((a, b) => a - b) : null,
      hora_inicio: hi, hora_fim: hf, valido_ate: val ? `${val}T23:59:59-03:00` : null, ativo,
    };
    const { error } = id
      ? await (supabase.from('cupons') as any).update(dados).eq('id', id)
      : await (supabase.from('cupons') as any).insert(dados);
    setSalvando(false);
    if (error) return Alert.alert('Cupom', error.message);
    if (id) { router.back(); return; }
    Alert.alert('Cupom no ar', `Entrou nos quadradinhos de ${casa.nome} (grupo ${PLANO[casa.plano_comercial || ''] || 'do plano'}).`);
    router.back();
  };

  const lista = (casas || []).filter((c) => !busca.trim() || c.nome.toLowerCase().includes(busca.trim().toLowerCase()));

  return (
    <TelaAdm titulo={id ? 'Editar cupom' : 'Novo cupom'} subtitulo="Topo 3 · Ofertas da categoria" voltar>
      {carregandoCupom ? <ActivityIndicator color={CA.rosa} /> : <>
      {!!id && (
        <View style={[sa.card, { flexDirection: 'row', alignItems: 'center' }]}>
          <View style={{ flex: 1 }}><Text style={sa.tit}>{ativo ? 'No ar' : 'Pausado'}</Text><Text style={sa.sub}>Pausado some da faixa e da página da casa</Text></View>
          <Switch value={ativo} onValueChange={setAtivo} trackColor={{ true: CA.verde, false: '#3A3950' }} thumbColor="#FFF" />
        </View>
      )}
      <Text style={c.rot}>Casa *</Text>
      {casa ? (
        <View style={[sa.card, { flexDirection: 'row', alignItems: 'center', gap: 10 }]}>
          <Feather name="map-pin" size={15} color={CA.verde} />
          <View style={{ flex: 1 }}><Text style={sa.tit}>{casa.nome}</Text><Text style={sa.sub}>{PLANO[casa.plano_comercial || ''] || ''}</Text></View>
          {!id && <TouchableOpacity onPress={() => setCasa(null)}><Text style={c.trocar}>Trocar</Text></TouchableOpacity>}
        </View>
      ) : casas === null ? <ActivityIndicator color={CA.rosa} /> : (
        <>
          <TextInput value={busca} onChangeText={setBusca} placeholder="Buscar casa (só planos com cupom)" placeholderTextColor={CA.fraco} style={sa.campoBusca} />
          <View style={[sa.lista, { marginTop: 6 }]}>
            {lista.slice(0, 8).map((k, i, arr) => (
              <TouchableOpacity key={k.id} style={[sa.linha, i < arr.length - 1 && sa.borda]} onPress={() => setCasa(k)}>
                <Text style={[sa.tit, { flex: 1 }]} numberOfLines={1}>{k.nome}</Text><Text style={sa.sub}>{PLANO[k.plano_comercial || ''] || ''}</Text>
              </TouchableOpacity>
            ))}
            {lista.length === 0 && <Text style={[sa.vazio, { padding: 12 }]}>Nenhuma casa com plano pago nesta categoria. O Gratuito não tem cupom.</Text>}
          </View>
        </>
      )}

      <Text style={c.rot}>Cupom *</Text>
      <TextInput value={titulo} onChangeText={setTitulo} placeholder="Ex.: Drink em dobro até 21h" placeholderTextColor={CA.fraco} maxLength={80} style={sa.campoBusca} />
      <Text style={c.rot}>Regra (opcional)</Text>
      <TextInput value={descricao} onChangeText={setDescricao} placeholder="Ex.: Válido para drinks da casa" placeholderTextColor={CA.fraco} maxLength={200} style={sa.campoBusca} />
      <Text style={c.rot}>Código (opcional)</Text>
      <TextInput value={codigo} onChangeText={setCodigo} placeholder="Ex.: HAPPYDOBRO" autoCapitalize="characters" placeholderTextColor={CA.fraco} maxLength={20} style={sa.campoBusca} />

      <Text style={c.rot}>Dias (nenhum = todos)</Text>
      <View style={c.chips}>
        {NOMES_DIAS.map((n, i) => {
          const on = dias.includes(i);
          return <TouchableOpacity key={n} style={[c.chip, on && c.chipOn]} onPress={() => setDias(on ? dias.filter((x) => x !== i) : [...dias, i])}><Text style={[c.chipTxt, on && { color: '#0B0B0E' }]}>{n}</Text></TouchableOpacity>;
        })}
      </View>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1 }}><Text style={c.rot}>Das</Text><TextInput value={de} onChangeText={setDe} placeholder="18h" placeholderTextColor={CA.fraco} maxLength={5} style={sa.campoBusca} /></View>
        <View style={{ flex: 1 }}><Text style={c.rot}>Até</Text><TextInput value={ate} onChangeText={setAte} placeholder="21h" placeholderTextColor={CA.fraco} maxLength={5} style={sa.campoBusca} /></View>
        <View style={{ flex: 1 }}><Text style={c.rot}>Válido até</Text><TextInput value={validade} onChangeText={setValidade} placeholder="31/12" placeholderTextColor={CA.fraco} maxLength={10} style={sa.campoBusca} /></View>
      </View>

      <TouchableOpacity style={[sa.botao, { marginTop: 18 }, salvando && { opacity: 0.6 }]} onPress={salvar} disabled={salvando} accessibilityRole="button">
        {salvando ? <ActivityIndicator color="#FFF" /> : <Text style={sa.botaoTxt}>{id ? 'Salvar' : 'Pôr no ar'}</Text>}
      </TouchableOpacity>
      <Text style={[sa.vazio, { marginTop: 10 }]}>Foto e dizeres do cartão na faixa: no app da casa (Divulgar › Cupom) ou no portal.</Text>
      </>}
    </TelaAdm>
  );
}

const c = StyleSheet.create({
  rot: { color: CA.dim, fontSize: 12, fontWeight: '700', marginTop: 14, marginBottom: 6 },
  trocar: { color: CA.rosa, fontSize: 12, fontWeight: '700' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderColor: CA.borda, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  chipOn: { backgroundColor: '#FFF', borderColor: '#FFF' },
  chipTxt: { color: CA.texto, fontSize: 12, fontWeight: '700' },
});
