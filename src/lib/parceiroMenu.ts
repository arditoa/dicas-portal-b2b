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
  cota?: { rotulo: string; usadas: number; limite: number }; // 18/11: destaques do plano no próprio quadradinho (agenda/evento)
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
// Recebe o plano EFETIVO (LocalDoParceiro.plano_comercial já vem calculado por planoEfetivo em modoParceiro):
// plano pago fora do status 'ativo' chega aqui como null e vira Gratuito.
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
// Mesma frase no portal (dashboard/cupons) e na trava do banco (migração 104).
export const MSG_CUPOM_PLANO_PAGO = 'Os cupons aparecem na página da casa e na busca e estão incluídos nos planos pagos.';
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
  // Etapa 6 — aparelho da porta (código + senha): só Aprovações e Meu espaço. Sem itens, Divulgar e Fidelizar somem.
  if (local.papel === 'porta_pin' && (aba === 'divulgar' || aba === 'fidelizar')) return [];
  const itens: (ItemParceiro & { mostrar: boolean })[] =
    aba === 'operacao'
      ? [
          // Operação da noite (aba Aprovações): o que precisa de resposta na hora.
          { chave: 'porta', titulo: 'Abrir a porta', sub: 'Ler QR e confirmar entrada', icone: 'maximize', cor: '#E1306C', rota: '/parceiro/porta', mostrar: pode('porta') && r.listaVip },
          { chave: 'lista', titulo: 'Lista VIP', sub: 'Aprovar e recusar pedidos', icone: 'users', cor: '#7E57C2', rota: '/parceiro/aprovacoes', mostrar: pode('lista_vip') && r.listaVip },
          // Rodada 148 — Gratuito: só Lista VIP. Check-in e fidelidade nos planos pagos (migração 120).
          { chave: 'checkins', titulo: 'Check-ins', sub: 'Confirmar quem chegou', icone: 'check-circle', cor: '#4CAF7D', rota: '/parceiro/aprovacoes',
            selo: nivel === 'gratuito' ? 'Planos pagos' : undefined, bloqueado: nivel === 'gratuito', mostrar: pode('checkins') && r.checkins },
        ]
      : aba === 'divulgar'
      ? [
          { chave: 'festa', titulo: 'Nova festa', sub: 'Flyer, data e Lista VIP', icone: 'plus-circle', cor: '#9B3CFF', rota: '/parceiro/festa-editar', mostrar: pode('festa') && r.eventos },
          { chave: 'eventos', titulo: ehFesta ? 'Minhas festas' : 'Meus eventos', sub: 'Criar, editar, repetir e destacar', icone: 'star', cor: '#9B3CFF', rota: '/parceiro/festas', mostrar: pode('festa') && r.eventos },
          { chave: 'agenda', titulo: 'Agenda da semana', sub: 'O que rola em cada dia', icone: 'calendar', cor: '#3FA0A7', rota: '/parceiro/agenda', mostrar: pode('festa') && r.agenda },
          // Gratuito NÃO cria cupom (decisão da Andrea, 13/11/2026): cadeado aqui, no portal e no banco (migração 104).
          { chave: 'cupons', titulo: desconto ? 'Cupons de desconto' : 'Cupons', sub: 'Na página da casa e na busca', icone: 'tag', cor: '#F2A900', rota: '/parceiro/cupons',
            selo: nivel === 'premium' ? '1 a cada 7 dias' : nivel === 'intermediario' ? '1 a cada 14 dias' : 'Planos pagos',
            bloqueado: nivel === 'gratuito', mostrar: pode('cupons') && r.cupom !== false },
          { chave: 'banner', titulo: 'Banner', sub: 'Na Home e no topo da categoria', icone: 'image', cor: '#E07A5F', rota: '/parceiro/banner',
            selo: nivel === 'premium' ? 'Incluído' : 'Premium / Fundador', bloqueado: nivel !== 'premium', mostrar: pode('banner') && !ehFesta },
          // Rodada 148 — patrocínio de uma marca na casa (migrações 117–119): selo "Apoio" no app e resultado medido.
          { chave: 'marcas', titulo: 'Ação de marca', sub: 'Patrocínio de uma marca, com resultado', icone: 'award', cor: '#F2C94C', rota: '/parceiro/acoes-marca',
            selo: nivel === 'premium' ? 'Incluído' : 'Premium / Fundador', bloqueado: nivel !== 'premium', mostrar: pode('cupons') || pode('festa') || pode('resultados') },
          // Migração 131 — ingressos vendidos no app (Mercado Pago), QR lido no modo porta. Todos os planos (Gratuito com taxa maior).
          { chave: 'ingressos', titulo: 'Ingressos', sub: 'Venda pelo app e receba direto', icone: 'credit-card', cor: '#009EE3', rota: '/parceiro/ingressos', mostrar: pode('festa') && r.eventos },
          // Migração 129 — "Responda e ganhe": enquete da casa com prêmio retirado na casa.
          { chave: 'enquetes', titulo: 'Enquete com prêmio', sub: 'Responda e ganhe: o que o público pensa', icone: 'message-square', cor: '#34D399', rota: '/parceiro/enquetes',
            selo: nivel === 'premium' ? 'Incluído' : 'Premium / Fundador', bloqueado: nivel !== 'premium', mostrar: pode('cupons') || pode('resultados') },
        ]
      : aba === 'fidelizar'
      ? [
          { chave: 'clientes', titulo: 'Clientes VIP', sub: 'Quem mais vem e aniversários', icone: 'users', cor: '#C8853C', rota: '/parceiro/clientes', mostrar: pode('resultados') && (r.checkins || r.listaVip) },
          { chave: 'checkins', titulo: 'Histórico de visitas', sub: 'Check-ins e cupons usados', icone: 'clock', cor: '#4CAF7D', rota: '/parceiro/historico',
            selo: nivel === 'gratuito' ? 'Planos pagos' : undefined, bloqueado: nivel === 'gratuito', mostrar: pode('checkins') && r.checkins },
          { chave: 'fidelidade', titulo: 'Cartão fidelidade', sub: 'Meta de visitas e brinde', icone: 'gift', cor: '#E1306C', rota: '/parceiro/fidelidade',
            selo: nivel === 'gratuito' ? 'Planos pagos' : undefined, bloqueado: nivel === 'gratuito', mostrar: dono && r.fidelidade },
          { chave: 'vip', titulo: 'Nível VIP', sub: 'Benefício para quem vem sempre', icone: 'award', cor: '#C8853C', rota: '/parceiro/fidelidade',
            selo: nivel === 'gratuito' ? 'Planos pagos' : undefined, bloqueado: nivel === 'gratuito', mostrar: dono && r.fidelidade },
          // Rodada 148 — Fotos da galera (migração 122): fotos que os clientes enviam para a casa, com autorização registrada.
          { chave: 'fotos', titulo: 'Fotos da galera', sub: 'Enviadas pelos clientes, com autorização', icone: 'camera', cor: '#E1306C', rota: '/parceiro/fotos',
            selo: nivel === 'premium' ? 'Incluído' : 'Premium / Fundador', bloqueado: nivel !== 'premium', mostrar: pode('resultados') || pode('banner') },
          // Migração 141 — fechamento da noite (resumo às 6h) e presente de aniversário para clientes
          { chave: 'fechamento', titulo: 'Fechamento da noite', sub: 'Pessoas, ingressos, pico e segurança', icone: 'moon', cor: '#7E57C2', rota: '/parceiro/fechamento',
            mostrar: pode('resultados') || pode('porta') },
          { chave: 'aniversario', titulo: 'Presente de aniversário', sub: 'O app avisa o cliente no dia', icone: 'gift', cor: '#C084FC', rota: '/parceiro/aniversario',
            selo: nivel === 'gratuito' ? 'Planos pagos' : undefined, bloqueado: nivel === 'gratuito', mostrar: pode('cupons') },
          // Relatório de público (migração 114): só números somados; Premium e Fundador.
          { chave: 'publico', titulo: 'Seu público', sub: 'Idade, horários e gostos, somados', icone: 'pie-chart', cor: '#4B5BD6', rota: '/parceiro/publico',
            selo: nivel === 'premium' ? 'Incluído' : 'Premium / Fundador', bloqueado: nivel !== 'premium', mostrar: pode('resultados') },
        ]
      : [
          { chave: 'pagina', titulo: 'Minha página', sub: 'Fotos, textos, horários e Instagram', icone: 'home', cor: '#E1306C', rota: '/parceiro/pagina', mostrar: dono },
          { chave: 'reservas', titulo: 'Reservas', sub: 'Áreas do quiz, horários e como receber', icone: 'bookmark', cor: '#4B5BD6', rota: '/parceiro/reservas',
            selo: nivel === 'gratuito' ? 'Planos pagos' : undefined, bloqueado: nivel === 'gratuito', mostrar: dono && r.reservas },
          // Etapas 12–14 — só para as categorias/liberações certas (igual ao portal)
          { chave: 'produtos', titulo: 'Catálogo de produtos', sub: 'Produtos na página da casa', icone: 'package', cor: '#F2A900', rota: '/parceiro/produtos', mostrar: dono && local.categoria === 'produtos' },
          { chave: 'pacotes', titulo: 'Pacotes e roteiros', sub: 'Na página da casa e em Pacotes', icone: 'map', cor: '#3FA0A7', rota: '/parceiro/pacotes', mostrar: dono && (local.pode_subir_pacotes ?? local.categoria === 'turismo') },
          { chave: 'hospedagem', titulo: 'Cadastro da hospedagem', sub: 'Quartos, comodidades e validação', icone: 'home', cor: '#7E57C2', rota: '/parceiro/hospedagem', mostrar: dono && local.categoria === 'turismo' },
          { chave: 'equipe', titulo: 'Equipe e senha da porta', sub: 'Quem pode fazer o quê', icone: 'shield', cor: '#7E57C2', rota: '/parceiro/equipe', mostrar: dono },
          // Migração 143 — curso de acolhimento LGBT+ (certificado e selo Equipe treinada)
          { chave: 'treinamento', titulo: 'Curso de acolhimento', sub: 'Certificado e selo Equipe treinada', icone: 'award', cor: '#34D399', rota: '/parceiro/treinamento', mostrar: local.papel !== 'porta_pin' },
          { chave: 'plano', titulo: 'Meu plano', sub: 'O que está incluído', icone: 'award', cor: '#C8853C', rota: '/parceiro/espaco', mostrar: false },
          { chave: 'senha', titulo: 'Trocar minha senha', sub: 'Vale no app e no portal', icone: 'lock', cor: '#3FA0A7', rota: '/parceiro/trocar-senha', mostrar: local.papel !== 'porta_pin' },
          { chave: 'ajuda', titulo: 'Ajuda', sub: 'Passo a passo e perguntas frequentes', icone: 'help-circle', cor: '#4B5BD6', rota: '/parceiro/ajuda', mostrar: local.papel !== 'porta_pin' },
        ];
  return itens.filter((i) => i.mostrar).map(({ mostrar: _m, ...i }) => ({ ...i, portal: i.rota ? undefined : NO_PORTAL[i.chave] }));
}

