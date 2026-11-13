// Rodada 145 — o que aparece em cada aba do Modo parceiro (Divulgar / Fidelizar / Meu espaço).
// Uma lista só, usada pelas abas e pelas ações rápidas do Início. Respeita a categoria do local
// (espelho de POR_CATEGORIA do portal) e as permissões de quem entrou.
import { Feather } from '@expo/vector-icons';
import { Alert, Linking } from 'react-native';
import { LocalDoParceiro, Permissao, recursosDaCategoria } from './modoParceiro';

export type IconeFeather = keyof typeof Feather.glyphMap;
export type ItemParceiro = {
  chave: string;
  titulo: string;
  sub: string;
  icone: IconeFeather;
  cor: string;
  rota?: string; // tela pronta no app; sem rota = ainda no portal
  selo?: string; // etiqueta curta no quadradinho ("4 por mês", "Planos pagos")
  bloqueado?: boolean; // o plano atual não inclui: mostra cadeado e explica (sem preço — regra Apple)
  portal?: string; // caminho da mesma tela no portal do parceiro, enquanto a do app não fica pronta
  seloTom?: 'ok' | 'alerta' | 'neutro'; // cor da etiqueta quando ela é a situação (em dia, falta, liberado)
  aviso?: string; // mensagem própria ao tocar (ex.: banner atual e há quantos dias foi trocado)
};

export const URL_PORTAL = 'https://dicas-portal-b2b-dun.vercel.app';
// Telas do portal equivalentes a cada item (usadas no aviso "ainda no portal").
const NO_PORTAL: Record<string, string> = {
  festa: '/dashboard/eventos/novo', eventos: '/dashboard/eventos', agenda: '/dashboard/agenda', cupons: '/dashboard/cupons',
  banner: '/dashboard/destaques', destaque_festa: '/dashboard/destaques', checkins: '/dashboard/checkins',
  fidelidade: '/dashboard/fidelidade', vip: '/dashboard/fidelidade', pagina: '/dashboard/perfil',
};

// Quem vê o quê na vitrine do app, por plano (espelho das regras do portal B2B).
export type NivelPlano = 'gratuito' | 'intermediario' | 'premium';
export function nivelDoPlano(plano?: string | null): NivelPlano {
  if (plano === 'fundador' || plano === 'premium') return 'premium';
  if (plano === 'intermediario') return 'intermediario';
  return 'gratuito';
}
export const NOME_NIVEL: Record<NivelPlano, string> = {
  gratuito: 'Gratuito',
  intermediario: 'Intermediário',
  premium: 'Premium / Fundador',
};
export const WHATSAPP_EQUIPE = '5511942942028';
export async function falarComEquipe(texto: string) {
  const t = encodeURIComponent(texto);
  const app = `whatsapp://send?phone=${WHATSAPP_EQUIPE}&text=${t}`;
  try {
    if (await Linking.canOpenURL(app)) await Linking.openURL(app);
    else await Linking.openURL(`https://api.whatsapp.com/send?phone=${WHATSAPP_EQUIPE}&text=${t}`);
  } catch {
    Alert.alert('WhatsApp', 'Não foi possível abrir o WhatsApp agora.');
  }
}
export type Aba = 'operacao' | 'divulgar' | 'fidelizar' | 'espaco';

