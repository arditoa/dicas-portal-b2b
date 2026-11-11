// Subcategorias definidas por categoria (out/2026, lista da Andrea — até 8 por categoria). Viram os ícones redondos
// logo abaixo do banner rotativo nas páginas de categoria. O cadastro do local tem texto livre (o portal sugere estes
// nomes); cada subcategoria reconhece o nome dela e sinônimos comuns (sem diferenciar maiúscula nem acento).
// Quem não encaixa em nenhuma cai em "Outros". Espelho no portal: portal-b2b-lgbt/src/lib/subcategoriasApp.ts —
// mantenha as duas listas iguais (a chave é o rótulo sem acento e em minúsculas).
// Chave = categoria REAL do banco (categoria_tipo): Bares & Vida Noturna = 'lugares'. As categorias ainda "Em breve"
// (festas, saude, beleza, mais18) já têm a lista pronta e passam a aparecer quando ganharem categoriaReal.
// `curto` = nome enxuto que cabe sob o ícone redondo; `rotulo` = nome completo (cadastro, portal, acessibilidade).
export type SubDef = { chave: string; rotulo: string; curto: string; icone: string; palavras: string[]; breve?: boolean }; // breve = ainda não abriu (ícone "em breve")

export const normTxt = (s?: string | null) =>
  (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();

const def = (rotulo: string, curto: string, icone: string, palavras: string[]): SubDef => ({ chave: normTxt(rotulo), rotulo, curto, icone, palavras: palavras.map(normTxt) });

export const SUBCATEGORIAS: Record<string, SubDef[]> = {
  // Bares & Vida Noturna
  lugares: [
    def('Botecos & Bares Tradicionais', 'Botecos e Bares', 'users', ['bar', 'bares', 'bar lgbt', 'boteco', 'botequim', 'bar tradicional', 'petiscos', 'cerveja de garrafa']),
    def('Café Bar & Bar e Restaurante', 'Café Bar e Restaurante', 'coffee', ['cafe bar', 'bar e restaurante', 'bar restaurante', 'bar & restaurante', 'bar-restaurante']),
    def('Pubs e Cervejarias', 'Pubs e Cervejarias', 'droplet', ['pubs & cervejarias', 'pub', 'pubs', 'choperia', 'chopperia', 'cervejaria', 'cervejaria artesanal', 'brewpub', 'taproom', 'chopp artesanal']),
    def('Coquetelaria', 'Coquetelaria', 'triangle', ['coquetelaria & speakeasies', 'coquetelarias', 'drinks', 'drink', 'mixologia', 'speakeasy', 'cocktail', 'coquetel', 'bar de drinks']),
    def('Bares com Atrações & Música ao Vivo', 'Atrações e Música ao vivo', 'music', ['musica ao vivo & rodas de samba', 'musica ao vivo', 'ao vivo', 'show', 'shows', 'sertanejo', 'pagode', 'samba', 'roda de samba', 'forro', 'mpb', 'jazz', 'rock', 'banda', 'bares interativos & esportes', 'karaoke', 'karaoke bar', 'sinuca', 'fliperama', 'jogos de tabuleiro', 'sports bar', 'bar esportivo', 'telao', 'boliche', 'bar com atracoes', 'bares com atracoes', 'atracoes']),
    def('Wine Bar', 'Wine Bar', 'heart', ['wine bars', 'vinho', 'vinhos', 'enoteca', 'adega', 'espumante']),
    def('Gastrobar e Lounges', 'Gastrobar e Lounges', 'sun', ['gastrobares & lounges', 'gastrobar', 'gastrobares', 'lounge', 'lounges', 'rooftop', 'rooftops', 'terraco', 'sky bar', 'skybar']),
    def('Casas Noturnas & Boates', 'Baladas e Boates', 'disc', ['balada', 'baladas', 'baladas e clubes', 'club', 'clube', 'boate', 'boates', 'night', 'nightclub', 'casa noturna', 'dance', 'danceteria', 'drag', 'drag show', 'drag e shows', 'cabare', 'cabaret', 'performance']),
  ],
  // Festas & Eventos
  festas: [
    // Nov/2026: subcategoria = TIPO de evento (o mesmo do cadastro). "Para quem" (Lésbica/Gay/Todos), estilo musical e
    // formato ficam em Filtros. Os rótulos batem com TIPOS_EVENTO_CHIPS em (tabs)/events.tsx, que faz o filtro pelas tags.
    def('Festas e baladas', 'Festas e baladas', 'disc', []),
    def('Shows', 'Shows', 'mic', []),
    def('Drag shows', 'Drag shows', 'star', []),
    def('Teatro', 'Teatro', 'film', []),
    def('Aulas de dança', 'Aulas de dança', 'music', []),
    def('Cultura e encontros', 'Cultura e encontros', 'users', []),
  ],
  // Artistas (nov/2026): Banda e Solo pedidos pela Andrea; as demais são sugestão. Todas abertas.
  artistas: [
    def('Banda', 'Banda', 'music', ['banda', 'bandas', 'grupo', 'grupo musical', 'conjunto', 'duo', 'dupla', 'trio', 'quarteto', 'coletivo musical', 'cover', 'banda cover', 'orquestra']),
    def('Solo', 'Solo', 'mic', ['solo', 'artista solo', 'cantor', 'cantora', 'cantores', 'cantoras', 'voz e violao', 'cantautor', 'musico', 'musica', 'instrumentista', 'mpb']),
    def('Drag Queens & Kings', 'Drag', 'star', ['drag', 'drags', 'drag queen', 'drag queens', 'drag king', 'drag kings', 'drag show', 'transformista', 'performer drag']),
    def('DJs', 'DJs', 'disc', ['dj', 'djs', 'dj set', 'set', 'produtor musical', 'selecao musical']),
    def('Humor & Stand-up', 'Humor', 'smile', ['humor', 'stand up', 'standup', 'stand-up', 'comediante', 'comedia', 'humorista']),
    def('Dança & Performance', 'Dança e Performance', 'activity', ['danca', 'bailarino', 'bailarina', 'performance', 'performer', 'cabare', 'cabaret', 'circo', 'acrobata', 'teatro']),
  ],
  // Gastronomia
  gastronomia: [
    def('Comida Brasileira & À la Carte', 'Brasileira e À la Carte', 'award', ['restaurantes tradicionais & a la carte', 'restaurante', 'restaurantes', 'a la carte', 'massas', 'carnes', 'cozinha regional', 'comida regional', 'self service', 'bistro', 'comida brasileira', 'brasileira', 'culinaria brasileira']),
    def('Hamburguerias, Lanches & Fast Food', 'Hambúrguer e Lanches', 'shopping-bag', ['hamburgueria', 'hamburguerias', 'hamburguer', 'lanche', 'lanches', 'lanchonete', 'fast food', 'sanduiche']),
    def('Pizzarias', 'Pizzarias', 'pie-chart', ['pizzarias & esfiharias', 'pizza', 'pizzaria', 'esfiha', 'esfiharia', 'esfirra']),
    def('Culinária Árabe, Oriental & Internacional', 'Culinária do Mundo', 'globe', ['culinaria japonesa & asiatica', 'japonesa', 'japones', 'sushi', 'temaki', 'asiatica', 'oriental', 'chinesa', 'coreana', 'tailandesa', 'culinaria japonesa', 'culinaria arabe', 'arabe', 'libanesa', 'kibe', 'comida oriental', 'culinaria internacional', 'internacional', 'italiana', 'mexicana', 'francesa', 'portuguesa', 'indiana', 'peruana', 'espanhola']),
    def('Cafeterias, Padarias, Docerias & Sorveterias', 'Cafés e Doces', 'coffee', ['cafeterias, docerias & padarias artesanais', 'cafe', 'cafes', 'cafeteria', 'cafeterias', 'doceria', 'docerias', 'padaria', 'padarias', 'confeitaria', 'sorveteria', 'brunch', 'cafeterias e padarias', 'docerias e sorveterias', 'sorvete', 'sorvetes', 'gelateria', 'acai']),
    def('Churrascarias', 'Churrasco', 'grid', ['churrascarias & parrillas', 'churrasco', 'churrascaria', 'parrilla', 'parrillas', 'rodizio', 'steakhouse']),
    def('Saudável, Vegano & Vegetariano', 'Saudável e Vegano', 'feather', ['saudavel', 'vegano', 'vegana', 'vegetariano', 'vegetariana', 'plant based', 'natural', 'fit', 'organico']),
    def('Frutos do Mar & Pescados', 'Frutos do Mar', 'anchor', ['frutos do mar', 'peixe', 'peixes', 'pescado', 'pescados', 'camarao', 'marisqueira', 'moqueca']),
  ],
  // Cultura
  cultura: [
    def('Cinemas', 'Cinemas', 'film', ['cinemas & cineclubes', 'cinema', 'cineclube', 'cineclubes', 'sala de cinema']),
    def('Teatros, Dança & Circo', 'Teatro e Dança', 'smile', ['teatro', 'teatros', 'danca', 'circo', 'espetaculo', 'cabare', 'ballet']),
    def('Museus, Galerias e Exposições', 'Museus e Galerias', 'image', ['museus, galerias & exposicoes', 'museu', 'museus', 'galeria', 'galerias', 'exposicao', 'exposicoes', 'arte', 'galeria de arte']),
    def('Centros Culturais', 'Centros Culturais', 'home', ['centros culturais & casas de memoria', 'centro cultural', 'casa de cultura', 'casa de memoria', 'memorial', 'espaco cultural', 'patrimonio historico & visitas guiadas', 'patrimonio', 'patrimonio historico', 'historico', 'visita guiada', 'visitas guiadas', 'tour historico', 'monumento']),
    def('Livrarias e Bibliotecas', 'Livrarias e Bibliotecas', 'book', ['livrarias, sebos & bibliotecas', 'livraria', 'livrarias', 'sebo', 'sebos', 'biblioteca', 'bibliotecas']),
    def('Shows Acústicos', 'Shows Acústicos', 'music', ['show acustico', 'acustico', 'shows acusticos & operas & orquestras', 'shows acusticos, operas & orquestras']),
    def('Óperas e Orquestras', 'Óperas e Orquestras', 'star', ['opera', 'operas', 'orquestra', 'orquestras', 'concerto', 'musica classica', 'sinfonica']),
    def('Saraus', 'Saraus', 'mic', ['saraus, batalhas de rima & slam', 'sarau', 'batalha de rima', 'batalhas de rima', 'slam', 'poesia', 'rima', 'rap']),
  ],
  // Serviços
  servicos: [
    def('Fotografia', 'Fotografia', 'camera', ['fotografia', 'fotografia e video', 'foto', 'fotos', 'fotografo', 'fotografa', 'video', 'videomaker', 'filmagem', 'audiovisual', 'cinegrafia', 'ensaio']),
    def('Jurídicos e Liberais', 'Jurídicos e Liberais', 'briefcase', ['juridico', 'juridicos', 'advocacia', 'advogado', 'advogada', 'direito', 'contabilidade', 'contador', 'contabil', 'cartorio', 'profissional liberal', 'profissionais liberais', 'liberais', 'consultoria']),
    def('Seguros e Finanças', 'Seguros e Finanças', 'shield', ['seguro', 'seguros', 'corretor', 'corretora', 'corretor de seguros', 'financas', 'financeiro', 'financeira', 'credito', 'investimento', 'investimentos', 'consorcio', 'previdencia', 'planejamento financeiro']),
    def('Comunicação e Marketing', 'Comunicação e Marketing', 'message-circle', ['comunicacao', 'marketing', 'comunicacao e marketing', 'publicidade', 'propaganda', 'social media', 'branding', 'midia', 'imprensa', 'assessoria', 'design', 'designer', 'ti', 'tecnologia', 'software', 'desenvolvimento', 'site', 'sites']),
    def('Eventos', 'Eventos', 'gift', ['eventos', 'evento', 'eventos e festas', 'buffet', 'cerimonial', 'locacao', 'decoracao', 'casamento', 'organizacao', 'festa', 'festas']),
  ],
  // Educação
  educacao: [
    def('Cursos Livres & Profissionalizantes', 'Cursos Livres', 'award', ['curso livre', 'cursos livres', 'profissionalizante', 'profissionalizantes', 'curso tecnico', 'gastronomia', 'mecanica', 'eletrica', 'corte e costura', 'curso']),
    def('Escolas & Educação Básica', 'Escolas', 'book', ['escola', 'escolas', 'educacao basica', 'ensino fundamental', 'ensino medio', 'educacao infantil', 'creche', 'colegio']),
    def('Faculdades, Universidades & Pós-Graduação', 'Faculdades', 'bookmark', ['faculdade', 'faculdades', 'universidade', 'universidades', 'pos graduacao', 'pos-graduacao', 'mba', 'graduacao', 'ensino superior']),
    def('Escolas de Idiomas', 'Idiomas', 'globe', ['idioma', 'idiomas', 'ingles', 'espanhol', 'frances', 'italiano', 'alemao', 'escola de idiomas', 'lingua']),
    def('Aulas Particulares & Reforço Escolar', 'Aulas Particulares', 'edit-3', ['aula particular', 'aulas particulares', 'reforco', 'reforco escolar', 'professor particular', 'tutoria', 'mentoria']),
    def('Preparatórios (Vestibulares, ENEM, Concursos)', 'Vestibular e Concursos', 'target', ['preparatorio', 'preparatorios', 'vestibular', 'enem', 'concurso', 'concursos', 'cursinho']),
    def('Cursos de Tecnologia & Programação', 'Tecnologia e Programação', 'code', ['tecnologia', 'programacao', 'programador', 'dados', 'ciencia de dados', 'desenvolvimento web', 'ti', 'bootcamp']),
    def('Artes, Música & Dança', 'Artes, Música e Dança', 'music', ['arte', 'artes', 'musica', 'danca', 'canto', 'violao', 'teatro', 'instrumento', 'aula de musica']),
  ],
  // Moda & Acessórios
  produtos: [
    // Nov/2026: a categoria 'produtos' passou a se chamar Moda & Acessórios (o valor interno continua 'produtos').
    def('Moda Feminina', 'Moda\nFeminina', 'shopping-bag', ['moda feminina', 'feminina', 'vestido', 'vestidos', 'blusa', 'blusas', 'moda mulher', 'roupa feminina', 'roupas femininas', 'moda', 'vestuario', 'roupa', 'roupas', 'confeccao']),
    def('Moda Masculina', 'Moda\nMasculina', 'user', ['moda masculina', 'masculina', 'camisa', 'camisas', 'moda homem', 'roupa masculina', 'roupas masculinas', 'alfaiataria']),
    def('Moda Sem Gênero & Pride', 'Sem Gênero\ne Pride', 'heart', ['moda sem genero', 'sem genero', 'genderless', 'unissex', 'pride', 'moda lgbt', 'moda lgbtqia', 'camiseta lgbt', 'bandeira', 'bandeiras', 'customizacao', 'estampas']),
    def('Calçados', 'Calçados', 'chevrons-up', ['calcado', 'calcados', 'sapato', 'sapatos', 'tenis', 'sandalia', 'sandalias', 'salto', 'bota', 'botas']),
    def('Bolsas, Óculos & Relógios', 'Bolsas, Óculos\ne Relógios', 'briefcase', ['bolsa', 'bolsas', 'mochila', 'mochilas', 'carteira', 'oculos', 'relogio', 'relogios', 'acessorio', 'acessorios', 'cinto', 'chapeu']),
    def('Joias, Semijoias & Bijuterias', 'Joias e Bijuterias', 'star', ['joia', 'joias', 'semijoia', 'semijoias', 'bijuteria', 'bijuterias', 'brinco', 'colar', 'pulseira', 'anel', 'prata']),
    def('Brechós & Moda Sustentável', 'Brechós', 'refresh-cw', ['brecho', 'brechos', 'sebo de roupas', 'moda sustentavel', 'segunda mao', 'vintage', 'upcycling', 'reuso']),
    def('Lingerie, Moda Íntima & Praia', 'Lingerie e Praia', 'sun', ['lingerie', 'moda intima', 'intima', 'cueca', 'cuecas', 'sutia', 'moda praia', 'praia', 'biquini', 'maio', 'sunga', 'pijama']),
  ],
  // Saúde & Bem-estar
  saude: [
    def('Psicologia, Terapia & Psiquiatria', 'Psicologia e Terapia', 'heart', ['psicologia', 'psicologo', 'psicologa', 'terapia', 'terapeuta', 'psiquiatria', 'psiquiatra', 'psicanalise']),
    def('Clínicas Médicas & Consultórios', 'Clínicas e Consultas', 'activity', ['clinica', 'clinicas', 'consultorio', 'consultorios', 'medico', 'medica', 'clinico geral', 'cardiologia', 'pediatria', 'ginecologia', 'dermatologia', 'endocrinologia', 'medicina']),
    def('Odontologia & Ortodontia', 'Odontologia', 'smile', ['odontologia', 'odonto', 'dentista', 'ortodontia', 'dentario', 'dentes']),
    def('Laboratórios & Exames de Imagem', 'Exames e Laboratório', 'eye', ['laboratorio', 'laboratorios', 'exame', 'exames', 'imagem', 'radiologia', 'diagnostico', 'ultrassom']),
    def('Farmácias, Drogarias & Manipulação', 'Farmácias', 'plus-square', ['farmacia', 'farmacias', 'drogaria', 'drogarias', 'manipulacao', 'manipulado']),
    def('Fisioterapia, Quiropraxia & Reabilitação', 'Fisioterapia', 'user-check', ['fisioterapia', 'fisioterapeuta', 'quiropraxia', 'reabilitacao', 'pilates', 'rpg', 'osteopatia']),
    def('Nutrição & Nutrologia', 'Nutrição', 'feather', ['nutricao', 'nutricionista', 'nutrologia', 'nutrologo', 'dieta']),
  ],
  // Beleza & Estética
  beleza: [
    def('Salões de Beleza & Cabeleireiros', 'Salões', 'scissors', ['salao', 'saloes', 'salao de beleza', 'cabelereiro', 'cabelereiros', 'cabeleireiro', 'cabeleireiros', 'cabelo', 'corte', 'tintura', 'coloracao', 'penteado', 'hair']),
    def('Barbearias', 'Barbearias', 'user', ['barbearias & barbaterapia', 'barbearia', 'barbeiro', 'barbaterapia', 'barba']),
    def('Manicure e Pedicure', 'Manicure e Pedicure', 'droplet', ['unhas, manicure & pedicure', 'unha', 'unhas', 'manicure', 'pedicure', 'nail', 'alongamento', 'esmaltacao']),
    def('Sobrancelhas, Cílios & Micropigmentação', 'Sobrancelhas e Cílios', 'eye', ['design de sobrancelhas, cilios & micropigmentacao', 'sobrancelha', 'sobrancelhas', 'cilios', 'micropigmentacao', 'design de sobrancelhas', 'lash', 'brow']),
    def('Estética Facial', 'Estética Facial', 'smile', ['limpeza de pele', 'peeling', 'botox', 'harmonizacao', 'harmonizacao facial', 'preenchimento', 'dermato']),
    def('Estética Corporal e Massoterapia', 'Corporal e Massagem', 'wind', ['estetica corporal & massoterapia', 'estetica corporal', 'massoterapia', 'massagem', 'drenagem', 'drenagem linfatica', 'modeladora', 'spa', 'estetica']),
    def('Depilação e Laser', 'Depilação e Laser', 'zap', ['depilacao & laser', 'depilacao', 'depilacao a laser', 'laser', 'cera', 'epilacao']),
    def('Maquiagem', 'Maquiagem', 'star', ['maquiagem social & noivas', 'make', 'makeup', 'maquiador', 'maquiadora', 'noiva', 'noivas', 'automaquiagem']),
  ],
  // Espaços 18+
  mais18: [
    def('Festas 18+', 'Festas 18+', 'zap', ['festa 18+', 'festas 18', 'festa 18', 'festa adulta', 'festas adultas', 'festa erotica']),
    def('Sex Shops', 'Sex Shops', 'shopping-bag', ['sex shops & lingeries sensuais', 'sex shop', 'sexshop', 'lingerie', 'lingeries', 'lingerie sensual', 'erotico', 'produtos eroticos']),
    def('Motéis & Suítes Temáticas', 'Motéis', 'key', ['motel', 'moteis', 'suite', 'suites tematicas', 'love hotel']),
    def('Cruising Bar & Dark Room', 'Cruising e Dark Room', 'lock', ['cruising', 'cruising bar', 'dark room', 'darkroom', 'dark-room']),
    def('Cinemas & Cabines Adultas', 'Cinemas e Cabines', 'film', ['cinema adulto', 'cabine', 'cabines', 'cabines adultas', 'cinema porno', 'cinema 18+', 'cinema 18']),
    def('Casas Noturnas, Boates & Cabaré Adultos', 'Boates e Cabaré Adultos', 'moon', ['casas noturnas adultas & clubes de strip', 'casa noturna adulta', 'strip', 'strip club', 'clube de strip', 'striptease', 'boate adulta', 'boates & lounges adultos (prives)', 'prive', 'prives', 'lounge adulto', 'lounges adultos', 'boates adultas', 'casas noturnas adultas', 'cabare', 'cabaret adulto']),
    def('Saunas, Swing & Festas Liberais', 'Saunas e Swing', 'thermometer', ['saunas & clubes liberais masculinos/gays', 'sauna', 'saunas', 'sauna gay', 'clube liberal', 'clubes liberais', 'clubes de swing & festas liberais', 'swing', 'clube de swing', 'festa liberal', 'festas liberais', 'liberal', 'liberais']),
    def('Tattoo, Piercing & BDSM', 'Tattoo, Piercing e BDSM', 'pen-tool', ['tattoo & body piercing sensual / bdsm', 'tattoo', 'tatuagem', 'tatuador', 'piercing', 'body piercing', 'bdsm', 'fetiche', 'sensual', 'tattoo & body piercing sensual', 'espaco bdsm']),
  ],
};

// Subcategorias ABERTAS por enquanto (nov/2026); as demais da categoria aparecem "em breve" (depois das abertas).
// Categoria que não está aqui mantém todas abertas. Para abrir uma, inclua o nome (rótulo completo) na lista.
const ABERTAS: Record<string, string[]> = {
  lugares: ['Botecos & Bares Tradicionais', 'Casas Noturnas & Boates'],
};
for (const [cat, nomes] of Object.entries(ABERTAS)) {
  const abertas = nomes.map(normTxt);
  for (const d of SUBCATEGORIAS[cat] || []) if (!abertas.includes(d.chave)) d.breve = true;
}

// Subcategoria fixa em que o texto livre do local se encaixa (por igualdade ou por palavra inteira); null = Outros.
export function subcategoriaFixa(defs: SubDef[], texto?: string | null): SubDef | null {
  const t = normTxt(texto);
  if (!t) return null;
  const exato = defs.find((d) => d.chave === t || d.palavras.includes(t));
  if (exato) return exato;
  const partes = t.split(/[^a-z0-9]+/).filter(Boolean);
  return defs.find((d) => d.palavras.some((p) => (p.includes(' ') ? t.includes(p) : partes.includes(p)))) || null;
}
