// Rodada 60 — taxonomia enviada pela Câmara de Comércio LGBT+ (mensagem
// do Renan) pra classificar a relação de um local/evento com a
// comunidade LGBT+. Compartilhado entre /cadastro/local e /cadastro/
// evento pra não duplicar rótulos/valores em cada arquivo. Escolha
// ÚNICA (confirmado com a Andrea) — grava em locais.classificacao_lgbt /
// eventos.classificacao_lgbt (migration 032), sempre opcional.
export const CLASSIFICACOES_LGBT = [
  {
    value: 'lugar_lgbt',
    emoji: '🏳️‍🌈',
    label: 'Lugar LGBT+',
    descricao:
      'Criado ou liderado por pessoas LGBTQI+, ou cuja identidade está diretamente ligada à comunidade.',
  },
  {
    value: 'voltado_comunidade',
    emoji: '🤝',
    label: 'Voltado à Comunidade LGBT+',
    descricao:
      'Negócio que desenvolve produtos, serviços ou experiências pensados especialmente para pessoas LGBTQI+.',
  },
  {
    value: 'acolhedor_diversidade',
    emoji: '💜',
    label: 'Acolhedor à Diversidade',
    descricao:
      'Estabelecimento comprometido com atendimento inclusivo, respeito e valorização da diversidade.',
  },
  {
    value: 'frequentado_comunidade',
    emoji: '✨',
    label: 'Frequentado espontaneamente pela comunidade LGBT+',
    descricao: 'Espaço que, ao longo do tempo, se tornou um ponto de encontro da comunidade.',
  },
] as const;

export type ClassificacaoLgbt = (typeof CLASSIFICACOES_LGBT)[number]['value'];
