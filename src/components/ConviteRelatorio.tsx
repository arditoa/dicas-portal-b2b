// Rodada 148 — Conta: convite (uma vez) para quem já informou identidade/orientação e ainda não autorizou os relatórios.
// Um toque em "Sim, quero contar" liga as autorizações dos dados que a pessoa informou. "Agora não" esconde o convite
// neste aparelho. Nada vem ligado por padrão (LGPD art. 11). Os interruptores seguem em Conta › Privacidade.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '../lib/supabase';
import { NAO_INFORMAR } from '../lib/perfilOpcoes';

const CHAVE = (u: string) => `dicas_convite_relatorio_v1_${u}`;
const informou = (v?: string | null) => !!v && v !== NAO_INFORMAR;

export default function ConviteRelatorio({ userId }: { userId: string }) {
  const [alvo, setAlvo] = useState<{ genero: boolean; orientacao: boolean } | null>(null);
  const [feito, setFeito] = useState(false);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        if (await AsyncStorage.getItem(CHAVE(userId))) return;
      } catch {}
      const { data, error } = await supabase
        .from('perfil_privado')
        .select('identidade_genero, orientacao_sexual, consentimento_sensivel_em, consentimento_relatorio_genero, consentimento_relatorio_orientacao')
        .eq('user_id', userId)
        .maybeSingle();
      if (!vivo || error || !data) return;
      const d = data as any;
      if (!d.consentimento_sensivel_em) return;
      const genero = informou(d.identidade_genero) && !d.consentimento_relatorio_genero;
      const orientacao = informou(d.orientacao_sexual) && !d.consentimento_relatorio_orientacao;
      if (genero || orientacao) setAlvo({ genero, orientacao });
    })();
    return () => { vivo = false; };
  }, [userId]);

  if (!alvo) return null;

  const fechar = () => {
    AsyncStorage.setItem(CHAVE(userId), '1').catch(() => {});
    setAlvo(null);
  };

  const sim = async () => {
    setSalvando(true);
    const agora = new Date().toISOString();
    const campos: Record<string, unknown> = { user_id: userId };
    if (alvo.genero) Object.assign(campos, { consentimento_relatorio_genero: true, consentimento_relatorio_genero_em: agora });
    if (alvo.orientacao) Object.assign(campos, { consentimento_relatorio_orientacao: true, consentimento_relatorio_orientacao_em: agora });
    const { error } = await supabase.from('perfil_privado').upsert(campos, { onConflict: 'user_id' });
    setSalvando(false);
    if (error) return Alert.alert('Não deu certo', 'Tente de novo em instantes.');
    AsyncStorage.setItem(CHAVE(userId), '1').catch(() => {});
    setFeito(true);
    setTimeout(() => setAlvo(null), 2500);
  };

  return (
    <View style={s.convite}>
      <Text style={s.tag}>FAÇA A COMUNIDADE APARECER</Text>
      <Text style={s.titulo}>Conte com a gente nos números</Text>
      {feito ? (
        <Text style={s.ok}>Obrigada por fazer parte! Dá para mudar quando quiser em Privacidade e conta.</Text>
      ) : (
        <>
          <Text style={s.txt}>
            Marcas e casas investem onde enxergam público. Somando, de forma anônima, quantas pessoas trans, não binárias, lésbicas, gays e bis usam o app, mostramos que a comunidade existe e merece investimento. Seu nome nunca aparece, e só entram grupos com pelo menos 10 pessoas.
          </Text>
          <TouchableOpacity style={[s.sim, salvando && { opacity: 0.6 }]} onPress={() => void sim()} disabled={salvando} activeOpacity={0.85} accessibilityRole="button">
            <Text style={s.simTxt}>Sim, quero contar</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={fechar} style={s.nao} accessibilityRole="button">
            <Text style={s.naoTxt}>Agora não</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  convite: { marginBottom: 18, padding: 14, borderRadius: 16, borderWidth: 1, borderColor: '#7E57C2', backgroundColor: '#1A1430' },
  tag: { fontSize: 10.5, fontWeight: '800', color: '#E1306C', letterSpacing: 1 },
  titulo: { fontSize: 16, fontWeight: '800', color: '#FFFFFF', marginTop: 4 },
  txt: { fontSize: 12.5, color: '#C9C6DA', lineHeight: 18, marginTop: 6 },
  sim: { height: 46, borderRadius: 23, backgroundColor: '#E1306C', alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  simTxt: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  nao: { alignItems: 'center', paddingVertical: 10 },
  naoTxt: { fontSize: 12.5, color: '#8E8BA3', fontWeight: '600' },
  ok: { fontSize: 12.5, color: '#4CAF7D', fontWeight: '700', marginTop: 8 },
});
