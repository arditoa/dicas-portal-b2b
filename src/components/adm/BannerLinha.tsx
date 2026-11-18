// Uma linha de banner no Modo equipe: cor, etiqueta, título, onde abre, a situação (No ar, Agendado, Vencido, Desligado)
// e a chave liga/desliga (vale na hora no app). Toque na linha para editar.
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Image, Switch, Text, TouchableOpacity, View } from 'react-native';
import { BannerAdm, descreverDestino, situacaoBanner } from '../../lib/admin';
import { supabase } from '../../lib/supabase';
import { CA, sa } from './TelaAdm';

export default function BannerLinha({ b, ultimo }: { b: BannerAdm; ultimo?: boolean }) {
  const router = useRouter();
  const [ativo, setAtivo] = useState(b.ativo);
  useEffect(() => { setAtivo(b.ativo); }, [b.ativo, b.id]);
  const sit = situacaoBanner({ ...b, ativo });
  const ligar = async (v: boolean) => {
    setAtivo(v);
    const { error } = await supabase.from('banners_app').update({ ativo: v }).eq('id', b.id);
    if (error) { setAtivo(!v); Alert.alert('Banner', error.message); }
  };
  return (
    <View style={[sa.linha, !ultimo && sa.borda]}>
      <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }} onPress={() => router.push(`/adm/banner-editar?id=${b.id}` as any)} accessibilityRole="button">
        <View style={{ width: 32, height: 32, borderRadius: 9, backgroundColor: b.cor || '#7E57C2', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', opacity: ativo ? 1 : 0.5 }}>
          {b.logo_url ? <Image source={{ uri: b.logo_url }} style={{ width: 32, height: 32 }} resizeMode="cover" /> : <Feather name={(b.icone || 'star') as any} size={15} color="#FFF" />}
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[sa.tit, !ativo && { color: CA.fraco }]} numberOfLines={1}>{b.titulo}</Text>
          <Text style={sa.sub} numberOfLines={1}><Text style={{ color: sit.cor }}>{sit.txt}</Text> · {b.tag} · {descreverDestino(b.destino)}</Text>
        </View>
      </TouchableOpacity>
      <Switch value={ativo} onValueChange={(v) => void ligar(v)} trackColor={{ true: CA.verde, false: '#3A3950' }} thumbColor="#FFF" accessibilityLabel={ativo ? `Desligar ${b.titulo}` : `Ligar ${b.titulo}`} />
    </View>
  );
}
