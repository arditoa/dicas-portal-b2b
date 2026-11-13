// Rodada 145 — moldura comum das abas do Modo parceiro:
//   logo + "Área do parceiro" discreto embaixo · "Ver como cliente" · cartão do local (nome, acesso e plano;
//   quem tem mais de um local troca por aqui) · título discreto da aba.
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Modal, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MarcaApp from '../MarcaApp';
import { abrirItem, falarComEquipe, ItemParceiro } from '../../lib/parceiroMenu';
import { NOME_PAPEL, useModoParceiro } from '../../lib/modoParceiro';

export const CP = {
  bg: '#0B0B0E', card: '#161520', borda: '#232230', texto: '#FFFFFF', dim: '#A0A0B2', fraco: '#626274',
  secao: '#B9B6CC', rosa: '#E1306C', verde: '#4CAF7D',
};
// Régua única de espaçamento e cantos do Modo parceiro (múltiplos de 4).
//   entre caixas = 8 · dentro das caixas = 12/14 · entre seções = 24 · margem da tela = 16
export const ESP = { xs: 4, s: 8, m: 12, l: 16, xl: 24 };
export const RAIO = { s: 12, m: 16, l: 20 };
const NOME_PLANO: Record<string, string> = { fundador: 'Fundador', premium: 'Premium', intermediario: 'Intermediário' };
const iniciais = (n: string) => n.split(/\s+/).filter((p) => p.length > 2).slice(0, 2).map((p) => p[0]).join('').toUpperCase() || n.slice(0, 2).toUpperCase();

export function TelaParceiro({
  titulo, subtitulo, children, atualizando, aoAtualizar,
}: { titulo?: string; subtitulo?: string; children: React.ReactNode; atualizando?: boolean; aoAtualizar?: () => void }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { definirModo, localAtivo, locais, escolherLocal } = useModoParceiro();
  const [escolhendo, setEscolhendo] = useState(false);
  const verComoCliente = () => {
    definirModo('cliente');
    router.replace('/(tabs)');
  };
  const varios = locais.length > 1;
  const trocarLocal = () => {
    if (varios) return setEscolhendo(true);
    Alert.alert('Trocar de local', 'Você tem apenas um local cadastrado. Tem outro bar, festa ou espaço? A equipe cadastra para você e ele aparece aqui.', [
      { text: 'Agora não', style: 'cancel' },
      { text: 'Cadastrar outro local', onPress: () => void falarComEquipe(`Olá! Sou do ${localAtivo?.nome || 'meu local'} e quero cadastrar outro local no Dicas LGBT+.`) },
    ]);
  };
  const plano = localAtivo?.plano_comercial ? NOME_PLANO[localAtivo.plano_comercial] : undefined;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: CP.bg }}
      contentContainerStyle={{ paddingTop: insets.top + ESP.s, paddingBottom: ESP.xl + ESP.s, paddingHorizontal: ESP.l }}
      refreshControl={aoAtualizar ? <RefreshControl refreshing={!!atualizando} onRefresh={aoAtualizar} tintColor={CP.rosa} /> : undefined}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <View style={s.topo}>
        <View>
          <MarcaApp semFrase />
          <View style={s.area}>
            <View style={s.areaPonto} />
            <Text style={s.areaTexto}>Área do parceiro</Text>
          </View>
        </View>
        <TouchableOpacity onPress={verComoCliente} style={s.pilula} accessibilityRole="button">
          <Feather name="smartphone" size={13} color={CP.texto} />
          <Text style={s.pilulaTexto}>Ver como cliente</Text>
        </TouchableOpacity>
      </View>

      {/* Cartão do local: em todas as abas; troca de local quando a conta tem mais de um */}
      {localAtivo && (
        <TouchableOpacity
          style={s.local}
          onPress={trocarLocal}
          activeOpacity={0.85}
          accessibilityLabel={`${localAtivo.nome}. Toque para trocar de local`}
        >
          <View style={s.localAvatar}><Text style={s.localAvatarTxt}>{iniciais(localAtivo.nome)}</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={s.localNome} numberOfLines={1}>{localAtivo.nome}</Text>
            <Text style={s.localSub} numberOfLines={1}>
              {NOME_PAPEL[localAtivo.papel] || 'Equipe'}{plano ? ` · Plano ${plano}` : ''}{varios ? ` · ${locais.length} locais` : ''}
            </Text>
          </View>
          <View style={s.trocar}><Text style={s.trocarTxt}>Trocar</Text><Feather name="chevron-down" size={14} color={CP.rosa} /></View>
        </TouchableOpacity>
      )}

      {/* Título da página: grande, com uma linha dizendo para que serve a aba */}
      {!!titulo && (
        <View style={s.pagina}>
          <Text style={s.paginaTitulo}>{titulo}</Text>
          {!!subtitulo && <Text style={s.paginaSub}>{subtitulo}</Text>}
        </View>
      )}
      {children}

      <Modal visible={escolhendo} transparent animationType="fade" onRequestClose={() => setEscolhendo(false)}>
        <TouchableOpacity style={s.fundo} activeOpacity={1} onPress={() => setEscolhendo(false)}>
          <TouchableOpacity activeOpacity={1} style={s.folha}>
            <Text style={[s.secaoTitulo, { marginBottom: 10 }]}>Escolha o local</Text>
            {locais.map((l, i) => {
              const ativo = l.local_id === localAtivo?.local_id;
              return (
                <TouchableOpacity key={l.local_id} style={[s.linha, i > 0 && s.linhaBorda]} onPress={() => { escolherLocal(l.local_id); setEscolhendo(false); }}>
                  <View style={[s.localAvatar, { width: 36, height: 36 }]}><Text style={[s.localAvatarTxt, { fontSize: 12 }]}>{iniciais(l.nome)}</Text></View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.linhaTitulo, ativo && { color: CP.rosa }]}>{l.nome}</Text>
                    <Text style={s.linhaSub}>{NOME_PAPEL[l.papel] || 'Equipe'}</Text>
                  </View>
                  {ativo && <Feather name="check" size={18} color={CP.rosa} />}
                </TouchableOpacity>
              );
            })}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </ScrollView>
  );
}

