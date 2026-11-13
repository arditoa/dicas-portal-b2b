// Etapa 11 — textos da Ajuda do Modo parceiro. Mesma fonte do portal (portal-b2b-lgbt/src/lib/ajudaPaginas.ts),
// com as telas e os caminhos do app. Só afirma o que o sistema faz hoje: ao mudar uma regra, ajuste aqui e lá.
// Sem preço nem pagamento (regra Apple): plano é com a equipe pelo WhatsApp.
import { LocalDoParceiro, Permissao, recursosDaCategoria } from '../modoParceiro';

export type AjudaTela = { chave: string; titulo: string; rota: string; paraQue: string; passos: string[]; dica?: string; mostrar: (l: LocalDoParceiro, pode: (p: Permissao) => boolean) => boolean };

const r = (l: LocalDoParceiro) => recursosDaCategoria(l.categoria, l.subcategoria);
export const AJUDA_TELAS: AjudaTela[] = [
  { chave: 'pagina', titulo: 'Minha página', rota: '/parceiro/pagina', mostrar: (l) => l.papel === 'dono',
    paraQue: 'É a vitrine da sua casa dentro do app: nome, fotos, descrição, horário, público e contato.',
    passos: ['Coloque uma foto de capa e o logo.', 'Escreva uma descrição curta e convidativa (pelo menos 20 letras).', 'Informe o horário de funcionamento e o Instagram.', 'Marque o ponto no mapa em Endereço e mapa.'] },
  { chave: 'cupons', titulo: 'Cupons', rota: '/parceiro/cupons', mostrar: (l, p) => !!r(l).cupom && p('cupons'),
    paraQue: 'Promoções que o cliente resgata na sua casa. Aparecem na página da casa e, nos planos pagos, na faixa de cupons da categoria.',
    passos: ['Toque em Novo cupom e preencha.', 'Publique. Premium e Fundador publicam 1 a cada 7 dias; Intermediário, 1 a cada 14.', 'Quando o cliente chegar, confirme o check-in em Aprovações: o cupom vai junto.'],
    dica: 'A faixa de cupons de cada categoria mostra 6 por vez, em rodízio. Cupom novo toda semana mantém você no giro.' },
  { chave: 'agenda', titulo: 'Agenda da semana', rota: '/parceiro/agenda', mostrar: (l, p) => r(l).agenda && p('festa'),
    paraQue: 'O que rola na sua casa em cada dia. Aparece em Eventos › Essa semana, e não na sua página.',
    passos: ['Escolha esta semana ou a próxima.', 'Em cada dia, preencha título, horário e, se quiser, detalhes, foto ou link.', 'Escolha se vale só nesta semana ou toda semana.', 'Se preferir, suba o cartaz da semana.'],
    dica: 'Toda sexta, deixe a agenda da próxima semana pronta: antes de segunda o público já se planeja.' },
  { chave: 'festas', titulo: 'Minhas festas', rota: '/parceiro/festas', mostrar: (l, p) => r(l).eventos && p('festa'),
    paraQue: 'As festas e eventos da casa: data, flyer, público e Lista VIP.',
    passos: ['Toque em Nova festa e preencha.', 'A equipe Dicas analisa antes de aparecer no app.', 'Mudar o nome ou a data de uma festa aprovada manda ela de volta para análise.'],
    dica: 'Para o que se repete toda semana, use a Agenda da semana.' },
  { chave: 'lista', titulo: 'Lista VIP e porta', rota: '/parceiro/aprovacoes', mostrar: (l, p) => r(l).listaVip && (p('lista_vip') || p('porta')),
    paraQue: 'Quem pediu nome na lista das suas festas e a entrada na portaria.',
    passos: ['Em Aprovações, aprove ou recuse os pedidos.', 'Na hora da festa, abra a Porta e leia o QR de quem chega.'] },
  { chave: 'banner', titulo: 'Banner', rota: '/parceiro/banner', mostrar: (l, p) => p('banner') && l.categoria !== 'eventos',
    paraQue: 'O banner grande no topo da categoria (e, para Fundadores, na Home).',
    passos: ['Escreva a frase e escolha o estilo.', 'Veja a prévia e salve.', 'Troque toda semana: banner novo chama mais atenção.'] },
  { chave: 'fidelidade', titulo: 'Cartão fidelidade', rota: '/parceiro/fidelidade', mostrar: (l) => r(l).fidelidade && l.papel === 'dono',
    paraQue: 'Premie quem volta: quantas visitas no mês dão um brinde da casa.',
    passos: ['Defina a meta e o brinde, e se a contagem é no mês.', 'O cliente faz check-in no app; vocês confirmam o código.', 'Quando bater a meta, toque em "Entreguei o brinde".'],
    dica: 'No modo mensal a contagem recomeça no dia 1º e cada cliente ganha no máximo 1 brinde por mês.' },
  { chave: 'reservas', titulo: 'Reservas', rota: '/parceiro/reservas', mostrar: (l) => r(l).reservas && l.papel === 'dono',
    paraQue: 'O cliente escolhe a área, o dia e o horário pelo app, ou chama vocês no WhatsApp.',
    passos: ['Escolha como receber e as regras.', 'Monte as áreas do passo a passo.', 'Confirme ou recuse em Aprovações: o cliente recebe aviso no celular.'] },
  { chave: 'equipe', titulo: 'Equipe e senha da porta', rota: '/parceiro/equipe', mostrar: (l) => l.papel === 'dono',
    paraQue: 'Quem da casa pode fazer o quê no app, e a senha de quem fica só na portaria.',
    passos: ['Convide pelo código de 8 letras (vale 7 dias).', 'Defina a senha da porta e mande o código da casa para o porteiro.'] },
];

export const FAQ: { p: string; r: string }[] = [
  { p: 'Quanto tempo leva para aprovarem o cadastro?', r: 'Normalmente até 48 horas. Enquanto isso, você já pode completar a sua página.' },
  { p: 'Onde aparece a agenda da semana?', r: 'Só no app, em Eventos › Essa semana. Ela não vai para a página da casa.' },
  { p: 'Quantos cupons posso publicar?', r: 'Premium e Fundador: 1 cupom a cada 7 dias. Intermediário: 1 a cada 14 dias. O plano Gratuito não publica cupons.' },
  { p: 'Como funciona o cartão fidelidade?', r: 'Você define quantas visitas dão um brinde. O cliente faz check-in no app, vocês confirmam a visita e, ao bater a meta, entregam o brinde e marcam como entregue.' },
  { p: 'Esqueci minha senha. E agora?', r: 'Quem entra por e-mail usa "Esqueci minha senha" na Conta. Quem entra por WhatsApp pede uma senha nova para a equipe Dicas.' },
  { p: 'Como mudo de plano?', r: 'Fale com a equipe Dicas pelo WhatsApp: a gente explica o que cada plano inclui e ativa para você.' },
];
