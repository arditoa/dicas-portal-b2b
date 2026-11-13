// Rodada 145 — Conta do cliente: autorizar que as casas onde fez check-in vejam o aniversário (só DIA e MÊS).
// Desligado por padrão (LGPD). Grava em profiles.aniversario_para_casas (migração 100).
import { useEffect, useState } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';
import { supabase } from '../lib/supabase';

const COR = '#E1306C';

export default function AniversarioCasas({ userId, temNascimento }: { userId: string; temNascimento: boolean }) {
  const [ligado, setLigado] = useState(false);
  const [existe, setExiste] = useState(true);

  useEffect(() => {
    let vivo = true;
    supabase
      .from('profiles')
      .select('aniversario_para_casas')
      .eq('id', userId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!vivo) return;
        if (error) setExiste(false); // migração 100 ainda não rodou
        else setLigado(!!(data as { aniversario_para_casas?: boolean } | null)?.aniversario_para_casas);
      });
    return () => {
      vivo = false;
    };
  }, [userId]);

  if (!existe || !temNascimento) return null;

  const alternar = async (v: boolean) => {
    setLigado(v);
    const { error } = await supabase.from('profiles').update({ aniversario_para_casas: v }).eq('id', userId);
    if (error) setLigado(!v);
  };

  return (
    <View>
      <View style={s.linha}>
        <View style={{ flex: 1 }}>
          <Text style={s.titulo}>Avisar as casas do meu aniversário</Text>
          <Text style={s.sub}>Bares e festas onde você fez check-in veem só o dia e o mês, para preparar um mimo. Nunca o ano.</Text>
        </View>
        <Switch value={ligado} onValueChange={alternar} trackColor={{ true: COR }} accessibilityLabel="Avisar as casas do meu aniversário" />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  linha: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  titulo: { fontSize: 13, fontWeight: '700', color: '#E9E7F3' },
  sub: { fontSize: 11, color: '#8E8BA3', marginTop: 2, lineHeight: 15 },
});