export function itensDaAba(aba: Aba, local: LocalDoParceiro, pode: (p: Permissao) => boolean): ItemParceiro[] {
  const r = recursosDaCategoria(local.categoria);
  const ehFesta = local.categoria === 'eventos';
  const dono = local.papel === 'dono';
  const desconto = r.cupom === 'desconto';
  const nivel = nivelDoPlano(local.plano_comercial);
  const itens: (ItemParceiro & { mostrar: boolean })[] =
    aba === 'operacao'
      ? [
          // Operação da noite (aba Aprovações): o que precisa de resposta na hora.
          { chave: 'porta', titulo: 'Abrir a porta', sub: 'Ler QR e confirmar entrada', icone: 'maximize', cor: '#E1306C', rota: '/parceiro/porta', mostrar: pode('porta') && r.listaVip },
          { chave: 'lista', titulo: 'Lista VIP', sub: 'Aprovar e recusar pedidos', icone: 'users', cor: '#7E57C2', rota: '/parceiro/aprovacoes', mostrar: pode('lista_vip') && r.listaVip },
          { chave: 'checkins', titulo: 'Check-ins', sub: 'Confirmar quem chegou', icone: 'check-circle', cor: '#4CAF7D', rota: '/parceiro/aprovacoes', mostrar: pode('checkins') && r.checkins },
        ]
      : aba === 'divulgar'
      ? [
          { chave: 'festa', titulo: 'Nova festa', sub: 'Flyer, data e Lista VIP', icone: 'plus-circle', cor: '#9B3CFF', mostrar: pode('festa') && r.eventos },
          { chave: 'eventos', titulo: ehFesta ? 'Minhas festas' : 'Meus eventos', sub: 'Criar, editar, repetir e destacar', icone: 'star', cor: '#9B3CFF', mostrar: pode('festa') && r.eventos },
          { chave: 'agenda', titulo: 'Agenda da semana', sub: 'O que rola em cada dia', icone: 'calendar', cor: '#3FA0A7', rota: '/parceiro/agenda', mostrar: pode('festa') && r.agenda },
          { chave: 'cupons', titulo: desconto ? 'Cupons de desconto' : 'Cupons', sub: 'Na página da casa e na busca', icone: 'tag', cor: '#F2A900',
            selo: nivel === 'premium' ? '1 a cada 7 dias' : nivel === 'intermediario' ? '1 a cada 14 dias' : 'Planos pagos',
            bloqueado: nivel === 'gratuito', mostrar: pode('cupons') && r.cupom !== false },
          { chave: 'banner', titulo: 'Banner', sub: 'Na Home e no topo da categoria', icone: 'image', cor: '#E07A5F',
            selo: nivel === 'premium' ? 'Incluído' : 'Premium / Fundador', bloqueado: nivel !== 'premium', mostrar: pode('banner') && !ehFesta },
        ]
      : aba === 'fidelizar'
      ? [
          { chave: 'clientes', titulo: 'Clientes VIP', sub: 'Quem mais vem e aniversários', icone: 'users', cor: '#C8853C', rota: '/parceiro/clientes', mostrar: pode('resultados') && (r.checkins || r.listaVip) },
          { chave: 'checkins', titulo: 'Histórico de visitas', sub: 'Check-ins e cupons usados', icone: 'clock', cor: '#4CAF7D', mostrar: pode('checkins') && r.checkins },
          { chave: 'fidelidade', titulo: 'Cartão fidelidade', sub: 'Meta de visitas e brinde', icone: 'gift', cor: '#E1306C', mostrar: dono && r.fidelidade },
          { chave: 'vip', titulo: 'Nível VIP', sub: 'Benefício para quem vem sempre', icone: 'award', cor: '#C8853C', mostrar: dono && r.fidelidade },
        ]
      : [
          { chave: 'pagina', titulo: 'Minha página', sub: 'Fotos, textos, horários e Instagram', icone: 'home', cor: '#E1306C', mostrar: dono },
          { chave: 'reservas', titulo: 'Reservas', sub: 'Áreas do quiz, horários e como receber', icone: 'bookmark', cor: '#4B5BD6', rota: '/parceiro/reservas',
            selo: nivel === 'gratuito' ? 'Planos pagos' : undefined, bloqueado: nivel === 'gratuito', mostrar: dono && r.reservas },
          { chave: 'equipe', titulo: 'Equipe e senha da porta', sub: 'Quem pode fazer o quê', icone: 'shield', cor: '#7E57C2', mostrar: dono },
          { chave: 'plano', titulo: 'Meu plano', sub: 'O que está incluído', icone: 'award', cor: '#C8853C', rota: '/parceiro/espaco', mostrar: false },
          { chave: 'senha', titulo: 'Trocar minha senha', sub: 'Vale no app e no portal', icone: 'lock', cor: '#3FA0A7', rota: '/parceiro/trocar-senha', mostrar: local.papel !== 'porta_pin' },
        ];
  return itens.filter((i) => i.mostrar).map(({ mostrar: _m, ...i }) => ({ ...i, portal: i.rota ? undefined : NO_PORTAL[i.chave] }));
}

export function abrirItem(router: { push: (r: any) => void }, item: ItemParceiro, nomeLocal?: string) {
  if (item.bloqueado) {
    return Alert.alert(
      item.titulo,
      item.chave === 'banner'
        ? 'O banner aparece na Home e no topo da categoria e está incluído nos planos Premium e Fundador.'
        : item.chave === 'reservas'
        ? 'Com reserva, o cliente escolhe a área (rooftop, salão, sacada…), o dia e o horário pelo app, ou chama vocês no WhatsApp. Está incluída nos planos pagos.'
        : 'Os cupons aparecem na página da casa e na busca e estão incluídos nos planos pagos.',
      [
        { text: 'Agora não', style: 'cancel' },
        { text: 'Falar com a equipe', onPress: () => void falarComEquipe(`Olá! Sou do ${nomeLocal || 'meu local'} e quero saber como liberar "${item.titulo}" no app.`) },
      ],
    );
  }
  if (item.rota) return router.push(item.rota);
  // Ainda sem tela no app: leva direto para a mesma tela no portal (mesmo login), ou para a equipe.
  if (item.portal) {
    return Alert.alert(item.titulo, item.aviso || 'Chega no app na próxima versão. Por enquanto, faça pelo portal do parceiro: entra com o mesmo WhatsApp e senha.', [
      { text: 'Agora não', style: 'cancel' },
      { text: item.chave === 'banner' ? 'Trocar no portal' : 'Abrir no portal', onPress: () => void Linking.openURL(URL_PORTAL + item.portal) },
    ]);
  }
  Alert.alert(item.titulo, 'Chega no app na próxima versão. Enquanto isso, a equipe Dicas faz para você.', [
    { text: 'Agora não', style: 'cancel' },
    { text: 'Falar com a equipe', onPress: () => void falarComEquipe(`Olá! Sou do ${nomeLocal || 'meu local'} e preciso de ajuda com: ${item.titulo}.`) },
  ]);
}