// `info`: explicação curta que abre ao tocar no (i) — tira texto corrido da tela.
export function TituloSecao({ texto, direita, info }: { texto: string; direita?: React.ReactNode; info?: string }) {
  return (
    <View style={s.secaoLinha}>
      {info ? (
        <TouchableOpacity style={s.secaoInfo} onPress={() => Alert.alert(texto, info)} accessibilityRole="button" accessibilityLabel={`${texto}. Toque para saber mais`}>
          <Text style={s.secaoTitulo}>{texto}</Text>
          <Feather name="info" size={13} color={CP.fraco} />
        </TouchableOpacity>
      ) : (
        <Text style={s.secaoTitulo}>{texto}</Text>
      )}
      {direita}
    </View>
  );
}

export function ListaItens({ itens, vazio }: { itens: ItemParceiro[]; vazio?: string }) {
  const router = useRouter();
  const { localAtivo } = useModoParceiro();
  if (!itens.length) return <Text style={s.vazio}>{vazio || 'Nada por aqui para o seu acesso.'}</Text>;
  return (
    <View style={s.cartaoLista}>
      {itens.map((i, idx) => (
        <TouchableOpacity key={i.chave} style={[s.linha, idx > 0 && s.linhaBorda]} onPress={() => abrirItem(router, i, localAtivo?.nome)} accessibilityRole="button">
          <View style={[s.linhaIcone, { backgroundColor: i.cor + '26' }]}><Feather name={i.icone} size={17} color={i.cor} /></View>
          <View style={{ flex: 1 }}>
            <Text style={s.linhaTitulo}>{i.titulo}</Text>
            <Text style={s.linhaSub}>{i.sub}</Text>
          </View>
          <Feather name="chevron-right" size={18} color={CP.fraco} />
        </TouchableOpacity>
      ))}
    </View>
  );
}

// Quadradinhos com ícone grande (2 por linha): mais rápido de achar com o celular numa mão.
// `colorido`: fundo na cor do item (Meu espaço). Selo = o que o plano inclui; cadeado = plano atual não inclui.
export function GradeItens({ itens, vazio, colorido, compacto }: { itens: ItemParceiro[]; vazio?: string; colorido?: boolean; compacto?: boolean }) {
  const router = useRouter();
  const { localAtivo } = useModoParceiro();
  if (!itens.length) return <Text style={s.vazio}>{vazio || 'Nada por aqui para o seu acesso.'}</Text>;
  return (
    <View style={s.grade}>
      {itens.map((i) => (
        <TouchableOpacity
          key={i.chave}
          style={[s.quad, compacto && s.quadCompacto, colorido && { backgroundColor: i.cor + '1C', borderColor: i.cor + '55' }, i.bloqueado && { opacity: 0.78 }]}
          onPress={() => abrirItem(router, i, localAtivo?.nome)}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={`${i.titulo}. ${i.sub}${i.bloqueado ? '. Não incluído no seu plano' : ''}`}
        >
          <View style={s.quadTopo}>
            <View style={[s.quadIcone, { backgroundColor: colorido ? i.cor : i.cor + '26' }]}>
              <Feather name={i.icone} size={24} color={colorido ? '#FFFFFF' : i.cor} />
            </View>
            {i.bloqueado && <View style={s.cadeado}><Feather name="lock" size={12} color="#FFFFFF" /></View>}
          </View>
          <Text style={s.quadTitulo} numberOfLines={2}>{i.titulo}</Text>
          {!compacto && <Text style={s.quadSub} numberOfLines={2}>{i.sub}</Text>}
          {!!i.selo && (() => {
            const cor = i.bloqueado ? CP.dim : i.seloTom === 'ok' ? '#5BD69A' : i.seloTom === 'alerta' ? '#FF6B9A' : i.seloTom === 'neutro' ? CP.dim : i.cor;
            return (
              <View style={[s.selo, { backgroundColor: i.bloqueado || i.seloTom === 'neutro' ? '#2A2938' : cor + '26' }]}>
                {i.seloTom === 'ok' && <Feather name="check" size={10} color={cor} />}
                {i.seloTom === 'alerta' && <Feather name="alert-circle" size={10} color={cor} />}
                <Text style={[s.seloTxt, { color: cor }]} numberOfLines={1}>{i.selo}</Text>
              </View>
            );
          })()}
        </TouchableOpacity>
      ))}
    </View>
  );
}

