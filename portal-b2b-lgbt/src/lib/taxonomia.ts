// Taxonomia oficial de tags do Dicas LGBT+ (Rodada 63).
//
// Lista enviada pela Andrea em 08/10/2026. Este arquivo existe IGUAL em
// dois lugares — mantenha os dois em sincronia:
//   • app:    src/lib/taxonomia.ts
//   • portal: portal-b2b-lgbt/src/lib/taxonomia.ts
//
// No banco gravamos o "slug" de cada tag (sem acento, minúsculo, com _),
// nunca o texto — assim dá pra corrigir um rótulo ou traduzir sem perder
// o que já foi cadastrado. Ex.: "Café da manhã" → "cafe_da_manha".

export type GrupoTags = { id: string; titulo: string; tags: string[] };

export function slugTag(label: string): string {
  return label
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\+/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

// Mapa slug → rótulo de TODAS as listas abaixo (preenchido no fim do arquivo).
const ROTULOS: Record<string, string> = {};
export function rotuloTag(slug: string): string {
  return ROTULOS[slug] || slug.replace(/_/g, ' ');
}

// Selos que o próprio parceiro NÃO marca — só a equipe concede.
export const TAGS_RESERVADAS = ['parceiro_fundador', 'verificado_pelo_dicas'];

// ─────────────────────────── HOSPEDAGEM ───────────────────────────

export const TIPOS_HOSPEDAGEM = [
  'Hotel', 'Pousada', 'Hostel', 'Resort', 'Flat', 'Apart-hotel', 'Hotel boutique',
  'Hotel fazenda', 'Casa', 'Apartamento', 'Chalé', 'Camping', 'Glamping',
];

export const GRUPOS_HOSPEDAGEM: GrupoTags[] = [
  { id: 'comodidades', titulo: 'Comodidades', tags: [
    'Café da manhã', 'Restaurante', 'Bar', 'Rooftop', 'Piscina', 'Piscina aquecida', 'Academia',
    'Wi-Fi', 'Estacionamento', 'Coworking', 'Cozinha compartilhada', 'Churrasqueira', 'Heliponto',
  ] },
  { id: 'quartos', titulo: 'Características dos quartos', tags: [
    'Ar-condicionado', 'Varanda', 'Vista para o mar', 'Vista para a cidade', 'Banheira', 'Frigobar',
    'Cozinha', 'Smart TV', 'Cofre', 'Cama king', 'Suíte', 'Quarto privativo', 'Quarto compartilhado',
    'Quarto familiar', 'Quarto personalizado LGBT+', 'Isolamento acústico',
  ] },
  { id: 'acessibilidade', titulo: 'Acessibilidade', tags: [
    'Elevador', 'Rampa de acesso', 'Banheiro adaptado', 'Quarto adaptado', 'Piso tátil',
    'Atendimento em Libras', 'Acesso para cadeirantes',
  ] },
  { id: 'perfil', titulo: 'Perfil da experiência', tags: [
    'Romântico', 'Econômico', 'Luxo', 'Descanso', 'Família', 'Amigos', 'Casais', 'Grupos', 'Trabalho',
    'Lua de mel', 'Vida noturna', 'Contato com a natureza', 'Viagem solo', 'Longa estadia',
  ] },
  { id: 'localizacao', titulo: 'Localização', tags: [
    'Pé na areia', 'Beira-mar', 'Centro', 'Próximo ao metrô', 'Próximo ao aeroporto',
    'Próximo à vida noturna', 'Região turística', 'Campo', 'Montanha', 'Em meio à natureza',
  ] },
  { id: 'servicos', titulo: 'Serviços ao hóspede', tags: [
    'Concierge', 'Recepção 24h', 'Atendimento multilíngue', 'Mensageiro', 'Valet', 'Mordomo',
    'Room service', 'Despertador', 'Guarda-volumes', 'Lavanderia',
  ] },
  { id: 'transporte', titulo: 'Transporte e turismo', tags: [
    'Transfer aeroporto', 'Transporte privativo', 'Aluguel de carros', 'Aluguel de bicicletas',
    'Agendamento de passeios', 'Venda de ingressos', 'Guia turístico', 'Roteiros personalizados',
    'Motorista particular',
  ] },
  { id: 'bem_estar', titulo: 'Bem-estar', tags: [
    'Spa', 'Massagens', 'Sauna', 'Hidromassagem', 'Salão de beleza', 'Yoga', 'Meditação',
    'Personal trainer', 'Tratamentos estéticos', 'Terapias corporais',
  ] },
  { id: 'politicas', titulo: 'Serviços e políticas', tags: [
    'Pet friendly', 'Day use', 'Late check-out', 'Check-in antecipado', 'Cancelamento flexível',
    'Aceita eventos', 'Aceita crianças', 'Somente adultos',
  ] },
  { id: 'diversidade', titulo: 'Diversidade e acolhimento', tags: [
    'Acolhimento LGBT+', 'Política antidiscriminação', 'Respeito ao nome social', 'Atendimento inclusivo',
    'Equipe treinada', 'Banheiro sem gênero', 'Parceiro Fundador', 'Verificado pelo Dicas',
  ] },
];

// Espaços que o hotel cadastra com foto (como "Conheça os quartos").
export const TIPOS_ESPACO = [
  { id: 'quarto', titulo: 'Quartos' },
  { id: 'area_comum', titulo: 'Áreas em comum' },
  { id: 'lazer', titulo: 'Lazer' },
] as const;
export type TipoEspaco = (typeof TIPOS_ESPACO)[number]['id'];

// ───────────────────────── LOCAIS PRÓXIMOS ─────────────────────────
// `auto`: calculado sozinho a partir dos locais/eventos já cadastrados no
// app (pela categoria). Os demais o hotel indica no portal (nome + endereço)
// e a equipe valida a localização antes de aparecer.

export type TipoProximo = { id: string; label: string; icone: string; auto?: boolean };
export const TIPOS_PROXIMOS: TipoProximo[] = [
  { id: 'bares_lgbt', label: 'Bares LGBT+', icone: 'coffee', auto: true },
  { id: 'festas_lgbt', label: 'Festas LGBT+', icone: 'music', auto: true },
  { id: 'casas_noturnas', label: 'Casas noturnas', icone: 'moon', auto: true },
  { id: 'restaurantes', label: 'Restaurantes', icone: 'feather', auto: true },
  { id: 'cafes', label: 'Cafés', icone: 'coffee', auto: true },
  { id: 'espacos_18', label: 'Espaços 18+', icone: 'lock', auto: true },
  { id: 'saunas', label: 'Saunas', icone: 'droplet', auto: true },
  { id: 'centros_culturais', label: 'Centros culturais', icone: 'book-open', auto: true },
  { id: 'teatros', label: 'Teatros', icone: 'film' },
  { id: 'cinemas', label: 'Cinemas', icone: 'film' },
  { id: 'museus', label: 'Museus', icone: 'book' },
  { id: 'pontos_turisticos', label: 'Pontos turísticos', icone: 'camera' },
  { id: 'praias', label: 'Praias', icone: 'sun' },
  { id: 'praias_lgbt', label: 'Praias LGBT+', icone: 'sun' },
  { id: 'parques', label: 'Parques', icone: 'wind' },
  { id: 'shopping_centers', label: 'Shopping centers', icone: 'shopping-bag' },
  { id: 'comercio_local', label: 'Comércio local', icone: 'shopping-cart' },
  { id: 'academias', label: 'Academias', icone: 'activity' },
  { id: 'farmacias', label: 'Farmácias', icone: 'plus-square' },
  { id: 'hospitais', label: 'Hospitais', icone: 'plus-circle' },
  { id: 'delegacias', label: 'Delegacias', icone: 'shield' },
  { id: 'metro', label: 'Metrô', icone: 'navigation' },
  { id: 'estacoes_de_trem', label: 'Estações de trem', icone: 'navigation' },
  { id: 'terminais_rodoviarios', label: 'Terminais rodoviários', icone: 'truck' },
  { id: 'aeroportos', label: 'Aeroportos', icone: 'send' },
  { id: 'pontos_de_taxi', label: 'Pontos de táxi', icone: 'map-pin' },
  { id: 'ciclovias', label: 'Ciclovias', icone: 'git-commit' },
  { id: 'centros_de_convencoes', label: 'Centros de convenções', icone: 'briefcase' },
  { id: 'regioes_de_vida_noturna', label: 'Regiões de vida noturna', icone: 'moon' },
  { id: 'polos_lgbt', label: 'Polos LGBT+', icone: 'heart' },
  { id: 'percurso_da_parada_lgbt', label: 'Percurso da Parada LGBT+', icone: 'flag' },
  { id: 'eventos_lgbt', label: 'Eventos LGBT+', icone: 'calendar', auto: true },
  { id: 'ongs_e_centros_de_acolhimento', label: 'ONGs e centros de acolhimento', icone: 'users' },
];

// ───────────────────────────── DESTINOS ─────────────────────────────

export const GRUPOS_DESTINO: GrupoTags[] = [
  { id: 'gerais', titulo: 'Tags do destino', tags: [
    'Praia', 'Cultura', 'Gastronomia', 'Vida noturna', 'Natureza', 'História', 'Arquitetura', 'Compras',
    'Romance', 'Aventura', 'Ecoturismo', 'Bem-estar', 'Família', 'Amigos', 'Viagem solo', 'Destino LGBT+',
    'Destino urbano', 'Destino internacional',
  ] },
  { id: 'onde_ficar', titulo: 'Onde ficar', tags: [
    'Hotel', 'Pousada', 'Hostel', 'Resort', 'Flat', 'Apart-hotel', 'Hotel boutique', 'Hotel fazenda',
    'Casa', 'Apartamento', 'Chalé', 'Camping', 'Glamping', 'Luxo', 'Econômico', 'Romântico',
    'Pet friendly', 'Acessível', 'Vida noturna próxima', 'Praia próxima', 'Transporte próximo',
    'Acolhimento LGBT+', 'Parceiro Fundador', 'Verificado pelo Dicas',
  ] },
  { id: 'praias_passeios', titulo: 'Praias e passeios', tags: [
    'Praia urbana', 'Praia LGBT+', 'Praia naturista', 'Praia tranquila', 'Praia movimentada', 'Quiosques',
    'Passeio de barco', 'Mergulho', 'Trilhas', 'Cachoeiras', 'Parques', 'Mirantes', 'Ilhas', 'City tour',
    'Centro histórico', 'Museus', 'Monumentos', 'Pontos turísticos', 'Passeio cultural',
    'Passeio gastronômico', 'Turismo de aventura', 'Ecoturismo', 'Bate-volta', 'Guia turístico',
    'Acessibilidade',
  ] },
  { id: 'experiencias', titulo: 'Experiências LGBT+', tags: [
    'Bares LGBT+', 'Festas LGBT+', 'Baladas', 'Saunas', 'Espaços 18+', 'Cafés', 'Restaurantes', 'Rooftops',
    'Drag shows', 'Shows', 'Teatros', 'Cinema', 'Arte', 'Cultura queer', 'Compras', 'Moda', 'Bem-estar',
    'Esportes', 'Encontros', 'Experiências românticas', 'Experiências gastronômicas',
    'Experiências lésbicas', 'Experiências gays', 'Experiências trans', 'Experiências inclusivas',
  ] },
  { id: 'eventos_paradas', titulo: 'Eventos e Paradas', tags: [
    'Parada LGBT+', 'Carnaval', 'Blocos LGBT+', 'Festival', 'Festa', 'Show', 'Drag show', 'Evento cultural',
    'Evento gastronômico', 'Evento esportivo', 'Teatro', 'Exposição', 'Feira', 'Congresso', 'Conferência',
    'Networking', 'Evento gratuito', 'Evento ao ar livre', 'Evento beneficente', 'Réveillon', 'Halloween',
    'Pré-venda', 'Ingressos disponíveis',
  ] },
  { id: 'roteiros', titulo: 'Roteiros', tags: [
    'Um dia', 'Fim de semana', 'Três dias', 'Cinco dias', 'Sete dias', 'Praias', 'Cultura', 'Gastronomia',
    'Vida noturna', 'Romântico', 'Econômico', 'Luxo', 'Aventura', 'Descanso', 'Natureza', 'Histórico',
    'Compras', 'Carnaval', 'Parada LGBT+', 'Viagem solo', 'Casais', 'Amigos', 'Família', 'Acessível',
    'Sem carro', 'Bate-volta',
  ] },
  { id: 'melhor_epoca', titulo: 'Melhor época', tags: [
    'Verão', 'Outono', 'Inverno', 'Primavera', 'Alta temporada', 'Baixa temporada', 'Clima seco',
    'Clima quente', 'Temporada de praias', 'Temporada cultural', 'Temporada de festas', 'Carnaval',
    'Parada LGBT+', 'Réveillon', 'Feriados', 'Festivais', 'Eventos especiais',
  ] },
  { id: 'duracao', titulo: 'Duração e planejamento', tags: [
    'Meio período', 'Dia inteiro', 'Fim de semana', 'Viagem curta', 'Viagem prolongada',
    'Reserva antecipada', 'Entrada gratuita', 'Ingresso obrigatório', 'Agendamento necessário',
    'Funcionamento sazonal', 'Ideal durante o dia', 'Ideal à noite', 'Ideal com chuva', 'Ideal com sol',
  ] },
];

// ───────────────────────────── EVENTOS ─────────────────────────────

export const GRUPOS_EVENTO: GrupoTags[] = [
  { id: 'tipo', titulo: 'Tipo de evento', tags: [
    'Festa', 'Balada', 'Parada', 'Bloco', 'Carnaval', 'Festival', 'Show', 'Drag show', 'Teatro', 'Stand-up',
    'Performance', 'Exposição', 'Cinema', 'Feira', 'Congresso', 'Conferência', 'Workshop', 'Networking',
    'Encontro', 'Gastronomia', 'Pool party', 'Pré-festa', 'After',
  ] },
  { id: 'musica', titulo: 'Estilo musical', tags: [
    'Pop', 'Funk', 'Eletrônica', 'Tribal', 'House', 'Techno', 'Disco', 'Brasilidades', 'MPB', 'Samba',
    'Pagode', 'Sertanejo', 'Forró', 'Axé', 'Rock Doido', 'Tecnomelody', 'Rock', 'Reggaeton', 'Hip-hop',
    'Trap', 'K-pop', 'Música ao vivo', 'DJ', 'Open format',
  ] },
  { id: 'publico', titulo: 'Público', tags: [
    'Todos os públicos', 'Predominância gay', 'Predominância lésbica', 'Público trans', 'Público queer',
    'Pessoas não binárias', 'Ursos', '50+', 'Jovens', 'Famílias', 'Aliados', 'Turistas',
  ] },
  { id: 'ingresso', titulo: 'Entrada e ingresso', tags: [
    'Gratuito', 'Pago', 'Lista gratuita', 'Lista VIP', 'Fila exclusiva', 'Último lote', 'Desconto no app',
    'Cupom disponível', 'Open bar', 'Consumação', 'Entrada antecipada', 'Vagas limitadas',
    'Lista de espera', 'Esgotado',
  ] },
  { id: 'quando', titulo: 'Quando', tags: [
    'Hoje', 'Amanhã', 'Fim de semana', 'Diurno', 'Noturno', 'Madrugada', 'Semanal', 'Quinzenal', 'Mensal',
    'Sazonal', 'Evento único',
  ] },
  { id: 'estrutura', titulo: 'Estrutura', tags: [
    'Acessibilidade', 'Atendimento em Libras', 'Banheiro adaptado', 'Banheiro sem gênero', 'Área externa',
    'Área coberta', 'Área fumante', 'Praça de alimentação', 'Bar', 'Guarda-volumes', 'Estacionamento',
    'Valet', 'Próximo ao metrô', 'Pet friendly',
  ] },
  { id: 'ambiente', titulo: 'Ambiente e clima', tags: [
    'Ao ar livre', 'Ambiente fechado', 'Casa noturna', 'Camarote', 'Área VIP', 'Mezanino', 'Parklet',
    'Rooftop', 'Pé na areia', 'Vista panorâmica', 'Experiência imersiva', 'Cultural', 'Romântico',
    'Para dançar', 'Para conhecer pessoas', 'Para ir com amigos', 'Arte e diversidade', 'Orgulho LGBT+',
  ] },
  { id: 'classificacao', titulo: 'Classificação', tags: ['Livre', '16+', '18+', 'Parceiro Fundador', 'Verificado pelo Dicas'] },
];

// "Hoje", "Amanhã" e "Fim de semana" o app já calcula pela data do evento —
// não precisam ser marcados no cadastro.
export const TAGS_EVENTO_AUTOMATICAS = ['hoje', 'amanha', 'fim_de_semana'];

// Equivalência com o enum antigo eventos.estilos_musicais / publico_tags,
// pra eventos cadastrados antes da Rodada 63 continuarem aparecendo nos filtros.
export const LEGADO_EVENTO: Record<string, string[]> = {
  funk: ['funk'],
  pop: ['pop_eletronica'],
  eletronica: ['pop_eletronica'],
  sertanejo: ['sertanejo'],
  drag_show: ['drag_cabare', 'drag'],
  mpb: ['mpb_samba'],
  samba: ['mpb_samba'],
  techno: ['techno_house'],
  house: ['techno_house'],
  rock: ['rock'],
  forro: ['forro'],
  predominancia_gay: ['gay'],
  predominancia_lesbica: ['lesbica'],
  publico_trans: ['trans'],
  publico_queer: ['queer'],
  pessoas_nao_binarias: ['nao_binario'],
  ursos: ['ursos'],
  aliados: ['aliados'],
  todos_os_publicos: ['todos', 'misto_lgbt'],
};

// ─────────────────────────────────────────────────────────────────────
for (const lista of [GRUPOS_HOSPEDAGEM, GRUPOS_DESTINO, GRUPOS_EVENTO]) {
  for (const g of lista) for (const t of g.tags) ROTULOS[slugTag(t)] = t;
}
for (const t of TIPOS_HOSPEDAGEM) ROTULOS[slugTag(t)] = t;
for (const t of TIPOS_PROXIMOS) ROTULOS[t.id] = t.label;

// ──────────────────── CADASTRO COMPLETO DE HOSPEDAGEM (Rodada 64) ────────────────────

export const IDIOMAS_ATENDIMENTO = ['Português', 'Inglês', 'Espanhol', 'Francês', 'Italiano', 'Alemão', 'Libras'];

export const FORMAS_PAGAMENTO = ['Pix', 'Cartão de crédito', 'Cartão de débito', 'Dinheiro', 'Transferência', 'Parcelamento'];

export const TIPOS_CANCELAMENTO = [
  { id: 'flexivel', label: 'Flexível', ajuda: 'Reembolso total até 24h antes do check-in' },
  { id: 'moderada', label: 'Moderada', ajuda: 'Reembolso total até 5 dias antes' },
  { id: 'rigida', label: 'Rígida', ajuda: 'Reembolso parcial até 7 dias antes' },
  { id: 'nao_reembolsavel', label: 'Não reembolsável', ajuda: 'Sem reembolso após a reserva' },
  { id: 'personalizada', label: 'Personalizada', ajuda: 'Descreva a regra no campo abaixo' },
] as const;

// Compromissos de acolhimento que a hospedagem declara (etapa 6). Base do
// selo "Verificado pelo Dicas", conferido pela equipe.
export const COMPROMISSOS_ACOLHIMENTO = [
  { id: 'politica_escrita', label: 'Temos política antidiscriminação por escrito', ajuda: 'Documento interno ou cláusula no código de conduta' },
  { id: 'nome_social', label: 'Respeitamos o nome social no check-in e em todo o atendimento', ajuda: 'Inclusive em sistemas, crachás e comunicações' },
  { id: 'casais_sem_restricao', label: 'Casais LGBT+ reservam qualquer tipo de quarto sem restrição', ajuda: 'Cama de casal, suítes, sem perguntas ou constrangimento' },
  { id: 'equipe_treinada', label: 'A equipe passou por treinamento de diversidade nos últimos 12 meses', ajuda: 'Treinamento interno, ONG parceira ou curso' },
  { id: 'canal_denuncia', label: 'Temos canal para hóspedes relatarem discriminação', ajuda: 'E-mail, WhatsApp ou formulário, com resposta da gestão' },
  { id: 'banheiro_neutro', label: 'Áreas comuns têm banheiro sem gênero ou uso livre por identidade', ajuda: '' },
  { id: 'comunicacao_inclusiva', label: 'Usamos comunicação e imagens inclusivas (site, redes, materiais)', ajuda: '' },
  { id: 'fornecedores_lgbt', label: 'Apoiamos fornecedores, artistas ou causas LGBT+', ajuda: 'Compras, eventos, doações ou parcerias' },
] as const;

export const TERMO_ACOLHIMENTO =
  'Declaro que as informações deste cadastro são verdadeiras e que esta hospedagem se compromete a acolher ' +
  'pessoas LGBT+ com respeito, sem qualquer forma de discriminação por orientação sexual, identidade ou ' +
  'expressão de gênero. Autorizo a equipe Dicas LGBT+ a verificar as informações (inclusive por visita ou ' +
  'cliente oculto) e entendo que o selo "Verificado pelo Dicas" pode ser retirado em caso de denúncia confirmada.';

// Checklist interno da equipe ao validar uma hospedagem (/admin).
export const CHECKLIST_EQUIPE_HOSPEDAGEM = [
  { id: 'cadastur', label: 'Cadastur conferido no site oficial (ativo e com o mesmo CNPJ/nome)' },
  { id: 'endereco', label: 'Endereço e pino do mapa conferidos' },
  { id: 'fotos', label: 'Fotos reais, boa qualidade, sem marca d’água de outros sites' },
  { id: 'quartos', label: 'Quartos com informações e preços coerentes' },
  { id: 'reserva', label: 'Canal de reserva testado (link abre / WhatsApp responde)' },
  { id: 'acolhimento', label: 'Compromissos de acolhimento e comprovante conferidos' },
  { id: 'reputacao', label: 'Avaliações públicas sem relatos de LGBTfobia' },
  { id: 'contato', label: 'Conversa ou visita com a gestão realizada' },
] as const;

// ─────────────────────── ROTEIROS E EXPERIÊNCIAS (Rodada 69) ───────────────────────
// Lista enviada pela Andrea em 10/10/2026. Cada roteiro mostra no máximo 8
// tags principais (ROTEIRO_MAX_TAGS_VISIVEIS); as demais ficam nos filtros e
// na página detalhada.

export const ROTEIRO_MAX_TAGS_VISIVEIS = 8;

export const GRUPOS_ROTEIRO: GrupoTags[] = [
  { id: 'formato', titulo: 'Formato', tags: [
    'Roteiro completo', 'Experiência', 'Passeio', 'City tour', 'Walking tour', 'Tour guiado', 'Autoguiado',
    'Circuito', 'Bate-volta', 'Imersão', 'Workshop', 'Excursão', 'Cruzeiro', 'Passeio de barco',
  ] },
  { id: 'duracao', titulo: 'Duração', tags: [
    'Até 2 horas', 'Meio período', 'Dia inteiro', '1 dia', 'Fim de semana', '2 dias', '3 dias', '5 dias',
    '7 dias', 'Longa duração',
  ] },
  { id: 'tema', titulo: 'Tema', tags: [
    'Cultura', 'História', 'Gastronomia', 'Vida noturna', 'Praias', 'Natureza', 'Aventura', 'Arte',
    'Arquitetura', 'Música', 'Compras', 'Bem-estar', 'Fotografia', 'Esportes', 'Romance', 'Religião',
    'Ecoturismo', 'Turismo urbano',
  ] },
  { id: 'lgbt', titulo: 'Experiências LGBT+', tags: [
    'História LGBT+', 'Cultura queer', 'Arte queer', 'Vida noturna LGBT+', 'Bares LGBT+', 'Festas LGBT+',
    'Empreendedorismo LGBT+', 'Negócios LGBT+', 'Drag culture', 'Parada LGBT+', 'Carnaval LGBT+',
    'Gastronomia LGBT+', 'Locais históricos LGBT+', 'Roteiro de diversidade', 'Acolhimento LGBT+',
    'Casais LGBT+', 'Viagem solo LGBT+',
  ] },
  { id: 'publico', titulo: 'Público', tags: [
    'Todos os públicos', 'Gays', 'Lésbicas', 'Bissexuais', 'Pessoas trans', 'Pessoas não binárias',
    'Público queer', 'Ursos', '50+', 'Jovens', 'Casais', 'Solteiros', 'Famílias LGBT+', 'Aliados', 'Turistas',
  ] },
  { id: 'perfil', titulo: 'Perfil da viagem', tags: [
    'Viagem solo', 'Casais', 'Amigos', 'Família diversa', 'Grupos', 'Romântico', 'Econômico', 'Luxo',
    'Descanso', 'Aventura', 'Para conhecer pessoas', 'Primeira viagem', 'Moradores locais',
    'Turistas internacionais',
  ] },
  { id: 'horario', titulo: 'Horário', tags: ['Manhã', 'Tarde', 'Noite', 'Madrugada', 'Nascer do sol', 'Pôr do sol', 'Diurno', 'Noturno'] },
  { id: 'deslocamento', titulo: 'Deslocamento', tags: [
    'A pé', 'Metrô', 'Ônibus', 'Bicicleta', 'Carro', 'Van', 'Barco', 'Transporte incluído',
    'Transporte público', 'Motorista particular', 'Sem carro',
  ] },
  { id: 'entrada', titulo: 'Entrada e reserva', tags: [
    'Grátis', 'Pago', 'Reserva obrigatória', 'Reserva recomendada', 'Ingresso incluso', 'Ingresso separado',
    'Desconto no app', 'Cupom disponível', 'Vagas limitadas', 'Lista de espera', 'Cancelamento flexível',
  ] },
  { id: 'acessibilidade', titulo: 'Acessibilidade', tags: [
    'Acessível', 'Rota acessível', 'Cadeirantes', 'Atendimento em Libras', 'Audiodescrição',
    'Banheiro adaptado', 'Transporte adaptado', 'Mobilidade reduzida',
  ] },
  { id: 'caracteristicas', titulo: 'Características', tags: [
    'Ao ar livre', 'Área coberta', 'Pet friendly', 'Guia turístico', 'Guia LGBT+', 'Atendimento multilíngue',
    'Experiência privativa', 'Experiência em grupo', 'Com alimentação', 'Com bebidas', 'Com fotos',
    'Inclui hospedagem', 'Clima favorável', 'Funciona com chuva',
  ] },
  { id: 'comercial', titulo: 'Identificações comerciais', tags: [
    'Destaque', 'Parceiro Fundador', 'Curadoria Dicas', 'Verificado pelo Dicas', 'Mais procurado', 'Novidade',
  ] },
];

// Identificações comerciais: só a equipe marca (nunca o parceiro).
export const TAGS_ROTEIRO_EQUIPE = ['destaque', 'parceiro_fundador', 'curadoria_dicas', 'verificado_pelo_dicas', 'mais_procurado', 'novidade'];

// "Escolha sua experiência" — atalhos de tema com ícone (Feather).
export const TEMAS_ATALHO = [
  { slug: 'cultura', label: 'Cultura', icone: 'book-open', cor: '#E1306C' },
  { slug: 'gastronomia', label: 'Gastronomia', icone: 'coffee', cor: '#FFD54F' },
  { slug: 'vida_noturna', label: 'Vida noturna', icone: 'moon', cor: '#B39DDB' },
  { slug: 'natureza', label: 'Natureza', icone: 'feather', cor: '#4CAF7D' },
  { slug: 'praias', label: 'Praias', icone: 'sun', cor: '#4FC3F7' },
  { slug: 'compras', label: 'Compras', icone: 'shopping-bag', cor: '#FFB74D' },
  { slug: 'historia_lgbt', label: 'História LGBT+', icone: 'flag', cor: '#E1306C' },
  { slug: 'arte', label: 'Arte', icone: 'image', cor: '#F48FB1' },
];

for (const g of GRUPOS_ROTEIRO) for (const t of g.tags) if (!ROTULOS[slugTag(t)]) ROTULOS[slugTag(t)] = t;
