// Conta → "Caixa de entrada" + "Últimas ações" (nova versão estilo Uber).
//
// Caixa de entrada: comunicados publicados (tabela comunicados, leitura
// pública — RLS comunicados_select_publicados). Não usa push: nada de
// notificação de marketing sem consentimento (App Store 4.5.4).
// Últimas ações: check-ins, cupons resgatados e pedidos de Lista VIP do
// próprio usuário (RLS de dono em cada tabela).
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { useI18n } from '../lib/i18n';
import { supabase } from '../lib/supabase';

type Aba = 'inbox' | 'acoes';

interface Comunicado {
  id: string;
  titulo: string;
  corpo: string;
  icone_tipo: 'institucional' | 'seguranca' | 'novidade';
  created_at: string;
}

interface Acao {
  id: string;
  tipo: 'checkin' | 'cupom' | 'vip';
  titulo: string;
  meta: string;
  quando: string;
  localId: string | null;
}

const ICONE_COMUNICADO: Record<Comunicado['icone_tipo'], string> = {
  institucional: 'volume-2',
  seguranca: 'shield',
  novidade: 'star',
};

function dataCurta(iso: string, idioma: string) {
  const loc = idioma === 'en' ? 'en-US' : idioma === 'es' ? 'es-ES' : 'pt-BR';
  return new Date(iso).toLocaleDateString(loc, { day: '2-digit', month: 'short' });
}

