// Rodada 129 — textos de ajuda do painel do parceiro: a caixa "Como funciona"
// no topo de cada tela e a página /dashboard/ajuda usam ESTA mesma fonte.
// Só afirma o que o sistema realmente faz hoje — ao mudar uma regra de
// negócio (limites de cupom, fidelidade...), ajuste aqui também.

export type AjudaPagina = {
  titulo: string;
  paraQue: string;
  passos: string[];
  dica?: string;
};

export const AJUDA_PAGINAS: Record<string, AjudaPagina> = {
  '/dashboard/perfil': {
    titulo: 'Minha página',
    paraQue: 'É a vitrine do seu espaço dentro do app: nome, fotos, descrição, horário, tags e contato.',
    passos: [
      'Coloque uma foto de capa e o logo do seu espaço.',
      'Escreva uma descrição curta e convidativa.',
      'Informe o horário de funcionamento e o Instagram.',
      'Escolha as tags que combinam com o seu público e salve.',
    ],
    dica: 'É aqui embaixo também que você troca a sua senha provisória por uma só sua.',
  },
  '/dashboard/cupons': {
    titulo: 'Cupons',
    paraQue:
      'Promoções que o cliente resgata na sua casa. Aparecem no seu perfil e, nos planos pagos, na faixa de cupons da sua categoria no app.',
    passos: [
      'Toque para criar um cupom e preencha as informações.',
      'Publique. O limite depende do plano: Premium e Fundador publicam 1 cupom a cada 7 dias; Intermediário, 1 a cada 14 dias.',
      'Quando o cliente chegar com o código, valide aqui mesmo.',
    ],
    dica: 'A faixa de cupons de cada categoria tem 24 posições e mostra 6 por vez, em rodízio. Cupom novo toda semana mantém você no giro.',
  },
  '/dashboard/agenda': {
    titulo: 'Agenda da semana',
    paraQue: 'Conte o que rola no seu espaço em cada dia. Ela aparece para o público em Eventos → Essa semana, e não no seu perfil.',
    passos: [
      'Escolha a semana: esta ou a próxima.',
      'Em cada dia, preencha título, horário e, se quiser, descrição, foto ou link.',
      'Escolha se vale só para esta semana ou se se repete toda semana.',
      'Se preferir, suba o cartaz da semana com a programação completa. Depois, salve.',
    ],
    dica: 'Toda sexta-feira, deixe a agenda da próxima semana pronta. Antes de segunda, o público já se planeja.',
  },
  '/dashboard/fidelidade': {
    titulo: 'Fidelidade',
    paraQue: 'Premie quem volta: defina quantas visitas no mês dão um brinde da casa.',
    passos: [
      'Defina a regra (número de visitas e o brinde) e se a contagem é mensal.',
      'O cliente faz check-in no app e recebe um código de 6 letras, válido por poucos minutos.',
      'Digite o código em "Confirmar visita" para contar a visita.',
      'Quando ele bater a meta, clique em "Entreguei o brinde".',
    ],
    dica: 'Você escolhe se o cartão aparece no app ("Mostrar no app"). No modo mensal a contagem recomeça no dia 1º e cada cliente ganha no máximo 1 brinde por mês.',
  },
  '/dashboard/destaques': {
    titulo: 'Destaques e resultados',
    paraQue: 'Mostra quantas pessoas viram e tocaram no seu espaço nas áreas de destaque do app, e onde o seu plano coloca você.',
    passos: [
      'Veja os números dos últimos 30 dias.',
      'Premium e Fundador: escreva a frase do seu banner e troque toda semana.',
      'Confira em que posições você aparece e o que o seu plano libera.',
    ],
    dica: 'Quer aparecer em mais lugares? Veja o que cada plano libera em "Meu plano".',
  },
  '/dashboard/eventos': {
    titulo: 'Meus eventos',
    paraQue: 'Cadastre as festas e eventos do seu espaço: data, descrição e foto de capa.',
    passos: [
      'Crie o evento com título, data, descrição e foto.',
      'A equipe analisa antes de ele aparecer no app.',
      'Mudar o título ou a data de um evento já aprovado manda ele de volta para análise.',
    ],
    dica: 'Para a programação que se repete toda semana, use a Agenda da semana.',
  },
  '/dashboard/lista-vip': {
    titulo: 'Lista VIP',
    paraQue: 'Controle quem pediu entrada na lista VIP dos seus eventos.',
    passos: ['Escolha o evento.', 'Abra a lista VIP, se ainda não estiver aberta.', 'Aprove ou rejeite quem pediu entrada.'],
  },
  '/dashboard/pacotes': {
    titulo: 'Pacotes e roteiros',
    paraQue: 'Os pacotes e roteiros que aparecem no seu perfil no app.',
    passos: ['Toque para criar um pacote.', 'Preencha as informações e adicione as fotos.', 'Salve: ele aparece no seu perfil.'],
  },
  '/dashboard/produtos': {
    titulo: 'Catálogo de produtos',
    paraQue: 'Os produtos que aparecem no seu perfil no app.',
    passos: ['Toque para adicionar um produto.', 'Preencha as informações e coloque uma foto.', 'Salve: ele aparece no seu perfil.'],
  },
  '/dashboard/hospedagem': {
    titulo: 'Cadastro da hospedagem',
    paraQue: 'Quanto mais completo o cadastro da sua hospedagem, mais destaque ela tem no app.',
    passos: ['Preencha as etapas com calma.', 'Dá para voltar e ajustar quando quiser.'],
  },
};

export const FAQ: { p: string; r: string }[] = [
  {
    p: 'Como entro no portal?',
    r: 'Com o WhatsApp (ou e-mail) do seu cadastro e a senha. No primeiro acesso, use a senha que enviamos no WhatsApp quando seu cadastro foi aprovado — e troque por uma só sua.',
  },
  {
    p: 'Esqueci minha senha. E agora?',
    r: 'Na tela de login, toque em "Esqueci minha senha". Quem entra por e-mail recebe um link; quem entra por WhatsApp pede uma senha nova ao nosso time.',
  },
  {
    p: 'Quanto tempo leva para aprovarem meu cadastro?',
    r: 'Normalmente até 48 horas. Enquanto isso, você já pode completar a sua página.',
  },
  {
    p: 'Onde aparece a agenda da semana?',
    r: 'Somente no app, em Eventos → Essa semana. Ela não vai para o seu perfil.',
  },
  {
    p: 'Quantos cupons posso publicar?',
    r: 'Premium e Fundador: 1 cupom a cada 7 dias. Intermediário: 1 a cada 14 dias. O plano Freemium não publica cupons na faixa da categoria.',
  },
  {
    p: 'Como funciona o cartão fidelidade?',
    r: 'Você define quantas visitas dão um brinde. O cliente faz check-in no app, recebe um código, você confirma a visita no portal e, ao bater a meta, entrega o brinde e marca como entregue.',
  },
  {
    p: 'Como mudo de plano?',
    r: 'Em "Meu plano", escolha o plano. Nossa equipe entra em contato pelo WhatsApp ou e-mail cadastrado para combinar o pagamento (Pix) e ativa o plano assim que confirmar.',
  },
];
