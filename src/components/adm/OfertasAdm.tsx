// Modo equipe · Topo 3 (Ofertas) de uma categoria. Duas filas, como o app mostra:
//   • Fundador e Premium: 12 vagas (10 Premium + 2 Fundador), 3 por vez, troca a cada 10 min
//   • Intermediário: 12 vagas, 3 por vez, troca a cada 30 min
// Cada cupom: status real (No ar / Fora do horário / Pausado / Vencido), liga/desliga e toque para editar.
import { Feather } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { dentroDaJanela, textoJanela } from '../../lib/janelaCupom';
import { supabase } from '../../lib/supabase';
import { CA, sa } from './TelaAdm';

type Cupom = {
  id: string; titulo: string; ativo: boolean; valido_ate: string | null; valido_de: string | null;
  dias_semana: number[] | null; hora_inicio: string | null; hora_fim: string | null;
  locais: { nome: string; plano_comercial: string | null } | null;
};
type Estado = 'no_ar' | 'fora' | 'pausado' | 'vencido' | 'agendado';
const ESTADO: Record<Estado, { txt: string; cor: string; ordem: number }> = {
  no_ar: { txt: 'No ar', cor: CA.verde, ordem: 0 },
  fora: { txt: 'Fora do horário', cor: '#FBBF24', ordem: 1 },
  agendado: { txt: 'Agendado', cor: '#60A5FA', ordem: 2 },
  pausado: { txt: 'Pausado', cor: '#9CA3AF', ordem: 3 },
  vencido: { txt: 'Vencido', cor: '#F87171', ordem: 4 },
};
const FILAS = [
  { chave: 'top', tit: 'Fundador e Premium', planos: ['fundador', 'premium'], vagas: 12, regra: '3 por vez · troca a cada 10 min' },
  { chave: 'int', tit: 'Intermediário', planos: ['intermediario'], vagas: 12, regra: '3 por vez · troca a cada 30 min' },
] as const;
const PLANO: Record<string, string> = { premium: 'Premium', fundador: 'Fundador', intermediario: 'Intermediário' };
const dm = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'America/Sao_Paulo' });

function estadoDe(c: Cupom): Estado {
  const agora = Date.now();
  if (c.valido_ate && new Date(c.valido_ate).getTime() < agora) return 'vencido';
  if (!c.ativo) return 'pausado';
  if (c.valido_de && new Date(c.valido_de).getTime() > agora) return 'agendado';
  return dentroDaJanela(c.dias_semana, c.hora_inicio, c.hora_fim) ? 'no_ar' : 'fora';
}