export default function ContaAtividade({ userId, abaInicial }: { userId: string | null; abaInicial?: Aba }) {
  const router = useRouter();
  const { t, idioma } = useI18n();
  const [aba, setAba] = useState<Aba>(abaInicial || 'inbox');
  const [comunicados, setComunicados] = useState<Comunicado[]>([]);
  const [acoes, setAcoes] = useState<Acao[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    if (abaInicial) setAba(abaInicial);
  }, [abaInicial]);

  useEffect(() => {
    let ativo = true;
    (async () => {
      setCarregando(true);
      const comRes = await supabase
        .from('comunicados')
        .select('id, titulo, corpo, icone_tipo, created_at')
        .eq('publicado', true)
        .order('created_at', { ascending: false })
        .limit(20);

      let lista: Acao[] = [];
      if (userId) {
        const [chk, cup, vip] = await Promise.all([
          supabase
            .from('checkins')
            .select('id, created_at, validado_em, local_id, locais(nome, bairro, cidade)')
            .eq('user_id', userId)
            .is('cancelado_em', null)
            .order('created_at', { ascending: false })
            .limit(10),
          supabase
            .from('cupons_resgatados')
            .select('id, resgatado_em, cupons(titulo, local_id, locais(nome))')
            .eq('user_id', userId)
            .order('resgatado_em', { ascending: false })
            .limit(10),
          supabase
            .from('listas_vip_solicitacoes')
            .select('id, created_at, status, listas_vip(eventos(titulo, local_id))')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(10),
        ]);
        lista = [
          ...(((chk.data as any[]) || []).map((r) => ({
            id: `c-${r.id}`,
            tipo: 'checkin' as const,
            titulo: r.locais?.nome || '—',
            meta: [r.locais?.bairro, r.locais?.cidade].filter(Boolean).join(' · '),
            quando: r.created_at,
            localId: r.local_id,
          }))),
          ...(((cup.data as any[]) || []).map((r) => ({
            id: `p-${r.id}`,
            tipo: 'cupom' as const,
            titulo: r.cupons?.titulo || '—',
            meta: r.cupons?.locais?.nome || '',
            quando: r.resgatado_em,
            localId: r.cupons?.local_id || null,
          }))),
          ...(((vip.data as any[]) || []).map((r) => ({
            id: `v-${r.id}`,
            tipo: 'vip' as const,
            titulo: r.listas_vip?.eventos?.titulo || '—',
            meta: String(r.status || ''),
            quando: r.created_at,
            localId: r.listas_vip?.eventos?.local_id || null,
          }))),
        ].sort((a, b) => (a.quando < b.quando ? 1 : -1));
      }

      if (!ativo) return;
      setComunicados(((comRes.data as any) || []) as Comunicado[]);
      setAcoes(lista.slice(0, 15));
      setCarregando(false);
    })();
    return () => {
      ativo = false;
    };
  }, [userId]);

  const rotuloAcao = (tipo: Acao['tipo']) =>
    tipo === 'checkin' ? t('conta.checkin') : tipo === 'cupom' ? t('conta.cupom') : t('conta.listaVip');
  const corAcao = (tipo: Acao['tipo']) => (tipo === 'checkin' ? '#E1306C' : tipo === 'cupom' ? '#FFD54F' : '#B39DDB');

  return (
    <View style={styles.bloco}>
      <View style={styles.abas} accessibilityRole="tablist">
        {(['inbox', 'acoes'] as Aba[]).map((a) => (
          <TouchableOpacity
            key={a}
            style={[styles.aba, aba === a && styles.abaAtiva]}
            onPress={() => setAba(a)}
            accessibilityRole="tab"
            accessibilityState={{ selected: aba === a }}
          >
            <Text style={[styles.abaTxt, aba === a && { color: '#FFFFFF' }]}>
              {a === 'inbox' ? t('conta.inbox') : t('conta.acoes')}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {carregando ? (
        <ActivityIndicator color="#E1306C" style={{ marginVertical: 20 }} />
      ) : aba === 'inbox' ? (
        comunicados.length === 0 ? (
          <Text style={styles.vazio}>{t('conta.semInbox')}</Text>
        ) : (
          comunicados.map((c) => (
            <View key={c.id} style={styles.item}>
              <View style={[styles.icone, c.icone_tipo === 'seguranca' && { backgroundColor: '#E1306C' }]}>
                <Feather name={ICONE_COMUNICADO[c.icone_tipo] as any} size={18} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.linhaTopo}>
                  <Text style={styles.titulo} numberOfLines={2}>{c.titulo}</Text>
                  <Text style={styles.data}>{dataCurta(c.created_at, idioma)}</Text>
                </View>
                <Text style={styles.corpo}>{c.corpo}</Text>
              </View>
            </View>
          ))
        )
      ) : !userId ? (
        <Text style={styles.vazio}>{t('conta.entrePraVer')}</Text>
      ) : acoes.length === 0 ? (
        <Text style={styles.vazio}>{t('conta.semAcoes')}</Text>
      ) : (
        acoes.map((a) => (
          <TouchableOpacity
            key={a.id}
            style={styles.item}
            disabled={!a.localId}
            onPress={() => a.localId && router.push(`/business/${a.localId}` as any)}
          >
            <View style={styles.icone}>
              <Feather name={a.tipo === 'checkin' ? 'map-pin' : a.tipo === 'cupom' ? 'percent' : 'list'} size={18} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.tag, { color: corAcao(a.tipo) }]}>{rotuloAcao(a.tipo)}</Text>
              <Text style={styles.titulo} numberOfLines={1}>{a.titulo}</Text>
              <Text style={styles.corpo} numberOfLines={1}>
                {[dataCurta(a.quando, idioma), a.meta].filter(Boolean).join(' · ')}
              </Text>
            </View>
            {a.localId && <Feather name="chevron-right" size={18} color="#A0A0B2" />}
          </TouchableOpacity>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bloco: { marginBottom: 20 },
  abas: { flexDirection: 'row', backgroundColor: '#161520', borderRadius: 24, padding: 4, gap: 4, marginBottom: 6 },
  aba: { flex: 1, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  abaAtiva: { backgroundColor: '#E1306C' },
  abaTxt: { fontSize: 13, fontWeight: '800', color: '#F5F5F7' },
  vazio: { fontSize: 13, color: '#A0A0B2', paddingVertical: 16, lineHeight: 19 },
  item: { flexDirection: 'row', gap: 12, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#232230', alignItems: 'center' },
  icone: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#232230', alignItems: 'center', justifyContent: 'center' },
  linhaTopo: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  titulo: { flexShrink: 1, fontSize: 14, fontWeight: '800', color: '#F5F5F7' },
  data: { fontSize: 12, color: '#A0A0B2' },
  corpo: { fontSize: 12, color: '#A0A0B2', marginTop: 2, lineHeight: 17 },
  tag: { fontSize: 11, fontWeight: '800', letterSpacing: 0.4 },
});
