// Modo equipe — Serviços LGBT+ (migração 142): cadastrar e conferir centros de referência, saúde/PrEP, Defensoria etc.
// Cidade vazia = nacional. "Conferido hoje" grava a data da conferência (aparece para a equipe).
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import TelaAdm, { CA, sa } from '../../components/adm/TelaAdm';
import { TIPOS_SERVICO } from '../../lib/acolhimento';
import { supabase } from '../../lib/supabase';

type Servico = { id?: string; tipo: string; nome: string; descricao: string; cidade: string; uf: string; endereco: string; telefone: string; whatsapp: string;
  site: string; horario: string; gratuito: boolean; ativo: boolean; conferido_em?: string | null };
const VAZIO: Servico = { tipo: 'centro_referencia', nome: '', descricao: '', cidade: '', uf: '', endereco: '', telefone: '', whatsapp: '', site: '', horario: '', gratuito: true, ativo: true };
const hoje = () => new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 10);

export default function ServicosAdm() {
  const [lista, setLista] = useState<Servico[] | null>(null);
  const [form, setForm] = useState<Servico | null>(null);
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(async () => {
    const { data, error } = await supabase.from('servicos_lgbt').select('*').order('cidade', { nullsFirst: true }).order('tipo').order('nome');
    setLista(error ? [] : ((data as any[]) || []).map((x) => ({ ...VAZIO, ...Object.fromEntries(Object.entries(x).map(([k, v]) => [k, v ?? (typeof (VAZIO as any)[k] === 'string' ? '' : v)])) })));
  }, []);
  useFocusEffect(useCallback(() => { void carregar(); }, [carregar]));

  const salvar = async (conferido: boolean) => {
    if (!form) return;
    if (form.nome.trim().length < 2) return Alert.alert('Serviço', 'Escreva o nome.');
    setSalvando(true);
    const t = (v: string) => v.trim() || null;
    const campos = { tipo: form.tipo, nome: form.nome.trim(), descricao: t(form.descricao), cidade: t(form.cidade), uf: t(form.uf.toUpperCase()), endereco: t(form.endereco),
      telefone: t(form.telefone), whatsapp: t(form.whatsapp.replace(/\D/g, '')), site: t(form.site), horario: t(form.horario), gratuito: form.gratuito, ativo: form.ativo,
      ...(conferido ? { conferido_em: hoje() } : {}) };
    const { error } = form.id ? await supabase.from('servicos_lgbt').update(campos).eq('id', form.id) : await supabase.from('servicos_lgbt').insert(campos);
    setSalvando(false);
    if (error) return Alert.alert('Não deu', error.message.includes('servicos_lgbt') ? 'Rode a migração 142 no Supabase.' : error.message);
    setForm(null);
    void carregar();
  };

  const campo = (k: keyof Servico, rotulo: string, extra?: object) => (
    <TextInput key={k} value={String(form?.[k] ?? '')} onChangeText={(v) => form && setForm({ ...form, [k]: v })} placeholder={rotulo} placeholderTextColor={CA.fraco} style={st.input} {...extra} />
  );

  return (
    <TelaAdm titulo="Serviços LGBT+" subtitulo="O que aparece em Segurança › Serviços. Cidade vazia = Brasil todo." voltar aoAtualizar={carregar}>
      {!form && <TouchableOpacity style={st.novo} onPress={() => setForm({ ...VAZIO })}><Feather name="plus" size={16} color="#FFF" /><Text style={st.novoTxt}>Novo serviço</Text></TouchableOpacity>}
      {form && (
        <View style={[sa.card, { gap: 8, marginBottom: 14 }]}>
          <View style={st.chips}>
            {Object.entries(TIPOS_SERVICO).map(([k, v]) => (
              <TouchableOpacity key={k} style={[st.chip, form.tipo === k && st.chipOn]} onPress={() => setForm({ ...form, tipo: k })}>
                <Text style={[st.chipTxt, form.tipo === k && { color: '#000' }]}>{v.rotulo}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {campo('nome', 'Nome')}
          {campo('descricao', 'O que oferece (curto)', { multiline: true })}
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 3 }}>{campo('cidade', 'Cidade (vazio = nacional)')}</View>
            <View style={{ flex: 1 }}>{campo('uf', 'UF', { maxLength: 2, autoCapitalize: 'characters' })}</View>
          </View>
          {campo('endereco', 'Endereço')}
          {campo('telefone', 'Telefone', { keyboardType: 'phone-pad' })}
          {campo('whatsapp', 'WhatsApp com DDD e 55', { keyboardType: 'phone-pad' })}
          {campo('site', 'Site', { autoCapitalize: 'none', keyboardType: 'url' })}
          {campo('horario', 'Horário (ex.: seg a sex, 8h às 17h)')}
          <View style={st.linha}><Text style={sa.tit}>Gratuito</Text><Switch value={form.gratuito} onValueChange={(v) => setForm({ ...form, gratuito: v })} /></View>
          <View style={st.linha}><Text style={sa.tit}>No ar</Text><Switch value={form.ativo} onValueChange={(v) => setForm({ ...form, ativo: v })} /></View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity style={[st.botao, { flex: 1 }]} onPress={() => salvar(true)} disabled={salvando}><Text style={st.novoTxt}>{salvando ? 'Salvando…' : 'Salvar (conferido hoje)'}</Text></TouchableOpacity>
            <TouchableOpacity style={[st.botaoSec, { flex: 1 }]} onPress={() => salvar(false)} disabled={salvando}><Text style={st.novoTxt}>Salvar</Text></TouchableOpacity>
          </View>
          <TouchableOpacity onPress={() => setForm(null)}><Text style={[sa.sub, { textAlign: 'center' }]}>Cancelar</Text></TouchableOpacity>
        </View>
      )}
      {lista === null ? <ActivityIndicator color={CA.rosa} /> : lista.map((x) => (
        <TouchableOpacity key={x.id} style={[sa.card, { marginBottom: 8, opacity: x.ativo ? 1 : 0.5 }]} onPress={() => setForm(x)}>
          <Text style={sa.tit}>{x.nome}</Text>
          <Text style={sa.sub}>{TIPOS_SERVICO[x.tipo]?.rotulo} · {x.cidade || 'Nacional'}{x.conferido_em ? ` · conferido em ${x.conferido_em.split('-').reverse().join('/')}` : ' · não conferido'}</Text>
        </TouchableOpacity>
      ))}
    </TelaAdm>
  );
}

const st = StyleSheet.create({
  novo: { flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: CA.rosa, borderRadius: 12, paddingVertical: 12, marginBottom: 12 },
  novoTxt: { color: '#FFF', fontSize: 13.5, fontWeight: '800' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { borderWidth: 1, borderColor: CA.borda, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  chipOn: { backgroundColor: '#FFF', borderColor: '#FFF' },
  chipTxt: { color: CA.texto, fontSize: 12, fontWeight: '700' },
  input: { borderWidth: 1, borderColor: CA.borda, backgroundColor: '#0F0E16', borderRadius: 10, color: CA.texto, padding: 10, fontSize: 13.5 },
  linha: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  botao: { backgroundColor: CA.rosa, borderRadius: 10, paddingVertical: 11, alignItems: 'center' },
  botaoSec: { borderWidth: 1, borderColor: CA.borda, borderRadius: 10, paddingVertical: 11, alignItems: 'center' },
});
