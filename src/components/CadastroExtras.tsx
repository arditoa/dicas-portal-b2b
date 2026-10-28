// Passos opcionais do cadastro (depois dos dados básicos): "Sobre você" e "Gostos".
// Tudo pode ser pulado; orientação/identidade/status só são gravados com consentimento específico.
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { GRUPOS_EVENTO } from '../lib/taxonomia';
import { EXTRAS_VAZIO, ExtrasCadastro, IDENTIDADES, NAO_INFORMAR, ORIENTACOES, PRONOMES, STATUS_OPCOES } from '../lib/perfilOpcoes';
import { supabase } from '../lib/supabase';

const COR = '#7E57C2';
const ROSA = '#E1306C';
const CHAVE_PENDENTE = 'dicas_perfil_pendente_v1';

function Chips({ opcoes, valor, onEscolher }: { opcoes: string[]; valor?: string; onEscolher: (v?: string) => void }) {
  return (
    <View style={s.chips}>
      {opcoes.map((o) => {
        const ativo = valor === o;
        return (
          <TouchableOpacity key={o} onPress={() => onEscolher(ativo ? undefined : o)} style={[s.chip, ativo && { backgroundColor: COR, borderColor: COR }]} accessibilityRole="button" accessibilityState={{ selected: ativo }}>
            <Text style={[s.chipTxt, ativo && { color: '#FFF' }]}>{o}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function ChipsMulti({ opcoes, valores, onMudar }: { opcoes: string[]; valores: string[]; onMudar: (v: string[]) => void }) {
  return (
    <View style={s.chips}>
      {opcoes.map((o) => {
        const ativo = valores.includes(o);
        return (
          <TouchableOpacity key={o} onPress={() => onMudar(ativo ? valores.filter((x) => x !== o) : [...valores, o])} style={[s.chip, ativo && { backgroundColor: ROSA, borderColor: ROSA }]} accessibilityRole="button" accessibilityState={{ selected: ativo }}>
            <Text style={[s.chipTxt, ativo && { color: '#FFF' }]}>{o}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

type PassoProps = { valor: ExtrasCadastro; onMudar: (v: ExtrasCadastro) => void };

export function PassoSobreVoce({ valor, onMudar }: PassoProps) {
  const tocouSensivel = !!(valor.orientacao || valor.identidade || valor.status);
  return (
    <View>
      <Text style={s.titulo}>Sobre você</Text>
      <Text style={s.sub}>Tudo aqui é opcional e só você vê. Serve para o app entender melhor quem você é e indicar lugares e eventos que acolhem de verdade.</Text>

      <Text style={s.rotulo}>Orientação sexual</Text>
      <Chips opcoes={ORIENTACOES} valor={valor.orientacao} onEscolher={(v) => onMudar({ ...valor, orientacao: v })} />

      <Text style={s.rotulo}>Identidade de gênero</Text>
      <Chips opcoes={IDENTIDADES} valor={valor.identidade} onEscolher={(v) => onMudar({ ...valor, identidade: v })} />

      <Text style={s.rotulo}>Pronomes</Text>
      <Chips opcoes={PRONOMES} valor={valor.pronomes} onEscolher={(v) => onMudar({ ...valor, pronomes: v })} />

      <Text style={s.rotulo}>Status de relacionamento</Text>
      <Chips opcoes={STATUS_OPCOES.map((o) => o.rotulo)} valor={STATUS_OPCOES.find((o) => o.valor === valor.status)?.rotulo} onEscolher={(v) => onMudar({ ...valor, status: STATUS_OPCOES.find((o) => o.rotulo === v)?.valor })} />

      {tocouSensivel && (
        <TouchableOpacity style={s.consent} activeOpacity={0.8} onPress={() => onMudar({ ...valor, consentimento: !valor.consentimento })} accessibilityRole="checkbox" accessibilityState={{ checked: valor.consentimento }}>
          <View style={[s.checkbox, valor.consentimento && { backgroundColor: ROSA, borderColor: ROSA }]}>
            {valor.consentimento && <Feather name="check" size={12} color="#FFF" />}
          </View>
          <Text style={s.consentTxt}>
            Autorizo o tratamento destes <Text style={s.bold}>dados sensíveis</Text> (orientação sexual, identidade de gênero e status) apenas para personalizar a minha experiência. Eles ficam só comigo, não são vendidos nem mostrados a outras pessoas ou parceiros, e posso apagá-los quando quiser em Conta.
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const GRUPO = (id: string) => (GRUPOS_EVENTO.find((g) => g.id === id)?.tags || []).filter((t) => t !== 'Todos os públicos');
const EXPERIENCIAS_CADASTRO = ['Para dançar', 'Para conhecer pessoas', 'Para ir com amigos', 'Romântico', 'Cultural', 'Ao ar livre', 'Arte e diversidade', 'Orgulho LGBT+'];

export function PassoGostos({ valor, onMudar }: PassoProps) {
  const g = valor.gostos;
  return (
    <View>
      <Text style={s.titulo}>Seus gostos</Text>
      <Text style={s.sub}>Escolha o que você curte (pode marcar vários). Vamos usar isso para sugerir festas, lugares e roteiros do seu jeito.</Text>

      <Text style={s.rotulo}>Estilo musical</Text>
      <ChipsMulti opcoes={GRUPO('musica').slice(0, 16)} valores={g.musica} onMudar={(v) => onMudar({ ...valor, gostos: { ...g, musica: v } })} />

      <Text style={s.rotulo}>Experiências</Text>
      <ChipsMulti opcoes={EXPERIENCIAS_CADASTRO} valores={g.experiencia} onMudar={(v) => onMudar({ ...valor, gostos: { ...g, experiencia: v } })} />

      <Text style={s.rotulo}>Público que você curte encontrar</Text>
      <ChipsMulti opcoes={GRUPO('publico')} valores={g.publico} onMudar={(v) => onMudar({ ...valor, gostos: { ...g, publico: v } })} />
    </View>
  );
}

// Grava no banco (tabela privada) o que a pessoa escolheu. Sensíveis só com consentimento.
export async function salvarExtras(userId: string, extras: ExtrasCadastro): Promise<boolean> {
  const sens = extras.consentimento;
  const temGosto = extras.gostos.musica.length + extras.gostos.experiencia.length + extras.gostos.publico.length > 0;
  const limpa = (v?: string) => (v && v !== NAO_INFORMAR ? v : null);
  const temAlgo = temGosto || !!limpa(extras.pronomes) || (sens && (!!limpa(extras.orientacao) || !!limpa(extras.identidade) || !!extras.status));
  if (!temAlgo) return true;
  let ok = true;
  const { error } = await supabase.from('perfil_privado').upsert({
    user_id: userId,
    orientacao_sexual: sens ? limpa(extras.orientacao) : null,
    identidade_genero: sens ? limpa(extras.identidade) : null,
    pronomes: limpa(extras.pronomes),
    gostos: extras.gostos,
    consentimento_sensivel_em: sens ? new Date().toISOString() : null,
    atualizado_em: new Date().toISOString(),
  });
  if (error) ok = false; // migration 058 ainda não rodou: o app segue normalmente
  if (sens && extras.status) {
    const { error: e2 } = await supabase.from('profiles').update({ status_relacionamento: extras.status, mostrar_status_relacionamento: false }).eq('id', userId);
    if (e2) ok = false;
  }
  return ok;
}

// Cadastro com confirmação por e-mail: ainda não há sessão, então guardamos aqui e gravamos no 1º login.
export async function guardarPendente(extras: ExtrasCadastro) {
  try { await AsyncStorage.setItem(CHAVE_PENDENTE, JSON.stringify(extras)); } catch {}
}
export async function aplicarPendente(userId: string) {
  try {
    const bruto = await AsyncStorage.getItem(CHAVE_PENDENTE);
    if (!bruto) return;
    const extras = { ...EXTRAS_VAZIO, ...JSON.parse(bruto) } as ExtrasCadastro;
    if (await salvarExtras(userId, extras)) await AsyncStorage.removeItem(CHAVE_PENDENTE);
  } catch {}
}

const s = StyleSheet.create({
  titulo: { fontSize: 16, fontWeight: '800', color: '#FFFFFF', marginBottom: 4 },
  sub: { fontSize: 12, color: '#A0A0B2', lineHeight: 17, marginBottom: 14 },
  rotulo: { fontSize: 12, fontWeight: '800', color: '#A9A6BD', marginTop: 12, marginBottom: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1, borderColor: '#2E2E3D', backgroundColor: '#14141B' },
  chipTxt: { fontSize: 12, fontWeight: '700', color: '#D6D3E0' },
  consent: { flexDirection: 'row', gap: 10, marginTop: 18, padding: 12, borderRadius: 14, borderWidth: 1, borderColor: '#2E2E3D', backgroundColor: '#0F0F14' },
  checkbox: { width: 20, height: 20, borderRadius: 6, borderWidth: 2, borderColor: COR, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  consentTxt: { flex: 1, fontSize: 12, color: '#A0A0B2', lineHeight: 17 },
  bold: { fontWeight: '800', color: '#FFFFFF' },
});
