// Páginas de seleção: "Indicados pela equipe" (Selo Dicas LGBT+), Membros
// Fundadores e demais seleções de destaque.
// Rodada 82 — usam o layout padrão da página de categoria (ListaPadrao), com
// chips Em Alta / Todas. A regra comercial de cada seleção não mudou.
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import ListaPadrao, { CAMPOS_LOCAL, ItemLista, localParaItem } from '../../components/ListaPadrao';
import { supabase } from '../../lib/supabase';
import { useRastrearTela } from '../../lib/usoTelas';

// Mesmo número/padrão já usado em profile.tsx (handleIndicarParceiroWhatsApp)
// pra qualquer contato comercial dentro do app.
const WHATSAPP_PARCEIROS = '5511942942028';

const COLORS = {
  card: '#161520',
  border: '#232230',
  textPrimary: '#FFFFFF',
  textSecondary: '#A0A0B2',
  pink: '#E1306C',
  purple: '#7E57C2',
};

const PLANO_PRIORIDADE: Record<string, number> = { vip: 0, destaque: 1, basico: 2 };

export default function FeaturedScreen() {
  useRastrearTela('experiencia', { detalheParam: 'tag' });
  const { tag } = useLocalSearchParams<{ tag?: string }>();
  const pageTitle = tag ? decodeURIComponent(tag) : 'Membro Fundador';
  const ehFundador = pageTitle.toLowerCase().includes('fundador');
  // Selo Dicas usa destaque_secoes (mesmo mecanismo do Selo Dicas em todo o app —
  // nunca plano_destaque, que é o campo comercial do branch "else" abaixo).
  const ehSeloDicas = pageTitle.toLowerCase().includes('selo dicas');
  // "Indicados pela equipe" é o nome público do Selo Dicas.
  const titulo = ehSeloDicas ? 'Indicados pela equipe' : pageTitle;

  const [loading, setLoading] = useState(true);
  const [itens, setItens] = useState<ItemLista[]>([]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        let locais: any[] = [];
        if (ehFundador) {
          // "Membro Fundador" é um selo real (local_badges.rotulo), não um plano.
          const { data, error } = await supabase
            .from('local_badges')
            .select(`locais!inner(${CAMPOS_LOCAL}, status)`)
            .ilike('rotulo', '%fundador%')
            .eq('ativo', true)
            .eq('locais.status', 'aprovado');
          if (error) throw error;
          locais = ((data as any) || []).map((row: any) => row.locais).filter(Boolean);
        } else if (ehSeloDicas) {
          // Curadoria editorial da Andrea, nunca vendida ("não se vende, apenas
          // se conquista"). Sem ordenar por plano comercial.
          const { data, error } = await supabase
            .from('locais')
            .select(CAMPOS_LOCAL)
            .eq('status', 'aprovado')
            .contains('destaque_secoes', ['selo_dicas'])
            .limit(100);
          if (error) throw error;
          locais = (data as any[]) || [];
        } else {
          const { data, error } = await supabase
            .from('locais')
            .select(CAMPOS_LOCAL)
            .eq('status', 'aprovado')
            .in('plano_destaque', ['destaque', 'vip'])
            .limit(100);
          if (error) throw error;
          locais = ((data as any[]) || []).sort(
            (a, b) => (PLANO_PRIORIDADE[a.plano_destaque] ?? 2) - (PLANO_PRIORIDADE[b.plano_destaque] ?? 2)
          );
        }
        setItens(
          locais.map((l) =>
            localParaItem(l, ehSeloDicas ? { selo: { texto: 'SELO DICAS', cor: 'rgba(225,48,108,0.15)', textoCor: COLORS.pink } } : {})
          )
        );
      } catch (err) {
        console.error('Erro ao carregar parceiros em destaque:', err);
        setItens([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [ehFundador, ehSeloDicas]);

  const handleSejaDestaqueWhatsApp = async () => {
    const mensagem = encodeURIComponent(
      `Olá! Vi a seção "${pageTitle}" no app Dicas LGBT+ e quero saber como colocar meu espaço em destaque.`
    );
    const url = `whatsapp://send?phone=${WHATSAPP_PARCEIROS}&text=${mensagem}`;
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        await Linking.openURL(`https://api.whatsapp.com/send?phone=${WHATSAPP_PARCEIROS}&text=${mensagem}`);
      }
    } catch {
      Alert.alert('Erro', 'Não foi possível abrir o WhatsApp.');
    }
  };

  const rodape = ehSeloDicas ? (
    // Selo Dicas "não se vende, apenas se conquista": aviso neutro, sem botão de contato.
    <View style={styles.ctaCard}>
      <Feather name="heart" size={24} color={COLORS.pink} />
      <Text style={styles.ctaTitle}>Como funciona o Selo Dicas LGBT+?</Text>
      <Text style={styles.ctaSub}>É uma escolha editorial da nossa curadoria — não pode ser comprado nem solicitado.</Text>
    </View>
  ) : (
    <TouchableOpacity style={styles.ctaCard} onPress={handleSejaDestaqueWhatsApp} activeOpacity={0.85}>
      <Feather name="shield" size={24} color={COLORS.purple} />
      <Text style={styles.ctaTitle}>Seja um {pageTitle}</Text>
      <Text style={styles.ctaSub}>Posicione sua marca em destaque máximo para milhares de pessoas na comunidade.</Text>
      <View style={styles.ctaBtn}>
        <Feather name="message-circle" size={14} color="#FFF" />
        <Text style={styles.ctaBtnText}>Falar no WhatsApp</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <ListaPadrao
      titulo={titulo}
      subtitulo={
        ehSeloDicas
          ? 'Os lugares que a gente conheceu, amou e indica de coração.'
          : 'Locais parceiros de excelência que apoiam e constroem nossa comunidade.'
      }
      itens={itens}
      carregando={loading}
      vazioTexto="Ainda não há locais nesta seleção. Assim que os primeiros forem aprovados, eles aparecem aqui."
      vazioIcone="award"
      rodape={rodape}
    />
  );
}

const styles = StyleSheet.create({
  ctaCard: { backgroundColor: COLORS.card, borderRadius: 16, padding: 20, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border, gap: 8, marginTop: 4 },
  ctaTitle: { fontSize: 14, fontWeight: '800', color: COLORS.textPrimary },
  ctaSub: { fontSize: 12, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 16 },
  ctaBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.purple, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, marginTop: 4 },
  ctaBtnText: { fontSize: 12, fontWeight: '700', color: '#FFF' },
});
