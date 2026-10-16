// Página Dicas Lab — conteúdo do documento "Produtos Dicas" (Google Drive,
// pasta do site). Textos e valores copiados do documento; para mudar um
// preço, um texto ou um botão, edite SÓ este arquivo.

export type Bloco = { t: string; p?: string; li?: string[] };

export type Produto = {
  slug: string;
  nome: string;
  gancho: string;
  blocos: Bloco[];
  /** Valor principal, já formatado (ex.: "R$490" ou "Sob consulta"). */
  preco?: string;
  /** Preço antigo (cartaz "De ... por ..."). */
  de?: string;
  /** Linha extra abaixo do preço (parcelamento, verba de anúncios...). */
  nota?: string;
  /** Prefixo antes do valor (ex.: "Referência para projetos desse porte"). */
  prefixo?: string;
  tabela?: { modalidade: string; recebe: string; preco: string }[];
  cta: string;
};

export type Categoria = {
  id: string;
  titulo: string;
  subtitulo: string;
  intro?: string;
  icone: 'lab' | 'atendimento' | 'mensal' | 'producao' | 'divulgacao' | 'projetos';
  produtos: Produto[];
};

export const PILARES = [
  {
    titulo: 'Dicas Lab',
    sub: 'Tecnologia, Estratégia e Desenvolvimento',
    texto: 'Inteligência para o negócio. Sensibilidade para entender pessoas. Método para fazer acontecer',
    href: '#dicas-lab',
  },
  {
    titulo: 'Marketing e Produção de Conteúdo',
    sub: '',
    texto: 'Seu negócio tem história, personalidade e muita coisa boa para mostrar',
    href: '#marketing-mensal',
  },
  {
    titulo: 'Dicas LGBT — Divulgação e Conexão',
    sub: '',
    texto: 'Da descoberta ao “bora conhecer?”, conectamos sua empresa à nossa comunidade',
    href: '#divulgacao',
  },
];