export function abrirItem(router: { push: (r: any) => void }, item: ItemParceiro, nomeLocal?: string) {
  // Ação de marca: mesmo travada abre a própria tela, que explica o que a marca ganha (página de venda).
  if (item.bloqueado && (item.chave === 'marcas' || item.chave === 'fotos' || item.chave === 'enquetes') && item.rota) return router.push(item.rota);
  if (item.bloqueado) {
    return Alert.alert(
      item.titulo,
      item.chave === 'banner'
        ? 'O banner aparece na Home e no topo da categoria e está incluído nos planos Premium e Fundador.'
        : item.chave === 'publico'
        ? 'Seu público mostra idade, horários de chegada, dias mais fortes e gostos de quem vem, tudo somado e sem nomes. Está incluído nos planos Premium e Fundador.'
        : item.chave === 'checkins' || item.chave === 'fidelidade' || item.chave === 'vip'
        ? 'Check-in pelo app, cartão fidelidade e nível VIP fazem o cliente voltar e estão incluídos nos planos pagos. No plano Gratuito, a sua casa sobe festas com Lista VIP e o público marca "Eu vou".'
        : item.chave === 'marcas'
        ? 'Fechou um happy hour ou uma festa com uma marca? Com a ação de marca, os cupons e festas ganham o selo "Apoio" no app e você vê quantas pessoas foram de verdade. Está incluída nos planos Premium e Fundador.'
        : item.chave === 'reservas'
        ? 'Com reserva, o cliente escolhe a área (rooftop, salão, sacada…), o dia e o horário pelo app, ou chama vocês no WhatsApp. Está incluída nos planos pagos.'
        : MSG_CUPOM_PLANO_PAGO,
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
      { text: 'Abrir no portal', onPress: () => void Linking.openURL(URL_PORTAL + item.portal) },
    ]);
  }
  Alert.alert(item.titulo, 'Chega no app na próxima versão. Enquanto isso, a equipe Dicas faz para você.', [
    { text: 'Agora não', style: 'cancel' },
    { text: 'Falar com a equipe', onPress: () => void falarComEquipe(`Olá! Sou do ${nomeLocal || 'meu local'} e preciso de ajuda com: ${item.titulo}.`) },
  ]);
}
