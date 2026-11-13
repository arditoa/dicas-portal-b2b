// Rodada 145 — aba Meu espaço: cartão do plano (degradê), perfil/equipe/senha em quadradinhos coloridos,
// ajuda e sair. Sem preço nem pagamento no app (regra Apple): plano se conversa com a equipe no WhatsApp.
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import FundoCaixaDegrade from '../../../components/FundoCaixaDegrade';
import { CP, GradeItens, TelaParceiro, TituloSecao, s } from '../../../components/parceiro/TelaParceiro';
import { useAuth } from '../../../lib/authContext';
import { useModoParceiro } from '../../../lib/modoParceiro';
import { falarComEquipe, itensDaAba, nivelDoPlano } from '../../../lib/parceiroMenu';

const PLANO: Record<string, { nome: string; cores: [string, string]; inclui: string[] }> = {
  fundador: { nome: 'Fundador', cores: ['#C8853C', '#7A3E8E'], inclui: ['Selo de Membro Fundador na Home', 'Banner na Home e na categoria', '4 destaques por mês em Eventos (festa ou agenda)', 'Cupom a cada 7 dias'] },
  premium: { nome: 'Premium', cores: ['#9B3CFF', '#E1306C'], inclui: ['Banner na Home e na categoria', '4 destaques por mês em Eventos (festa ou agenda)', 'Cupom a cada 7 dias'] },
  intermediario: { nome: 'Intermediário', cores: ['#3FA0A7', '#4B5BD6'], inclui: ['Página completa da casa', 'Cupom a cada 14 dias', 'Festas e agenda na aba Eventos'] },
  gratuito: { nome: 'Gratuito', cores: ['#3A3950', '#24223A'], inclui: ['Página da casa na busca e no mapa', 'Festas e agenda na aba Eventos'] },
};