export const s = StyleSheet.create({
  topo: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', minHeight: 44 },
  area: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 7 },
  areaPonto: { width: 6, height: 6, borderRadius: 3, backgroundColor: CP.rosa },
  areaTexto: { color: CP.secao, fontSize: 10, fontWeight: '700', letterSpacing: 1.6, textTransform: 'uppercase' },
  pilula: {
    flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: CP.card, borderColor: CP.borda, borderWidth: 1,
    borderRadius: 18, paddingHorizontal: 11, height: 36,
  },
  pilulaTexto: { color: CP.texto, fontSize: 12, fontWeight: '700' },

  local: {
    flexDirection: 'row', alignItems: 'center', gap: ESP.m, marginTop: ESP.m, backgroundColor: CP.card,
    borderColor: CP.borda, borderWidth: 1, borderRadius: RAIO.m, paddingHorizontal: ESP.m, paddingVertical: ESP.s, minHeight: 56,
  },
  localAvatar: { width: 38, height: 38, borderRadius: 11, backgroundColor: '#2A1420', alignItems: 'center', justifyContent: 'center' },
  localAvatarTxt: { color: CP.rosa, fontSize: 14, fontWeight: '800' },
  localNome: { color: CP.texto, fontSize: 15, fontWeight: '800' },
  localSub: { color: CP.dim, fontSize: 12, marginTop: 1 },
  trocar: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#2A1420', borderRadius: 12, paddingHorizontal: 9, height: 28 },
  trocarTxt: { color: CP.rosa, fontSize: 11, fontWeight: '800' },

  fundo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 24 },
  folha: { backgroundColor: '#14131C', borderRadius: 18, padding: 16, borderColor: CP.borda, borderWidth: 1 },

  pagina: { marginTop: ESP.xl, marginBottom: ESP.xs },
  // Mesma família visual do "EVENTOS"/"AGENDA DE HOJE" do app cliente (maiúsculas espaçadas), só que maior.
  paginaTitulo: { color: '#DCD9EC', fontSize: 17, fontWeight: '800', letterSpacing: 2.4, textTransform: 'uppercase' },
  paginaSub: { color: CP.dim, fontSize: 13, lineHeight: 19, marginTop: 6 },

  grade: { flexDirection: 'row', flexWrap: 'wrap', gap: ESP.s },
  quad: { width: '48%', flexGrow: 1, backgroundColor: CP.card, borderColor: CP.borda, borderWidth: 1, borderRadius: RAIO.m, padding: 14, minHeight: 124 },
  quadCompacto: { minHeight: 0, paddingVertical: 12 },
  secaoInfo: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 32 },
  quadTopo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cadeado: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#3A3950', alignItems: 'center', justifyContent: 'center' },
  selo: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3, marginTop: 8 },
  seloTxt: { fontSize: 10, fontWeight: '800', letterSpacing: 0.2 },
  quadIcone: { width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  quadTitulo: { color: CP.texto, fontSize: 15, fontWeight: '800', marginTop: ESP.m, lineHeight: 19 },
  quadSub: { color: CP.dim, fontSize: 11, marginTop: 3, lineHeight: 15 },
  secaoLinha: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: ESP.xl, marginBottom: ESP.m - 2, minHeight: 24 },
  // Igual ao "Agenda de hoje" (events.tsx) e ao "Membros Fundadores" da Home.
  secaoTitulo: { fontSize: 12, fontWeight: '700', letterSpacing: 1.4, textTransform: 'uppercase', color: CP.secao },
  vazio: { color: CP.dim, fontSize: 13, lineHeight: 19 },
  cartaoLista: { backgroundColor: CP.card, borderColor: CP.borda, borderWidth: 1, borderRadius: RAIO.m, overflow: 'hidden' },
  linha: { flexDirection: 'row', alignItems: 'center', gap: ESP.m, paddingHorizontal: ESP.m, paddingVertical: 10, minHeight: 60 },
  linhaBorda: { borderTopColor: CP.borda, borderTopWidth: StyleSheet.hairlineWidth },
  linhaIcone: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  linhaTitulo: { color: CP.texto, fontSize: 14, fontWeight: '700' },
  linhaSub: { color: CP.dim, fontSize: 12, marginTop: 1 },
});
