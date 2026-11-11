// Conta: foto (opcional) e status de relacionamento (opcional). Tudo privado por enquanto:
// a foto fica num bucket privado (migration 057) e o status só aparece para a própria pessoa.
// Se a migration ainda não rodou, a tela continua funcionando (mostra as iniciais e avisa ao salvar).
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';

import { supabase } from '../lib/supabase';
import { statusDoLegado, statusLegado, STATUS_OPCOES } from '../lib/perfilOpcoes';

const COR = '#7E57C2';

// Rodada 141 — `compacto`: avatar menor e sem a legenda, para o cabeçalho da Conta em linha.
export function AvatarEditavel({ userId, iniciais, compacto = false }: { userId: string; iniciais: string; compacto?: boolean }) {
  const [url, setUrl] = useState<string | null>(null);
  const [caminho, setCaminho] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    let vivo = true;
    (async () => {
      const { data, error } = await supabase.from('profiles').select('avatar_url').eq('id', userId).single();
      const c = !error ? ((data as any)?.avatar_url as string | null) : null;
      if (!vivo || !c || c.startsWith('http')) return;
      setCaminho(c);
      const { data: ass } = await supabase.storage.from('avatares').createSignedUrl(c, 3600);
      if (vivo && ass?.signedUrl) setUrl(ass.signedUrl);
    })().catch(() => {});
    return () => { vivo = false; };
  }, [userId]);

  const escolher = async () => {
    try {
      const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.6 });
      if (r.canceled || !r.assets?.[0]) return;
      setEnviando(true);
      const buf = await (await fetch(r.assets[0].uri)).arrayBuffer();
      if (buf.byteLength > 3 * 1024 * 1024) throw new Error('A foto passou de 3 MB. Escolha uma menor.');
      const dest = `${userId}/avatar.jpg`;
      const up = await supabase.storage.from('avatares').upload(dest, buf, { contentType: 'image/jpeg', upsert: true });
      if (up.error) throw new Error('Não deu para enviar a foto agora. Tente de novo em instantes.');
      await supabase.from('profiles').update({ avatar_url: dest }).eq('id', userId);
      const { data: ass } = await supabase.storage.from('avatares').createSignedUrl(dest, 3600);
      setCaminho(dest);
      setUrl(ass?.signedUrl ? `${ass.signedUrl}&t=${Date.now()}` : null);
    } catch (e: any) {
      Alert.alert('Foto de perfil', e?.message || 'Não foi possível atualizar a foto.');
    } finally {
      setEnviando(false);
    }
  };

  const remover = () => {
    if (!caminho) return;
    Alert.alert('Remover foto', 'Quer remover a sua foto de perfil?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover', style: 'destructive',
        onPress: async () => {
          await supabase.storage.from('avatares').remove([caminho]);
          await supabase.from('profiles').update({ avatar_url: null }).eq('id', userId);
          setUrl(null); setCaminho(null);
        },
      },
    ]);
  };

  return (
    <View style={{ alignItems: 'center', marginBottom: compacto ? 0 : 6 }}>
      <TouchableOpacity onPress={escolher} onLongPress={remover} activeOpacity={0.85} accessibilityRole="button" accessibilityLabel="Foto de perfil (opcional)">
        <View style={[s.avatar, compacto && s.avatarCompacto]}>
          {url ? <Image source={{ uri: url }} style={[s.foto, compacto && s.avatarCompacto]} /> : <Text style={s.iniciais}>{iniciais}</Text>}
          {enviando && <View style={s.carregando}><ActivityIndicator color="#FFF" /></View>}
        </View>
        <View style={s.camera}><Feather name="camera" size={12} color="#FFF" /></View>
      </TouchableOpacity>
      {!compacto && <Text style={s.dica}>{url ? 'Toque para trocar · segure para remover' : 'Foto de perfil (opcional)'}</Text>}
    </View>
  );
}

const OPCOES = STATUS_OPCOES.filter((o) => o.valor !== 'nao_informado');