export default function MeuEspaco() {
  const router = useRouter();
  const { signOut } = useAuth();
  const { localAtivo, pode, definirModo } = useModoParceiro();
  const [verPlano, setVerPlano] = useState(false);
  if (!localAtivo) return null;
  const itens = itensDaAba('espaco', localAtivo, pode).filter((i) => i.chave !== 'senha');
  const podeSenha = localAtivo.papel !== 'porta_pin';
  const dono = localAtivo.papel === 'dono';
  const chavePlano = localAtivo.plano_comercial && PLANO[localAtivo.plano_comercial] ? localAtivo.plano_comercial : 'gratuito';
  const plano = PLANO[chavePlano];
  const topo = nivelDoPlano(localAtivo.plano_comercial) === 'premium';
  // Plano contratado que ainda não vale (interesse, aguardando pagamento, cancelado): o app trata como Gratuito
  // e diz por quê na linha de cima do cartão, sem mudar o layout.
  const STATUS: Record<string, string> = { interesse: 'em conversa', aguardando_pagamento: 'aguardando pagamento', cancelado: 'cancelado' };
  const contratado = localAtivo.plano_contratado && localAtivo.plano_contratado !== localAtivo.plano_comercial && PLANO[localAtivo.plano_contratado]
    ? `${PLANO[localAtivo.plano_contratado].nome} ${STATUS[localAtivo.plano_comercial_status || ''] || 'ainda não ativo'}`
    : null;

  const sair = () =>
    Alert.alert('Sair da conta', 'Você vai precisar entrar de novo com WhatsApp ou e-mail e senha.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: () => { void signOut(); router.replace('/(tabs)'); } },
    ]);

  return (
    <TelaParceiro titulo="Meu espaço" subtitulo="Seu plano, sua página e quem da equipe pode fazer o quê.">
      {dono && (
        <View style={m.plano}>
          <FundoCaixaDegrade id={`plano-${chavePlano}`} cores={plano.cores} />
          {/* Compacto: nome do plano numa linha; toque abre o que inclui (vende sem ocupar a tela) */}
          <TouchableOpacity style={m.planoTopo} onPress={() => setVerPlano((v) => !v)} activeOpacity={0.85} accessibilityRole="button" accessibilityLabel={`Plano ${plano.nome}. Toque para ver o que inclui`}>
            <View style={m.planoIcone}><Feather name="award" size={16} color="#FFFFFF" /></View>
            <View style={{ flex: 1 }}>
              <Text style={m.planoRotulo} numberOfLines={1}>{contratado ? `Seu plano · ${contratado}` : 'Seu plano'}</Text>
              <Text style={m.planoNome}>{plano.nome}</Text>
            </View>
            <Text style={m.planoVer}>{verPlano ? 'Fechar' : 'O que inclui'}</Text>
            <Feather name={verPlano ? 'chevron-up' : 'chevron-down'} size={16} color="#FFFFFF" />
          </TouchableOpacity>
          {verPlano && (
            <>
              {plano.inclui.map((t) => (
                <View key={t} style={m.incluiLinha}>
                  <Feather name="check" size={13} color="#FFFFFF" />
                  <Text style={m.incluiTxt}>{t}</Text>
                </View>
              ))}
              <TouchableOpacity
                style={m.planoBotao}
                onPress={() => void falarComEquipe(`Olá! Sou do ${localAtivo.nome} e queria conversar sobre o meu plano no Dicas LGBT+.`)}
                accessibilityRole="button"
              >
                <Text style={m.planoBotaoTxt}>{topo ? 'Falar com a equipe' : 'Quero mais destaque · falar com a equipe'}</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      )}

      {itens.length > 0 && (
        <>
          <TituloSecao texto="Sua casa no app" />
          <GradeItens itens={itens} colorido />
        </>
      )}

      <TituloSecao texto="Ajuda e conta" />
      <View style={s.cartaoLista}>
        <TouchableOpacity style={s.linha} onPress={() => void falarComEquipe(`Olá! Sou do ${localAtivo.nome} e preciso de ajuda com o app (Modo parceiro).`)}>
          <View style={[s.linhaIcone, { backgroundColor: CP.verde }]}><Feather name="message-circle" size={17} color="#FFFFFF" /></View>
          <View style={{ flex: 1 }}>
            <Text style={s.linhaTitulo}>Falar com a equipe Dicas</Text>
            <Text style={s.linhaSub}>Dúvidas sobre o app e o portal</Text>
          </View>
          <Feather name="external-link" size={16} color={CP.fraco} />
        </TouchableOpacity>
        {podeSenha && (
          <TouchableOpacity style={[s.linha, s.linhaBorda]} onPress={() => router.push('/parceiro/trocar-senha')}>
            <View style={[s.linhaIcone, { backgroundColor: '#3FA0A7' }]}><Feather name="lock" size={17} color="#FFFFFF" /></View>
            <View style={{ flex: 1 }}>
              <Text style={s.linhaTitulo}>Trocar minha senha</Text>
              <Text style={s.linhaSub}>Vale no app e no portal</Text>
            </View>
            <Feather name="chevron-right" size={18} color={CP.fraco} />
          </TouchableOpacity>
        )}
        <TouchableOpacity style={[s.linha, s.linhaBorda]} onPress={() => { definirModo('cliente'); router.replace('/(tabs)'); }}>
          <View style={[s.linhaIcone, { backgroundColor: '#4B5BD6' }]}><Feather name="smartphone" size={17} color="#FFFFFF" /></View>
          <View style={{ flex: 1 }}>
            <Text style={s.linhaTitulo}>Ver o app como cliente</Text>
            <Text style={s.linhaSub}>Volte pela aba Conta › Área do parceiro</Text>
          </View>
          <Feather name="chevron-right" size={18} color={CP.fraco} />
        </TouchableOpacity>
        <TouchableOpacity style={[s.linha, s.linhaBorda]} onPress={sair}>
          <View style={[s.linhaIcone, { backgroundColor: '#FF525226' }]}><Feather name="log-out" size={17} color="#FF7A7A" /></View>
          <View style={{ flex: 1 }}><Text style={[s.linhaTitulo, { color: '#FF7A7A' }]}>Sair da conta</Text></View>
        </TouchableOpacity>
      </View>
    </TelaParceiro>
  );
}

const m = StyleSheet.create({
  plano: { borderRadius: 16, overflow: 'hidden', paddingHorizontal: 14, paddingVertical: 12, backgroundColor: CP.card, marginTop: 16 },
  planoTopo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  planoVer: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
  planoIcone: { width: 34, height: 34, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  planoRotulo: { color: 'rgba(255,255,255,0.85)', fontSize: 10, fontWeight: '800', letterSpacing: 1.2, textTransform: 'uppercase' },
  planoNome: { color: '#FFFFFF', fontSize: 17, fontWeight: '800' },
  incluiLinha: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  incluiTxt: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
  planoBotao: { backgroundColor: '#FFFFFF', borderRadius: 12, minHeight: 42, alignItems: 'center', justifyContent: 'center', marginTop: 14 },
  planoBotaoTxt: { color: '#1A0F1F', fontSize: 13, fontWeight: '800' },
});