export const CATEGORIAS: Categoria[] = [
  {
    id: 'dicas-lab',
    titulo: 'Dicas Lab',
    subtitulo: 'Orgulho do que você construiu. Estratégia para ir além',
    icone: 'lab',
    produtos: [
      {
        slug: 'diagnostico',
        nome: 'Diagnóstico Estratégico e de Lucratividade',
        gancho: 'Seu negócio tem movimento, mas o resultado ainda não está dando aquele close?',
        blocos: [
          { t: 'Para quem', p: 'Empresários que precisam entender onde estão os problemas e as oportunidades de crescimento' },
          { t: 'O que vamos resolver', p: 'Investigar o que pode estar limitando suas vendas: oferta, público, comunicação, atendimento e organização comercial' },
          { t: 'Como acontece', p: 'Levantamos as informações do negócio, analisamos os principais pontos e apresentamos uma devolutiva com prioridades de ação' },
          { t: 'Por que vale a pena', p: 'Você ganha clareza para direcionar energia e investimento, considerando as necessidades do seu público' },
        ],
        preco: 'R$490',
        cta: 'Quero descobrir minhas oportunidades',
      },
      {
        slug: 'estruturacao-marketing',
        nome: 'Estruturação de Marketing',
        gancho: 'Sua marca tem personalidade, mas na hora de postar parece que ela entrou no modo discreto?',
        blocos: [
          { t: 'Para quem', p: 'Empresas que precisam organizar a comunicação e construir uma presença mais consistente' },
          { t: 'O que vamos resolver', p: 'Definir com quem sua marca conversa, o que precisa comunicar e quais campanhas fazem sentido, inclusive para se conectar com diferentes públicos da comunidade LGBT+' },
          { t: 'Como acontece', p: 'Reunião estratégica de duas a três horas, definição de público e posicionamento, direcionamento de campanhas e plano de ação de 30 dias' },
          { t: 'Por que vale a pena', p: 'Sua comunicação ganha direção, identidade e motivos claros para despertar interesse' },
        ],
        preco: 'R$1.500',
        cta: 'Quero mostrar a personalidade da minha marca',
      },
      {
        slug: 'metodo-dicas',
        nome: 'Método D.I.C.A.S.',
        gancho: 'Você quer crescer, mas sente que precisa organizar o negócio inteiro para chegar à próxima fase?',
        blocos: [
          { t: 'Para quem', p: 'Empresários que buscam uma consultoria ampla de desenvolvimento' },
          { t: 'O que vamos resolver', p: 'Conectar público, posicionamento, produtos, preços, comunicação, atendimento e experiência do cliente' },
          { t: 'Como acontece', p: 'Cinco encontros de consultoria para diagnóstico, construção das estratégias e organização de um plano de ação' },
          { t: 'Por que vale a pena', p: 'Você constrói um caminho de crescimento considerando seu negócio e as pessoas que deseja conquistar. A comunidade LGBT+ é diversa, e sua estratégia precisa reconhecer isso' },
        ],
        preco: 'R$3.490',
        nota: 'ou 12x de R$349 (total de R$4.188)',
        cta: 'Quero levar meu negócio para a próxima fase',
      },
      {
        slug: 'acompanhamento',
        nome: 'Acompanhamento da Aplicação e dos Resultados',
        gancho: 'O plano está pronto. Bora fazer esse close acontecer na prática?',
        blocos: [
          { t: 'Para quem', p: 'Quem passou por uma consultoria ou treinamento e precisa de apoio na aplicação' },
          { t: 'O que vamos resolver', p: 'Manter as ações em andamento, avaliar resultados e ajustar os próximos passos' },
          { t: 'Como acontece', p: 'Acompanhamento do plano de ação, revisão dos indicadores e orientação sobre os ajustes necessários' },
          { t: 'Por que vale a pena', p: 'Você tem apoio para transformar boas ideias em uma rotina de execução' },
        ],
        preco: 'R$690',
        nota: 'Já incluso nos pacotes de marketing mensal',
        cta: 'Quero apoio para fazer acontecer',
      },
    ],
  },
  {
    id: 'atendimento-vendas',
    titulo: 'Atendimento e Vendas',
    subtitulo: 'Acolhimento que se percebe. Atendimento que faz querer voltar',
    icone: 'atendimento',
    produtos: [
      {
        slug: 'cliente-oculto',
        nome: 'Cliente Oculto',
        gancho: 'Seu espaço se apresenta como acolhedor. Mas como essa experiência acontece quando você não está por perto?',
        blocos: [
          { t: 'Para quem', p: 'Lojas, bares, restaurantes e negócios que querem conhecer a experiência real de quem compra' },
          { t: 'O que vamos resolver', p: 'Identificar falhas no atendimento, oportunidades de venda perdidas e situações que prejudicam a experiência do cliente' },
          { t: 'Como acontece', p: 'Visitamos o negócio como cliente, preparamos um relatório e fazemos uma devolutiva com recomendações' },
          { t: 'Por que vale a pena', p: 'Você enxerga detalhes da experiência, incluindo abordagem, respeito e atenção às necessidades do público' },
        ],
        preco: 'R$590',
        cta: 'Quero olhar meu negócio pelos olhos do cliente',
      },
      {
        slug: 'atendimento-experiencia',
        nome: 'Atendimento e Experiência do Cliente',
        gancho: 'Sua equipe sabe fazer cada pessoa se sentir bem-vinda, sem suposições e sem climão?',
        blocos: [
          { t: 'Para quem', p: 'Empresas que precisam criar um jeito próprio de receber, orientar e cuidar dos clientes' },
          { t: 'O que vamos resolver', p: 'Organizar a abordagem, a identificação das necessidades, as recomendações e a conclusão do atendimento, com atenção ao respeito à diversidade' },
          { t: 'Como acontece', p: 'Reunião de briefing, construção da estratégia de atendimento e devolutiva com orientação de aplicação' },
          { t: 'Por que vale a pena', p: 'A equipe ganha clareza para acolher diferentes pessoas e entregar uma experiência alinhada à marca' },
        ],
        preco: 'R$1.490',
        cta: 'Quero um atendimento que acolhe',
      },
      {
        slug: 'vendas-alta-performance',
        nome: 'Método de Vendas de Alta Performance',
        gancho: 'Sua equipe sabe criar conexão ou fica esperando o cliente pedir tudo sozinho?',
        blocos: [
          { t: 'Para quem', p: 'Negócios que querem desenvolver a capacidade comercial da equipe' },
          { t: 'O que vamos resolver', p: 'Melhorar as recomendações, a apresentação dos produtos, o tratamento das objeções e a condução do fechamento' },
          { t: 'Como acontece', p: 'Seis encontros com diagnóstico, abordagem, venda consultiva, venda sensorial, cardápio oculto conforme o negócio, objeções, fechamento, simulações e ajustes de aplicação' },
          { t: 'Por que vale a pena', p: 'Sua equipe aprende a vender considerando a necessidade de cada pessoa, com segurança, repertório e respeito' },
        ],
        preco: 'R$3.490',
        cta: 'Quero uma equipe mais preparada para vender',
      },
    ],
  },
  {
    id: 'marketing-mensal',
    titulo: 'Marketing Mensal',
    subtitulo: 'Seu negócio precisa de presença digital? Vamos levar energia para o feed?',
    intro:
      'Entre cuidar da operação e fazer tudo acontecer, o conteúdo acaba ficando para depois? A gente organiza planejamento, roteiros, produção, edição, legendas, publicação e acompanhamento dos resultados',
    icone: 'mensal',
    produtos: [
      {
        slug: 'agencia-completa-dicas',
        nome: 'Agência Completa + Dicas LGBT',
        gancho: 'Quer fortalecer seu perfil e colocar seu negócio na rota da nossa comunidade?',
        blocos: [
          { t: 'Para quem', p: 'Empresas que buscam conteúdo frequente e divulgação para o público LGBT+' },
          { t: 'O que vamos resolver', p: 'Dar constância à comunicação e criar novas oportunidades para o público descobrir sua empresa' },
          {
            t: 'Você recebe',
            li: [
              'Cinco conteúdos semanais no seu perfil: três vídeos e duas artes',
              'Dois vídeos adicionais por mês em colaboração com o Dicas LGBT',
              'Gestão da execução e acompanhamento dos resultados',
            ],
          },
          { t: 'Por que vale a pena', p: 'Você reúne conteúdo para sua marca e divulgação para uma audiência que procura lugares, produtos e experiências' },
        ],
        preco: 'R$2.980/mês',
        cta: 'Quero minha marca com o Dicas',
      },
      {
        slug: 'agencia-completa',
        nome: 'Agência Completa',
        gancho: 'Seu negócio rende assunto, mas falta uma equipe para transformar tudo isso em conteúdo?',
        blocos: [
          { t: 'Para quem', p: 'Empresas que querem delegar a rotina de comunicação' },
          { t: 'O que vamos resolver', p: 'Organizar a apresentação dos seus produtos, diferenciais, experiências e campanhas' },
          { t: 'Você recebe', p: 'Cinco conteúdos semanais: três vídeos e duas artes, com planejamento, execução, publicação e acompanhamento' },
          { t: 'Por que vale a pena', p: 'Sua marca ganha uma rotina de conteúdo com personalidade e direção' },
        ],
        preco: 'R$2.690/mês',
        cta: 'Quero movimentar meu conteúdo',
      },
      {
        slug: 'pacote-intermediario',
        nome: 'Pacote Intermediário',
        gancho: 'Quer um feed com mais presença e espaço para mostrar o que faz seu negócio ser único?',
        blocos: [
          { t: 'Para quem', p: 'Empresas que buscam uma produção regular de vídeos e artes' },
          { t: 'O que vamos resolver', p: 'Manter a comunicação ativa e apresentar produtos, ofertas e diferenciais' },
          { t: 'Você recebe', p: 'Quatro conteúdos semanais: dois vídeos e duas artes, com planejamento, execução, publicação e acompanhamento' },
          { t: 'Por que vale a pena', p: 'Equilibra frequência, variedade de formatos e investimento' },
        ],
        preco: 'R$2.200/mês',
        cta: 'Esse pacote combina comigo',
      },
      {
        slug: 'pacote-basico',
        nome: 'Pacote Básico',
        gancho: 'Bora tirar seu perfil do “apareço quando dá” e começar a marcar presença?',
        blocos: [
          { t: 'Para quem', p: 'Empresas que precisam estabelecer uma rotina de conteúdo' },
          { t: 'O que vamos resolver', p: 'Criar constância e organizar a divulgação dos principais atrativos do negócio' },
          { t: 'Você recebe', p: 'Três conteúdos semanais: um vídeo e duas artes, com planejamento, execução, publicação e acompanhamento' },
          { t: 'Por que vale a pena', p: 'Você começa com uma estrutura mais enxuta e apoio para manter a comunicação ativa' },
        ],
        preco: 'R$1.800/mês',
        cta: 'Quero começar a marcar presença',
      },
    ],
  },
  {
    id: 'producao-conteudo',
    titulo: 'Produção de Conteúdo',
    subtitulo: 'Luz, câmera e personalidade',
    icone: 'producao',
    produtos: [
      {
        slug: 'express',
        nome: 'Express — Produção de Conteúdo',
        gancho: 'Você já cuida das suas redes, mas precisa de uma força para produzir aquele conteúdo?',
        blocos: [
          { t: 'Para quem', p: 'Empresas que querem apoio de produção e têm quem faça as postagens' },
          { t: 'O que vamos resolver', p: 'Produzir materiais para apoiar a comunicação do negócio' },
          { t: 'Você recebe', p: 'Produção Express, com quantidade, formatos e cronograma definidos na proposta' },
          { t: 'Por que vale a pena', p: 'Você recebe os materiais e organiza a publicação com sua equipe' },
        ],
        preco: 'R$1.600',
        cta: 'Quero produzir com o Dicas',
      },
      {
        slug: 'express-postagem',
        nome: 'Express com Postagem',
        gancho: 'Quer ajuda para produzir e colocar esse conteúdo para circular?',
        blocos: [
          { t: 'Para quem', p: 'Empresas que precisam de produção e postagem em uma contratação' },
          { t: 'O que vamos resolver', p: 'Conduzir a criação e a publicação dos materiais contratados' },
          { t: 'Você recebe', p: 'Produção Express e postagem dos conteúdos previstos na proposta' },
          { t: 'Por que vale a pena', p: 'Você concentra essas duas etapas com a mesma equipe' },
        ],
        preco: 'R$1.890',
        cta: 'Quero produção e postagem',
      },
      {
        slug: 'oito-videos',
        nome: 'Pacote de Oito Vídeos',
        gancho: 'Tem história, produto e experiência para mostrar? Seu negócio merece esse protagonismo',
        blocos: [
          { t: 'Para quem', p: 'Empresas que querem organizar uma sequência de conteúdos em vídeo' },
          { t: 'O que vamos resolver', p: 'Transformar diferentes pautas do negócio em materiais para sua comunicação' },
          { t: 'Você recebe', p: 'Oito conteúdos em vídeo, com condições de roteiro, captação e edição definidas na proposta' },
          { t: 'Por que vale a pena', p: 'Você planeja vários assuntos dentro de uma produção organizada' },
        ],
        preco: 'Sob consulta',
        cta: 'Quero planejar meus oito vídeos',
      },
      {
        slug: 'producao-terceirizada',
        nome: 'Produção Terceirizada',
        gancho: 'Sua agência está cheia de projetos e precisa de reforço nos bastidores?',
        blocos: [
          { t: 'Para quem', p: 'Agências, equipes de marketing e empresas que precisam complementar sua capacidade de entrega' },
          { t: 'O que vamos resolver', p: 'Apoiar as etapas de produção que sua equipe precisa terceirizar' },
          { t: 'Você recebe', p: 'Roteiro, captação ou edição, conforme o escopo contratado' },
          { t: 'Por que vale a pena', p: 'Você ganha apoio para organizar a produção e atender às demandas' },
        ],
        preco: 'Sob consulta',
        cta: 'Quero o Dicas na minha produção',
      },
    ],
  },
  {
    id: 'divulgacao',
    titulo: 'Divulgação no Dicas LGBT',
    subtitulo: 'Do “não conhecia” ao “bora marcar com a galera?”',
    icone: 'divulgacao',
    produtos: [
      {
        slug: 'campanha-consultoria',
        nome: 'Campanha Estratégica com Consultoria',
        gancho: 'Seu negócio tem tudo para entrar nos planos da comunidade. Mas qual é o melhor jeito de apresentar ele?',
        blocos: [
          { t: 'Para quem', p: 'Empresas que precisam de direcionamento estratégico junto com a divulgação' },
          { t: 'O que vamos resolver', p: 'Encontrar os argumentos que conectam seu negócio ao interesse do público' },
          { t: 'Você recebe', p: 'Consultoria de direcionamento e produção e publicação de três conteúdos no Dicas LGBT' },
          { t: 'Por que vale a pena', p: 'Sua campanha ganha uma direção alinhada ao negócio e à comunidade que deseja alcançar' },
        ],
        de: 'R$2.349',
        preco: 'R$1.890',
        cta: 'Quero uma campanha com estratégia',
      },
      {
        slug: 'quatro-conteudos',
        nome: 'Quatro Conteúdos no Dicas LGBT',
        gancho: 'Seu negócio tem vários motivos para merecer uma visita? Bora apresentar esse elenco completo?',
        blocos: [
          { t: 'Para quem', p: 'Empresas que querem divulgar diferentes produtos, experiências e diferenciais' },
          { t: 'O que vamos resolver', p: 'Construir uma sequência com diferentes motivos para o público conhecer seu negócio' },
          { t: 'Você recebe', p: 'Produção e publicação de quatro conteúdos no Dicas LGBT' },
          { t: 'Por que vale a pena', p: 'Você explora mais pautas e aproveita uma condição de pacote' },
        ],
        de: 'R$2.596',
        preco: 'R$1.970,70',
        cta: 'Quero mostrar mais do meu negócio',
      },
      {
        slug: 'tres-conteudos',
        nome: 'Três Conteúdos no Dicas LGBT',
        gancho: 'Quer entrar no radar de quem está procurando a próxima experiência?',
        blocos: [
          { t: 'Para quem', p: 'Empresas que já sabem o que desejam promover para o público LGBT+' },
          { t: 'O que vamos resolver', p: 'Apresentar seus atrativos por diferentes abordagens' },
          { t: 'Você recebe', p: 'Produção e publicação de três conteúdos no Dicas LGBT' },
          { t: 'Por que vale a pena', p: 'Você reúne uma sequência de divulgação com investimento em pacote' },
        ],
        de: 'R$1.947',
        preco: 'R$1.649',
        cta: 'Quero entrar no radar da comunidade',
      },
      {
        slug: 'video-carrosseis',
        nome: 'Vídeo + Carrosséis',
        gancho: 'Quer mostrar a vibe do seu negócio e explicar por que ele merece entrar nos planos?',
        blocos: [
          { t: 'Para quem', p: 'Empresas que precisam combinar apresentação em vídeo e informações mais detalhadas' },
          { t: 'O que vamos resolver', p: 'Despertar interesse e ajudar o público a conhecer melhor sua oferta' },
          { t: 'Você recebe', p: 'Um conteúdo em vídeo e dois posts de carrossel no Dicas LGBT' },
          { t: 'Por que vale a pena', p: 'Os formatos se complementam para apresentar a experiência e os diferenciais do negócio' },
        ],
        de: 'R$1.347',
        preco: 'R$1.200',
        cta: 'Quero mostrar minha vibe',
      },
      {
        slug: 'divulgacao-avulsa',
        nome: 'Divulgação Avulsa',
        gancho: 'Tem novidade, evento ou oferta para contar para a comunidade?',
        blocos: [
          { t: 'Para quem', p: 'Empresas que precisam de uma divulgação pontual' },
          { t: 'O que vamos resolver', p: 'Levar sua comunicação à audiência do Dicas LGBT' },
          { t: 'Por que vale a pena', p: 'Você contrata uma ação conforme a necessidade do momento' },
        ],
        tabela: [
          { modalidade: 'Repost', recebe: 'Republicação de conteúdo fornecido', preco: 'R$50' },
          { modalidade: 'Story avulso', recebe: 'Uma unidade de Story', preco: 'R$150' },
          { modalidade: 'Pacote de Stories', recebe: 'Quatro unidades de Stories', preco: 'R$390' },
        ],
        cta: 'Quero contar minha novidade',
      },
    ],
  },
  {
    id: 'projetos-especiais',
    titulo: 'Projetos Especiais',
    subtitulo: 'Ideias grandes também têm lugar aqui',
    icone: 'projetos',
    produtos: [
      {
        slug: 'meta-ads',
        nome: 'Gestão de Meta Ads',
        gancho: 'Quer levar sua comunicação mais longe com campanhas pagas?',
        blocos: [
          { t: 'Para quem', p: 'Empresas que precisam de uma operação dedicada de anúncios' },
          { t: 'O que vamos resolver', p: 'Organizar as campanhas conforme o público e os objetivos do projeto' },
          { t: 'Você recebe', p: 'Planejamento, gestão e acompanhamento de Meta Ads, com escopo definido na proposta' },
          { t: 'Por que vale a pena', p: 'Você conta com uma equipe para conduzir a operação e acompanhar as campanhas' },
        ],
        prefixo: 'Referência de investimento para projetos desse porte',
        preco: 'R$5.500/mês',
        nota: 'Verba de anúncios à parte',
        cta: 'Quero conversar sobre anúncios',
      },
      {
        slug: 'meta-ads-tiktok',
        nome: 'Meta Ads + TikTok Orgânico',
        gancho: 'Sua marca tem personalidade para aparecer no TikTok e quer combinar isso com anúncios?',
        blocos: [
          { t: 'Para quem', p: 'Empresas que precisam trabalhar essas duas frentes em conjunto' },
          { t: 'O que vamos resolver', p: 'Conectar a operação de anúncios à produção orgânica no TikTok' },
          { t: 'Você recebe', p: 'Gestão de Meta Ads e operação de TikTok orgânico com até cinco conteúdos semanais, conforme proposta' },
          { t: 'Por que vale a pena', p: 'As duas frentes seguem um planejamento coordenado' },
        ],
        prefixo: 'Referência de investimento para projetos desse porte',
        preco: 'R$7.000/mês',
        nota: 'Verba de anúncios à parte',
        cta: 'Quero conectar essas duas frentes',
      },
      {
        slug: 'projetos-integrados-trip',
        nome: 'Projetos Integrados e Dicas Trip',
        gancho: 'Sua ideia envolve estratégia, divulgação ou experiências de turismo para a comunidade LGBT+?',
        blocos: [
          { t: 'Para quem', p: 'Empresas e parceiros que precisam de uma solução personalizada' },
          { t: 'O que vamos resolver', p: 'Organizar as frentes necessárias para apoiar o objetivo do projeto, considerando os interesses e as necessidades do público' },
          { t: 'Você recebe', p: 'Proposta personalizada de consultoria, produção, campanha ou parceria, com etapas e responsabilidades definidas' },
          { t: 'Por que vale a pena', p: 'Você combina as soluções do Ecossistema Dicas em um projeto pensado para sua realidade' },
        ],
        preco: 'Sob consulta',
        cta: 'Bora construir esse projeto',
      },
    ],
  },
];