export default function OfertasAdm({ categoria, idsLocais }: { categoria: string; idsLocais?: string[] }) {
  const router = useRouter();
  const [lista, setLista] = useState<Cupom[] | null>(null);
  const [fila, setFila] = useState<'top' | 'int'>('top');
  const [verVencidos, setVerVencidos] = useState(false);

  const carregar = useCallback(async () => {
    if (!categoria && !idsLocais) { setLista([]); return; }
    if (idsLocais && idsLocais.length === 0) { setLista([]); return; }
    let q = (supabase.from('cupons') as any)
      .select('id, titulo, ativo, valido_de, valido_ate, dias_semana, hora_inicio, hora_fim, locais!inner(nome, categoria, status, plano_comercial)')
      .eq('locais.status', 'aprovado').order('created_at', { ascending: false }).limit(150);
    q = idsLocais ? q.in('local_id', idsLocais) : q.eq('locais.categoria', categoria);
    const { data, error } = await q;
    if (error) Alert.alert('Ofertas', error.message);
    setLista((data as Cupom[]) || []);
  }, [categoria, (idsLocais || []).join(',')]);
  useFocusEffect(useCallback(() => { void carregar(); }, [carregar]));

  const ligar = async (c: Cupom, ativo: boolean) => {
    setLista((l) => (l || []).map((x) => (x.id === c.id ? { ...x, ativo } : x)));
    const { error } = await (supabase.from('cupons') as any).update({ ativo }).eq('id', c.id);
    if (error) { Alert.alert('Cupom', error.message); void carregar(); }
  };

  const f = FILAS.find((x) => x.chave === fila)!;
  const plano = (c: Cupom) => c.locais?.plano_comercial || 'gratuito';
  const daFila = (k: (typeof FILAS)[number]) => (lista || []).filter((c) => (k.planos as readonly string[]).includes(plano(c)));
  const ocupadas = (k: (typeof FILAS)[number]) => daFila(k).filter((c) => ['no_ar', 'fora', 'agendado'].includes(estadoDe(c))).length;
  const itens = daFila(f).map((c) => ({ c, st: estadoDe(c) })).sort((a, b) => ESTADO[a.st].ordem - ESTADO[b.st].ordem);
  const vivos = itens.filter((x) => x.st !== 'vencido');
  const vencidos = itens.filter((x) => x.st === 'vencido');
  const semPlano = (lista || []).filter((c) => plano(c) === 'gratuito' && estadoDe(c) !== 'vencido').length;
  const oc = ocupadas(f);

  return (
    <View>
      <View style={o.abas}>
        {FILAS.map((k) => {
          const on = k.chave === fila;
          return (
            <TouchableOpacity key={k.chave} style={[o.aba, on && o.abaOn]} onPress={() => setFila(k.chave)} accessibilityRole="tab" accessibilityState={{ selected: on }}>
              <Text style={[o.abaTit, on && { color: '#0B0B0E' }]} numberOfLines={1}>{k.tit}</Text>
              <Text style={[o.abaNum, on && { color: '#0B0B0E' }]}>{lista === null ? '…' : `${ocupadas(k)}/${k.vagas}`}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={o.barra}><View style={[o.barraCheia, { width: `${Math.min(100, (oc / f.vagas) * 100)}%`, backgroundColor: oc > f.vagas ? '#F87171' : CA.rosa }]} /></View>
      <Text style={o.regra}>{oc > f.vagas ? `Passou de ${f.vagas} vagas: ${oc - f.vagas} esperam a vez` : `${f.vagas - oc} vagas livres · ${f.regra}`}</Text>

      {lista !== null && vivos.length === 0 && <Text style={o.vazio}>Nenhum cupom nesta fila.</Text>}
      {vivos.map(({ c, st }) => <Linha key={c.id} c={c} st={st} aoLigar={ligar} aoAbrir={() => router.push(`/adm/cupom-novo?id=${c.id}` as any)} />)}

      {vencidos.length > 0 && (
        <TouchableOpacity style={o.mais} onPress={() => setVerVencidos(!verVencidos)}>
          <Text style={o.maisTxt}>{verVencidos ? 'Esconder vencidos' : `Ver vencidos (${vencidos.length})`}</Text>
          <Feather name={verVencidos ? 'chevron-up' : 'chevron-down'} size={13} color={CA.dim} />
        </TouchableOpacity>
      )}
      {verVencidos && vencidos.map(({ c, st }) => <Linha key={c.id} c={c} st={st} aoLigar={ligar} aoAbrir={() => router.push(`/adm/cupom-novo?id=${c.id}` as any)} />)}

      <TouchableOpacity style={[sa.botaoSec, { marginTop: 10 }]} onPress={() => router.push(`/adm/cupom-novo?categoria=${encodeURIComponent(categoria)}&fila=${fila}` as any)}>
        <Feather name="plus" size={14} color={CA.texto} /><Text style={sa.botaoSecTxt}>Cupom {f.tit}</Text>
      </TouchableOpacity>
      {semPlano > 0 && <Text style={[o.regra, { marginTop: 8 }]}>{semPlano} cupom(ns) de casa sem plano não aparecem na faixa.</Text>}
    </View>
  );
}

function Linha({ c, st, aoLigar, aoAbrir }: { c: Cupom; st: Estado; aoLigar: (c: Cupom, v: boolean) => void; aoAbrir: () => void }) {
  const e = ESTADO[st];
  const janela = textoJanela(c.dias_semana, c.hora_inicio, c.hora_fim);
  const pl = PLANO[c.locais?.plano_comercial || ''];
  const sub = [c.locais?.nome, pl, janela || 'Todo dia', c.valido_ate ? `até ${dm(c.valido_ate)}` : null].filter(Boolean).join(' · ');
  return (
    <View style={o.linha}>
      <TouchableOpacity style={{ flex: 1, minWidth: 0 }} onPress={aoAbrir} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel={`Editar ${c.titulo}`}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={[o.ponto, { backgroundColor: e.cor }]} />
          <Text style={[o.st, { color: e.cor }]}>{e.txt}</Text>
        </View>
        <Text style={[sa.tit, st === 'vencido' || st === 'pausado' ? { color: CA.dim } : null]} numberOfLines={1}>{c.titulo}</Text>
        <Text style={sa.sub} numberOfLines={1}>{sub}</Text>
      </TouchableOpacity>
      {st !== 'vencido' && <Switch value={c.ativo} onValueChange={(v) => aoLigar(c, v)} trackColor={{ true: CA.verde, false: '#3A3950' }} thumbColor="#FFF" />}
    </View>
  );
}

const o = StyleSheet.create({
  abas: { flexDirection: 'row', gap: 6, marginTop: 10, marginBottom: 10 },
  aba: { flex: 1, borderWidth: 1, borderColor: CA.borda, borderRadius: 12, paddingVertical: 8, paddingHorizontal: 10 },
  abaOn: { backgroundColor: '#FFF', borderColor: '#FFF' },
  abaTit: { color: CA.texto, fontSize: 11, fontWeight: '700' },
  abaNum: { color: CA.dim, fontSize: 15, fontWeight: '800', marginTop: 2 },
  barra: { height: 4, borderRadius: 2, backgroundColor: '#2A2840', overflow: 'hidden' },
  barraCheia: { height: 4, borderRadius: 2 },
  regra: { color: CA.fraco, fontSize: 10, marginTop: 5, marginBottom: 4 },
  vazio: { color: CA.fraco, fontSize: 11, paddingVertical: 8 },
  linha: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderTopWidth: 1, borderTopColor: CA.borda },
  ponto: { width: 6, height: 6, borderRadius: 3 },
  st: { fontSize: 10, fontWeight: '700' },
  mais: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 8, borderTopWidth: 1, borderTopColor: CA.borda },
  maisTxt: { color: CA.dim, fontSize: 11, fontWeight: '600' },
});
