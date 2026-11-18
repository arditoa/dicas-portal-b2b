// Migração 143 — Curso de acolhimento LGBT+ para a equipe da casa (acolhimento_v1).
// O gabarito fica SÓ no banco (concluir_treinamento). Mudou o conteúdo das perguntas? Crie acolhimento_v2 no banco.
export type Licao = { titulo: string; pontos: string[] };
export type Pergunta = { texto: string; opcoes: { id: 'a' | 'b' | 'c'; texto: string }[] };

export const LICOES: Licao[] = [
  { titulo: 'Por que acolher faz diferença', pontos: [
    'Muita gente LGBT+ já passou por constrangimento na porta, no bar ou no banheiro. Um lugar onde isso não acontece vira o lugar preferido.',
    'Acolher é tratar cada pessoa como ela é, sem piada, sem olhar torto e sem perguntas sobre o corpo ou a vida dela.',
    'Quem se sente seguro volta, traz amigos e indica. No app, isso vira nota de segurança e o selo Lugar seguro.',
  ] },
  { titulo: 'Nome social e pronomes', pontos: [
    'Use o nome que a pessoa disser. O documento serve para conferir a idade, não para escolher como chamar.',
    'Na dúvida, pergunte com naturalidade: "Como você prefere ser chamada(o)?". Errou? Peça desculpa uma vez e siga.',
    'Nunca comente em voz alta o nome do documento nem mostre o documento para outras pessoas.',
  ] },
  { titulo: 'Porta, revista e banheiro', pontos: [
    'A pessoa usa o banheiro que corresponde à identidade de gênero dela. Ninguém pede para "provar" nada.',
    'Na revista, pergunte se a pessoa prefere ser revistada por homem ou mulher da equipe, quando houver opção.',
    'Sem comentários sobre roupa, corpo, voz ou "quem é homem e quem é mulher".',
  ] },
  { titulo: 'Quando acontece LGBTfobia', pontos: [
    'LGBTfobia é crime no Brasil: o STF a equiparou ao racismo em 2019.',
    'Viu ofensa ou assédio? Intervenha com calma, separe as pessoas e acolha primeiro quem foi ofendido. Quem agrediu sai da casa.',
    'Se houver crime ou risco, ligue 190. Ajude a vítima a registrar (Disque 100 e boletim de ocorrência) e guarde imagens das câmeras.',
  ] },
  { titulo: 'O app ajuda a equipe', pontos: [
    'Quando um cliente toca em "Me ajuda aqui", a equipe recebe um alerta no celular e no Início do Modo parceiro.',
    'Toque em "Estou indo", vá até a pessoa com discrição pelo primeiro nome e veja o que ela precisa. Depois, marque "Resolvido".',
    'Na saída, ajude quem está sozinho: espere o carro chegar junto e lembre do "Cheguei bem" no app.',
  ] },
];

export const PERGUNTAS: Pergunta[] = [
  { texto: 'O nome no documento é diferente do nome que a pessoa usa. O que você faz?', opcoes: [
    { id: 'a', texto: 'Chamo pelo nome do documento, que é o oficial.' },
    { id: 'b', texto: 'Confiro a idade com discrição e chamo pelo nome que ela disser.' },
    { id: 'c', texto: 'Pergunto por que os nomes são diferentes.' },
  ] },
  { texto: 'Qual banheiro uma pessoa trans deve usar?', opcoes: [
    { id: 'a', texto: 'O do sexo que está no documento.' },
    { id: 'b', texto: 'Só o banheiro de pessoas com deficiência.' },
    { id: 'c', texto: 'O que corresponde à identidade de gênero dela.' },
  ] },
  { texto: 'Um cliente ofende outro por ser LGBT+. O que fazer primeiro?', opcoes: [
    { id: 'a', texto: 'Intervir com calma, separar as pessoas e acolher quem foi ofendido.' },
    { id: 'b', texto: 'Esperar a discussão acabar sozinha.' },
    { id: 'c', texto: 'Pedir que os dois saiam da casa.' },
  ] },
  { texto: 'No Brasil, a LGBTfobia:', opcoes: [
    { id: 'a', texto: 'Não é crime, só falta de educação.' },
    { id: 'b', texto: 'É crime: o STF a equiparou ao racismo em 2019.' },
    { id: 'c', texto: 'Só gera multa para a casa.' },
  ] },
  { texto: 'Chegou um "Me ajuda aqui" do app. O que fazer?', opcoes: [
    { id: 'a', texto: 'Esperar a casa esvaziar para ver.' },
    { id: 'b', texto: 'Ligar para o celular da pessoa.' },
    { id: 'c', texto: 'Tocar em "Estou indo" e ir até a pessoa com discrição.' },
  ] },
];
