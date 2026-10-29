// Subcategorias definidas por categoria (out/2026, lista da Andrea — até 8 por categoria). Viram os ícones redondos
// logo abaixo do banner rotativo nas páginas de categoria. O cadastro do local tem texto livre (o portal sugere estes
// nomes); cada subcategoria reconhece o nome dela e sinônimos comuns (sem diferenciar maiúscula nem acento).
// Quem não encaixa em nenhuma cai em "Outros". Espelho no portal: portal-b2b-lgbt/src/lib/subcategoriasApp.ts —
// mantenha as duas listas iguais (a chave é o rótulo sem acento e em minúsculas).
// Chave = categoria REAL do banco (categoria_tipo): Bares & Vida Noturna = 'lugares'. As categorias ainda "Em breve"
// (festas, saude, beleza, mais18) já têm a lista pronta e passam a aparecer quando ganharem categoriaReal.
// `curto` = nome enxuto que cabe sob o ícone redondo; `rotulo` = nome completo (cadastro, portal, acessibilidade).
export type SubDef = { chave: string; rotulo: string; curto: string; icone: string; palavras: string[] };

export const normTxt = (s?: string | null) =>
  (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();

const def = (rotulo: string, curto: string, icone: string, palavras: string[]): SubDef => ({ chave: normTxt(rotulo), rotulo, curto, icone, palavras: palavras.map(normTxt) });

export const SUBCATEGORIAS: Record<string, SubDef[]> = {
  // Bares & Vida Noturna
  lugares: [
    def('Botecos & Bares Tradicionais', 'Botecos e Bares', 'users', ['bar', 'bares', 'bar lgbt', 'boteco', 'botequim', 'bar tradicional', 'petiscos', 'cerveja de garrafa']),
    def('Pubs & Cervejarias', 'Pubs e Cervejarias', 'droplet', ['pub', 'pubs', 'choperia', 'chopperia', 'cervejaria', 'cervejaria artesanal', 'brewpub', 'taproom', 'chopp artesanal']),
    def('Coquetelaria & Speakeasies', 'Coquetelaria', 'triangle', ['coquetelaria', 'coquetelarias', 'drinks', 'drink', 'mixologia', 'speakeasy', 'cocktail', 'coquetel', 'bar de drinks']),
    def('Wine Bars', 'Wine Bars', 'heart', ['wine bar', 'wine bars', 'vinho', 'vinhos', 'enoteca', 'adega', 'espumante']),
    def('Gastrobares & Lounges', 'Gastrobares e Lounges', 'sun', ['gastrobar', 'gastrobares', 'lounge', 'lounges', 'rooftop', 'rooftops', 'terraco', 'sky bar', 'skybar']),
    def('Casas Noturnas & Boates', 'Casas Noturnas e Boates', 'disc', ['balada', 'baladas', 'baladas e clubes', 'club', 'clube', 'boate', 'boates', 'night', 'nightclub', 'casa noturna', 'dance', 'danceteria', 'drag', 'drag show', 'drag e shows', 'cabare', 'cabaret', 'performance']),
    def('Música ao Vivo & Rodas de Samba', 'Música ao vivo', 'music', ['musica ao vivo', 'ao vivo', 'show', 'shows', 'sertanejo', 'pagode', 'samba', 'roda de samba', 'forro', 'mpb', 'jazz', 'rock', 'banda']),
    def('Bares Interativos & Esportes', 'Jogos e Esportes', 'target', ['karaoke', 'karaoke bar', 'karaokê', 'sinuca', 'fliperama', 'jogos de tabuleiro', 'sports bar', 'bar esportivo', 'telao', 'boliche']),
  ],
  // Festas & Eventos
  festas: [
    def('Festas Temáticas & Baladas Itinerantes', 'Festas temáticas', 'gift', ['festa tematica', 'festas tematicas', 'tematica', 'itinerante', 'baladas itinerantes', 'pop', 'anos 2000', 'flashback']),
    def('Festivais & Grandes Shows', 'Festivais e Shows', 'star', ['festival', 'festivais', 'grande show', 'grandes shows', 'show', 'shows', 'multi palcos', 'ao ar livre']),
    def('Eventos Universitários & Calouradas', 'Universitários', 'book-open', ['universitario', 'universitaria', 'universitarios', 'calourada', 'calouradas', 'atletica', 'republica']),
    def('Rodas & Bailes de Rua', 'Rodas e Bailes', 'music', ['roda de samba', 'samba de rua', 'baile', 'bailes', 'baile funk', 'funk', 'soundsystem', 'sound system', 'bloco de rua']),
    def('Festas Eletrônicas & Raves', 'Eletrônicas e Raves', 'zap', ['eletronica', 'eletronicas', 'rave', 'raves', 'techno', 'house', 'edm']),
    def('Pool Parties & Day Parties', 'Pool e Day Party', 'sun', ['pool party', 'pool parties', 'day party', 'day parties', 'piscina']),
    def('Open Bar & Sunset Parties', 'Open Bar e Sunset', 'sunset', ['open bar', 'openbar', 'sunset', 'sunset party', 'pre carnaval']),
    def('Feiras, Feirinhas & Blocos de Carnaval', 'Feiras e Blocos', 'flag', ['feira', 'feiras', 'feirinha', 'feirinhas', 'bloco', 'blocos', 'carnaval']),
  ],
  // Gastronomia
  gastronomia: [
    def('Restaurantes Tradicionais & À la Carte', 'Restaurantes', 'award', ['restaurante', 'restaurantes', 'a la carte', 'massas', 'carnes', 'cozinha regional', 'comida regional', 'self service', 'bistro']),
    def('Hamburguerias, Lanches & Fast Food', 'Hamburguerias e Lanches', 'shopping-bag', ['hamburgueria', 'hamburguerias', 'hamburguer', 'lanche', 'lanches', 'lanchonete', 'fast food', 'sanduiche']),
    def('Pizzarias & Esfiharias', 'Pizzarias', 'pie-chart', ['pizza', 'pizzaria', 'pizzarias', 'esfiha', 'esfiharia', 'esfirra']),
    def('Culinária Japonesa & Asiática', 'Japonesa e Asiática', 'globe', ['japonesa', 'japones', 'sushi', 'temaki', 'asiatica', 'oriental', 'chinesa', 'coreana', 'tailandesa', 'culinaria japonesa']),
    def('Cafeterias, Docerias & Padarias Artesanais', 'Cafés e Doces', 'coffee', ['cafe', 'cafes', 'cafeteria', 'cafeterias', 'doceria', 'docerias', 'padaria', 'padarias', 'confeitaria', 'sorveteria', 'brunch']),
    def('Churrascarias & Parrillas', 'Churrascarias', 'grid', ['churrasco', 'churrascaria', 'churrascarias', 'parrilla', 'parrillas', 'rodizio', 'steakhouse']),
    def('Saudável, Vegano & Vegetariano', 'Saudável e Vegano', 'feather', ['saudavel', 'vegano', 'vegana', 'vegetariano', 'vegetariana', 'plant based', 'natural', 'fit', 'organico']),
    def('Frutos do Mar & Pescados', 'Frutos do Mar', 'anchor', ['frutos do mar', 'peixe', 'peixes', 'pescado', 'pescados', 'camarao', 'marisqueira', 'moqueca']),
  ],
  // Cultura
  cultura: [
    def('Cinemas & Cineclubes', 'Cinemas', 'film', ['cinema', 'cinemas', 'cineclube', 'cineclubes', 'sala de cinema']),
    def('Teatros, Dança & Circo', 'Teatro e Dança', 'smile', ['teatro', 'teatros', 'danca', 'circo', 'espetaculo', 'cabare', 'ballet']),
    def('Museus, Galerias & Exposições', 'Museus e Galerias', 'image', ['museu', 'museus', 'galeria', 'galerias', 'exposicao', 'exposicoes', 'arte', 'galeria de arte']),
    def('Centros Culturais & Casas de Memória', 'Centros Culturais', 'home', ['centro cultural', 'centros culturais', 'casa de cultura', 'casa de memoria', 'memorial', 'espaco cultural']),
    def('Livrarias, Sebos & Bibliotecas', 'Livrarias e Sebos', 'book', ['livraria', 'livrarias', 'sebo', 'sebos', 'biblioteca', 'bibliotecas']),
    def('Shows Acústicos, Óperas & Orquestras', 'Shows e Orquestras', 'music', ['show acustico', 'shows acusticos', 'acustico', 'opera', 'operas', 'orquestra', 'orquestras', 'concerto', 'musica classica']),
    def('Saraus, Batalhas de Rima & Slam', 'Saraus e Slam', 'mic', ['sarau', 'saraus', 'batalha de rima', 'batalhas de rima', 'slam', 'poesia', 'rima', 'rap']),
    def('Patrimônio Histórico & Visitas Guiadas', 'Patrimônio e Visitas', 'map-pin', ['patrimonio', 'patrimonio historico', 'historico', 'visita guiada', 'visitas guiadas', 'tour historico', 'monumento']),
  ],
  // Serviços
  servicos: [
    def('Assistência Técnica & Eletrônicos', 'Assistência Técnica', 'smartphone', ['assistencia tecnica', 'assistencia', 'celular', 'celulares', 'informatica', 'eletros', 'eletrodomesticos', 'conserto']),
    def('Automotivos', 'Automotivos', 'settings', ['automotivo', 'automotivos', 'oficina', 'oficinas', 'mecanica', 'lava jato', 'lava-jato', 'funilaria', 'auto center', 'carro']),
    def('Reformas & Manutenção Predial', 'Reformas', 'tool', ['reforma', 'reformas', 'manutencao', 'manutencao predial', 'pedreiro', 'eletricista', 'encanador', 'pintura', 'pintor', 'marceneiro', 'obra']),
    def('Serviços Domésticos', 'Domésticos', 'home', ['domestico', 'domesticos', 'diarista', 'diaristas', 'passadeira', 'cozinheira', 'faxina', 'limpeza', 'baba']),
    def('Profissionais Liberais & Jurídico', 'Jurídico e Liberais', 'briefcase', ['juridico', 'advocacia', 'advogado', 'advogada', 'direito', 'contabilidade', 'contador', 'contabil', 'cartorio', 'seguros', 'seguro', 'financas', 'financeiro', 'profissional liberal', 'profissionais liberais', 'consultoria']),
    def('Transporte, Mudanças & Fretes', 'Transporte e Fretes', 'truck', ['transporte', 'mudanca', 'mudancas', 'frete', 'fretes', 'motorista', 'carreto', 'motoboy', 'entregas']),
    def('Design, TI & Marketing', 'Design, TI e Marketing', 'monitor', ['design', 'ti', 'tecnologia', 'software', 'desenvolvimento', 'marketing', 'comunicacao', 'comunicacao e marketing', 'publicidade', 'social media', 'branding', 'midia']),
    def('Eventos & Organização', 'Eventos', 'camera', ['eventos', 'evento', 'eventos e festas', 'buffet', 'fotografia', 'fotografia e video', 'foto', 'video', 'filmagem', 'cerimonial', 'locacao', 'decoracao', 'casamento', 'organizacao']),
  ],
  // Educação
  educacao: [
    def('Cursos Livres & Profissionalizantes', 'Cursos Livres', 'award', ['curso livre', 'cursos livres', 'profissionalizante', 'profissionalizantes', 'curso tecnico', 'gastronomia', 'mecanica', 'eletrica', 'corte e costura', 'curso']),
    def('Escolas & Educação Básica', 'Escolas', 'book', ['escola', 'escolas', 'educacao basica', 'ensino fundamental', 'ensino medio', 'educacao infantil', 'creche', 'colegio']),
    def('Faculdades, Universidades & Pós-Graduação', 'Faculdades', 'bookmark', ['faculdade', 'faculdades', 'universidade', 'universidades', 'pos graduacao', 'pos-graduacao', 'mba', 'graduacao', 'ensino superior']),
    def('Escolas de Idiomas', 'Idiomas', 'globe', ['idioma', 'idiomas', 'ingles', 'espanhol', 'frances', 'italiano', 'alemao', 'escola de idiomas', 'lingua']),
    def('Aulas Particulares & Reforço Escolar', 'Aulas Particulares', 'edit-3', ['aula particular', 'aulas particulares', 'reforco', 'reforco escolar', 'professor particular', 'tutoria', 'mentoria']),
    def('Preparatórios (Vestibulares, ENEM, Concursos)', 'Preparatórios', 'target', ['preparatorio', 'preparatorios', 'vestibular', 'enem', 'concurso', 'concursos', 'cursinho']),
    def('Cursos de Tecnologia & Programação', 'Tecnologia e Programação', 'code', ['tecnologia', 'programacao', 'programador', 'dados', 'ciencia de dados', 'desenvolvimento web', 'ti', 'bootcamp']),
    def('Artes, Música & Dança', 'Artes, Música e Dança', 'music', ['arte', 'artes', 'musica', 'danca', 'canto', 'violao', 'teatro', 'instrumento', 'aula de musica']),
  ],
  // Compras & Produtos
  produtos: [
    def('Moda & Vestuário', 'Moda', 'shopping-bag', ['moda', 'vestuario', 'roupa', 'roupas', 'confeccao', 'lojas e moda', 'feminina', 'masculina', 'infantil', 'brecho', 'moda lgbt']),
    def('Calçados & Acessórios', 'Calçados e Acessórios', 'watch', ['calcado', 'calcados', 'sapato', 'sapatos', 'tenis', 'bolsa', 'bolsas', 'joia', 'joias', 'semijoia', 'relogio', 'acessorio', 'acessorios', 'bijuteria']),
    def('Eletrônicos, Informática & Gadgets', 'Eletrônicos', 'cpu', ['eletronico', 'eletronicos', 'informatica', 'gadget', 'gadgets', 'celular', 'computador', 'games']),
    def('Casa, Decoração & Utilidades', 'Casa e Decoração', 'home', ['casa', 'decoracao', 'utilidades', 'moveis', 'cama mesa e banho', 'utensilios']),
    def('Supermercados, Mercearias & Hortifrúti', 'Mercado', 'shopping-cart', ['supermercado', 'supermercados', 'mercearia', 'mercearias', 'hortifruti', 'emporio', 'mercado', 'quitanda', 'feira livre']),
    def('Pet Shop & Artigos Veterinários', 'Pet Shop', 'heart', ['pet', 'pet shop', 'petshop', 'veterinario', 'veterinaria', 'racao', 'banho e tosa']),
    def('Livraria, Papelaria & Brinquedos', 'Livros e Brinquedos', 'gift', ['livraria', 'papelaria', 'brinquedo', 'brinquedos', 'presente', 'presentes', 'lojas de presentes']),
    def('Esportes, Camping & Lazer', 'Esportes e Camping', 'activity', ['esporte', 'esportes', 'camping', 'lazer', 'academia', 'bicicleta', 'pesca', 'artigos esportivos']),
  ],
  // Saúde & Bem-estar
  saude: [
    def('Clínicas Médicas & Consultórios', 'Clínicas e Consultórios', 'activity', ['clinica', 'clinicas', 'consultorio', 'consultorios', 'medico', 'medica', 'clinico geral', 'cardiologia', 'pediatria', 'ginecologia', 'dermatologia', 'endocrinologia', 'medicina']),
    def('Odontologia & Ortodontia', 'Odontologia', 'smile', ['odontologia', 'odonto', 'dentista', 'ortodontia', 'dentario', 'dentes']),
    def('Laboratórios & Exames de Imagem', 'Laboratórios e Exames', 'eye', ['laboratorio', 'laboratorios', 'exame', 'exames', 'imagem', 'radiologia', 'diagnostico', 'ultrassom']),
    def('Farmácias, Drogarias & Manipulação', 'Farmácias', 'plus-square', ['farmacia', 'farmacias', 'drogaria', 'drogarias', 'manipulacao', 'manipulado']),
    def('Fisioterapia, Quiropraxia & Reabilitação', 'Fisioterapia', 'user-check', ['fisioterapia', 'fisioterapeuta', 'quiropraxia', 'reabilitacao', 'pilates', 'rpg', 'osteopatia']),
    def('Psicologia, Terapia & Psiquiatria', 'Psicologia e Terapia', 'heart', ['psicologia', 'psicologo', 'psicologa', 'terapia', 'terapeuta', 'psiquiatria', 'psiquiatra', 'psicanalise']),
    def('Nutrição & Nutrologia', 'Nutrição', 'feather', ['nutricao', 'nutricionista', 'nutrologia', 'nutrologo', 'dieta']),
    def('Pronto-Atendimento & Urgências', 'Pronto-Atendimento', 'alert-circle', ['pronto atendimento', 'pronto-atendimento', 'urgencia', 'urgencias', 'emergencia', 'pronto socorro', 'upa', 'hospital']),
  ],
  // Beleza & Estética
  beleza: [
    def('Salões de Beleza & Cabeleireiros', 'Salões', 'scissors', ['salao', 'saloes', 'salao de beleza', 'cabelereiro', 'cabelereiros', 'cabeleireiro', 'cabeleireiros', 'cabelo', 'corte', 'tintura', 'coloracao', 'penteado', 'hair']),
    def('Barbearias & Barbaterapia', 'Barbearias', 'user', ['barbearia', 'barbearias', 'barbeiro', 'barbaterapia', 'barba']),
    def('Unhas, Manicure & Pedicure', 'Unhas', 'droplet', ['unha', 'unhas', 'manicure', 'pedicure', 'nail', 'alongamento', 'esmaltacao']),
    def('Design de Sobrancelhas, Cílios & Micropigmentação', 'Sobrancelhas e Cílios', 'eye', ['sobrancelha', 'sobrancelhas', 'cilios', 'micropigmentacao', 'design de sobrancelhas', 'lash', 'brow']),
    def('Estética Facial', 'Estética Facial', 'smile', ['estetica facial', 'limpeza de pele', 'peeling', 'botox', 'harmonizacao', 'harmonizacao facial', 'preenchimento', 'dermato']),
    def('Estética Corporal & Massoterapia', 'Corporal e Massagem', 'wind', ['estetica corporal', 'massoterapia', 'massagem', 'drenagem', 'drenagem linfatica', 'modeladora', 'spa', 'estetica']),
    def('Depilação & Laser', 'Depilação e Laser', 'zap', ['depilacao', 'depilacao a laser', 'laser', 'cera', 'epilacao']),
    def('Maquiagem Social & Noivas', 'Maquiagem e Noivas', 'star', ['maquiagem', 'make', 'makeup', 'maquiador', 'maquiadora', 'noiva', 'noivas', 'automaquiagem']),
  ],
  // Espaços 18+
  mais18: [
    def('Sex Shops & Lingeries Sensuais', 'Sex Shops e Lingerie', 'shopping-bag', ['sex shop', 'sexshop', 'sex shops', 'lingerie', 'lingeries', 'lingerie sensual', 'erotico', 'produtos eroticos']),
    def('Motéis & Suítes Temáticas', 'Motéis', 'key', ['motel', 'moteis', 'suite', 'suites tematicas', 'love hotel']),
    def('Casas Noturnas Adultas & Clubes de Strip', 'Casas Noturnas Adultas', 'moon', ['casa noturna adulta', 'strip', 'strip club', 'clube de strip', 'striptease', 'boate adulta']),
    def('Saunas & Clubes Liberais Masculinos/Gays', 'Saunas e Clubes', 'thermometer', ['sauna', 'saunas', 'sauna gay', 'clube liberal', 'clubes liberais', 'dark room', 'darkroom']),
    def('Clubes de Swing & Festas Liberais', 'Swing e Festas Liberais', 'users', ['swing', 'clube de swing', 'festa liberal', 'festas liberais', 'liberal', 'liberais']),
    def('Boates & Lounges Adultos (Privês)', 'Boates e Lounges Adultos', 'lock', ['prive', 'prives', 'boate adulta', 'lounge adulto', 'lounges adultos', 'boates adultas']),
    def('Cinemas & Cabines Adultas', 'Cinemas e Cabines', 'film', ['cinema adulto', 'cabine', 'cabines', 'cabines adultas', 'cinema porno']),
    def('Tattoo & Body Piercing Sensual / BDSM', 'Tattoo, Piercing e BDSM', 'pen-tool', ['tattoo', 'tatuagem', 'tatuador', 'piercing', 'body piercing', 'bdsm', 'fetiche', 'sensual']),
  ],
};

// Subcategoria fixa em que o texto livre do local se encaixa (por igualdade ou por palavra inteira); null = Outros.
export function subcategoriaFixa(defs: SubDef[], texto?: string | null): SubDef | null {
  const t = normTxt(texto);
  if (!t) return null;
  const exato = defs.find((d) => d.chave === t || d.palavras.includes(t));
  if (exato) return exato;
  const partes = t.split(/[^a-z0-9]+/).filter(Boolean);
  return defs.find((d) => d.palavras.some((p) => (p.includes(' ') ? t.includes(p) : partes.includes(p)))) || null;
}