export function StatusRelacionamento({ userId }: { userId: string }) {
  // Lista vazia = prefere não informar. Pode marcar mais de uma opção (migration 080).
  const [status, setStatus] = useState<string[]>([]);
  const [mostrar, setMostrar] = useState(false);
  // Rodada 141 — fica recolhido numa linha (resumo + seta); abre ao tocar. Deixa a Conta mais limpa.
  const [aberto, setAberto] = useState(false);

  useEffect(() => {
    let vivo = true;
    supabase.from('profiles').select('status_relacionamento, status_relacionamento_lista, mostrar_status_relacionamento').eq('id', userId).single()
      .then(({ data, error }) => {
        if (!vivo || error || !data) return;
        const lista = ((data as any).status_relacionamento_lista as string[] | null) || [];
        setStatus(lista.length > 0 ? lista : statusDoLegado((data as any).status_relacionamento));
        setMostrar(!!(data as any).mostrar_status_relacionamento);
      }, () => {});
    return () => { vivo = false; };
  }, [userId]);

  const salvar = async (campos: Record<string, unknown>, desfazer: () => void) => {
    const { error } = await supabase.from('profiles').update(campos).eq('id', userId);
    if (error) {
      desfazer();
      Alert.alert('Status', 'Não foi possível salvar agora. Tente de novo em instantes.');
    }
  };

  const gravarLista = (nova: string[]) => {
    const antes = status;
    setStatus(nova);
    const campos: Record<string, unknown> = { status_relacionamento_lista: nova, status_relacionamento: statusLegado(nova) };
    if (nova.length === 0) { campos.mostrar_status_relacionamento = false; setMostrar(false); }
    salvar(campos, () => setStatus(antes));
  };

  const alternarOpcao = (valor: string) => gravarLista(status.includes(valor) ? status.filter((x) => x !== valor) : [...status, valor]);

  const alternar = (v: boolean) => {
    setMostrar(v);
    salvar({ mostrar_status_relacionamento: v }, () => setMostrar(!v));
  };

  return (
    <View style={s.bloco}>
      <TouchableOpacity onPress={() => setAberto((a) => !a)} style={s.linhaResumo} accessibilityRole="button" accessibilityState={{ expanded: aberto }}>
        <Feather name="heart" size={14} color="#8E8BA3" />
        <View style={{ flex: 1 }}>
          <Text style={s.resumoTitulo}>Status de relacionamento</Text>
          <Text style={s.resumoValor} numberOfLines={1}>
            {status.length === 0 ? 'Prefiro não informar' : OPCOES.filter((o) => status.includes(o.valor)).map((o) => o.rotulo).join(', ')}
            {mostrar ? ' · visível' : ' · só você vê'}
          </Text>
        </View>
        <Feather name={aberto ? 'chevron-up' : 'chevron-down'} size={16} color="#8E8BA3" />
      </TouchableOpacity>
      {aberto && (
      <>
      <Text style={[s.titulo, { marginTop: 10 }]}>Pode marcar mais de uma</Text>
      <View style={s.chips}>
        {OPCOES.map((o) => {
          const ativo = status.includes(o.valor);
          return (
            <TouchableOpacity key={o.valor} onPress={() => alternarOpcao(o.valor)} style={[s.chip, ativo && { backgroundColor: COR, borderColor: COR }]} accessibilityRole="button" accessibilityState={{ selected: ativo }}>
              <Text style={[s.chipTxt, ativo && { color: '#FFF' }]}>{o.rotulo}</Text>
            </TouchableOpacity>
          );
        })}
        <TouchableOpacity onPress={() => gravarLista([])} style={[s.chip, status.length === 0 && { backgroundColor: COR, borderColor: COR }]} accessibilityRole="button" accessibilityState={{ selected: status.length === 0 }}>
          <Text style={[s.chipTxt, status.length === 0 && { color: '#FFF' }]}>Prefiro não informar</Text>
        </TouchableOpacity>
      </View>
      <View style={s.linhaSwitch}>
        <Text style={s.switchTxt}>Mostrar para outras pessoas (quando esse recurso existir)</Text>
        <Switch value={mostrar} onValueChange={alternar} disabled={status.length === 0} trackColor={{ true: COR }} />
      </View>
      <Text style={s.nota}>Dado pessoal sensível: fica só com você, a menos que você ative. Pode mudar ou apagar quando quiser.</Text>
      </>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  avatar: { width: 76, height: 76, borderRadius: 38, backgroundColor: COR, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  foto: { width: 76, height: 76 },
  avatarCompacto: { width: 60, height: 60, borderRadius: 30 },
  linhaResumo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  resumoTitulo: { fontSize: 13, fontWeight: '700', color: '#E9E7F3' },
  resumoValor: { fontSize: 12, color: '#8E8BA3', marginTop: 1 },
  iniciais: { fontSize: 20, fontWeight: '800', color: '#FFF' },
  carregando: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },
  camera: { position: 'absolute', right: -2, bottom: -2, width: 26, height: 26, borderRadius: 13, backgroundColor: '#E1306C', borderWidth: 2, borderColor: '#1A1A22', alignItems: 'center', justifyContent: 'center' },
  dica: { marginTop: 8, fontSize: 11, color: '#8E8BA3' },
  bloco: { width: '100%', marginTop: 4 },
  titulo: { fontSize: 12, fontWeight: '800', color: '#A9A6BD', marginBottom: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, borderWidth: 1, borderColor: '#2E2E3D', backgroundColor: '#14141B' },
  chipTxt: { fontSize: 11.5, fontWeight: '700', color: '#D6D3E0' },
  linhaSwitch: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 12 },
  switchTxt: { flex: 1, fontSize: 12, color: '#A9A6BD' },
  nota: { marginTop: 8, fontSize: 11, color: '#8E8BA3', lineHeight: 15 },
});
