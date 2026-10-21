// Idioma do app (PT / EN / ES) — seletor no topo da Home e em Conta.
//
// Escopo desta versão: tab bar, Home, Dicas Trip, Dicas sobre o Brasil e
// Conta (as telas da nova versão estilo Uber). As demais telas continuam
// em português. Enquanto isso não for 100%, NÃO declarar inglês/espanhol
// como idiomas do app nos metadados da App Store.
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

export type Idioma = 'pt' | 'en' | 'es';
export const IDIOMAS: { code: Idioma; sigla: string; nome: string }[] = [
  { code: 'pt', sigla: 'PT', nome: 'Português' },
  { code: 'en', sigla: 'EN', nome: 'English' },
  { code: 'es', sigla: 'ES', nome: 'Español' },
];

const CHAVE = 'dicas_idioma';

type Dic = Record<string, string>;

const pt: Dic = {
  'trip.tagDestino': 'DESTINO',
  'trip.verGuia': 'Ver guia completo',
  'rodape.site': 'Site oficial',
  'rodape.produtos': 'Produtos e serviços',
  'rodape.parceiro': 'Seja um parceiro',
  'secao.subExperiencia': 'Escolha o clima do rolê',
  'home.boxTrip': 'Dicas Trip',
  'home.boxQtd': '{n} opções',
  'home.boxQtd1': '1 opção',
  'home.boxVer': 'Ver',
  'secao.subTrip': 'Hospedagens, agências e roteiros em destaque',
  'secao.subEmAlta': 'Os lugares que estão bombando agora',
  'secao.subHoje': 'Festas de hoje e lugares abertos agora',
  'secao.subSemana': 'Os parceiros em destaque nesta semana',
  'secao.vazio': 'Nada por aqui ainda. Assim que os parceiros forem aprovados, eles aparecem nesta lista.',
  'secao.abrirTrip': 'Abrir o Dicas Trip completo',
  'secao.abrirAgenda': 'Ver a agenda completa',
  'home.localizacao': 'Localização',
  'home.patrocinado': 'PATROCINADO',
  'home.news': 'News',
  'home.emAlta': 'Em Alta',
  'home.verMais': 'Ver mais',
  'home.encontreLugares': 'Encontre os lugares perto de você',
  'home.hojeTitulo': 'O que fazer hoje',
  'home.destaqueSemana': 'Destaques da semana',
  'home.experiencia': 'Escolha pela experiência',
  'home.conhecaSelos': 'Conheça nossos Selos Dicas LGBT+',
  'home.rolandoHoje': 'Ver o que está rolando hoje',
  'home.selos': 'Selos e benefícios',
  'banner.fundadorTag': 'MEMBRO FUNDADOR',
  'banner.fundadorTitulo': 'Membros Fundadores',
  'banner.fundadorSub': 'Os primeiros parceiros que apoiam a comunidade',
  'banner.fundadorCta': 'Ver fundadores',
  'banner.seloTag': 'SELO DICAS LGBT+',
  'banner.seloTitulo': 'Recomendados pela equipe',
  'banner.seloSub': 'Os lugares que a gente conheceu, amou e indica de coração.',
  'banner.seloCta': 'Ver recomendados',
  'banner.cupomTag': 'CUPONS',
  'banner.cupomTitulo': 'Cupons exclusivos',
  'banner.cupomSub': 'Descontos dos parceiros para quem tem conta no app',
  'banner.cupomCta': 'Ver cupons',
  'app.subtitulo': 'Conexões e Experiências LGBT+',
  'home.atalhoLocais': 'Locais perto de você',
  'home.atalhoLocaisSub': 'Bares, restaurantes, cultura e serviços no mapa',
  'tab.inicio': 'Início',
  'tab.mapa': 'Mapa',
  'tab.eventos': 'Eventos',
  'tab.trip': 'Trip',
  'tab.conta': 'Conta',

  'home.voceEstaEm': 'Você está em',
  'home.ativarLocalizacao': 'Ativar localização',
  'home.semLocalizacao': 'Toque para ver o que tem perto',
  'home.busca': 'Pra onde vamos hoje?',
  'home.atalhoBares': 'Bares perto de você',
  'home.atalhoBaresSub': 'Veja no mapa o que está perto agora',
  'home.atalhoTrip': 'Planejar uma viagem',
  'home.atalhoTripSub': 'Destinos, roteiros e pacotes LGBT+',
  'home.categorias': 'Categorias',
  'home.emBreveDica': 'Em breve: toque e avisamos',
  'home.emBreve': 'EM BREVE',
  'home.brasil2027Tag': 'JUN–JUL 2027 · 8 CIDADES-SEDE',
  'home.brasil2027Titulo': 'Futebol feminino no Brasil: roteiros LGBT+ por cidade-sede',
  'home.brasil2027Cta': 'Quero ser avisada(o)',
  'home.inbox': 'Caixa de entrada',

  'aviso.loginTitulo': 'Crie sua conta para ser avisada(o)',
  'aviso.loginTexto': 'Com a conta, a gente guarda seu pedido e te avisa quando abrir.',
  'aviso.agoraNao': 'Agora não',
  'aviso.entrar': 'Entrar / Criar conta',
  'aviso.okTitulo': 'Pronto!',
  'aviso.okTexto': 'Vamos te avisar quando "{alvo}" abrir no app.',
  'aviso.erro': 'Não foi possível registrar agora. Tente de novo em alguns segundos.',

  'trip.titulo': 'Dicas Trip',
  'trip.sub': 'Viaje pelo Brasil com quem entende a comunidade',
  'trip.busca': 'Pra qual cidade?',
  'trip.brasilTitulo': 'O Brasil recebe o futebol feminino em 2027',
  'trip.brasilSub': 'Roteiros, bares e festas LGBT+ perto de cada estádio',
  'trip.planeje': 'Planeje sua viagem',
  'trip.roteiros': 'Roteiros',
  'trip.hospedagem': 'Hospedagem',
  'trip.pacotes': 'Pacotes',
  'trip.passeios': 'Passeios',
  'trip.agencias': 'Agências',
  'trip.eventos': 'Eventos',
  'trip.parceiroAviso': 'Pacotes e reservas são feitos direto com o parceiro, fora do app.',
  'trip.destinos': 'Destinos em destaque',
  'trip.pacotesDestaque': 'Pacotes e roteiros dos parceiros',
  'trip.semPacotes': 'Os primeiros pacotes de parceiros aparecem aqui assim que forem aprovados.',
  'trip.aPartirDe': 'a partir de',
  'trip.dicasBrasil': 'Dicas úteis sobre o Brasil',

  'conta.titulo': 'Conta',
  'conta.inbox': 'Caixa de entrada',
  'conta.acoes': 'Últimas ações',
  'conta.semInbox': 'Nenhum aviso por enquanto. Comunicados da comunidade aparecem aqui.',
  'conta.semAcoes': 'Seus check-ins, cupons usados e listas VIP aparecem aqui.',
  'conta.checkin': 'CHECK-IN',
  'conta.cupom': 'CUPOM USADO',
  'conta.listaVip': 'LISTA VIP',
  'conta.idioma': 'Idioma',
  'conta.privacidade': 'Política de privacidade',
  'conta.termos': 'Termos de uso',
  'conta.entrePraVer': 'Entre na sua conta para ver seus avisos e suas últimas ações.',
};

const en: Dic = {
  'trip.tagDestino': 'DESTINATION',
  'trip.verGuia': 'See full guide',
  'rodape.site': 'Official website',
  'rodape.produtos': 'Products & services',
  'rodape.parceiro': 'Become a partner',
  'secao.subExperiencia': 'Pick the vibe of your night',
  'home.boxTrip': 'Dicas Trip',
  'home.boxQtd': '{n} options',
  'home.boxQtd1': '1 option',
  'home.boxVer': 'See',
  'secao.subTrip': 'Featured stays, agencies and itineraries',
  'secao.subEmAlta': 'The places that are buzzing right now',
  'secao.subHoje': "Today's parties and places open now",
  'secao.subSemana': 'Featured partners this week',
  'secao.vazio': 'Nothing here yet. Partners will show up here once approved.',
  'secao.abrirTrip': 'Open the full Dicas Trip',
  'secao.abrirAgenda': 'See the full agenda',
  'home.localizacao': 'Location',
  'home.patrocinado': 'SPONSORED',
  'home.news': 'News',
  'home.emAlta': 'Trending',
  'home.verMais': 'See more',
  'home.encontreLugares': 'Find places near you',
  'home.hojeTitulo': 'What to do today',
  'home.destaqueSemana': 'Highlights of the week',
  'home.experiencia': 'Pick by experience',
  'home.conhecaSelos': 'Our Dicas LGBT+ badges',
  'home.rolandoHoje': 'See what is happening today',
  'home.selos': 'Badges & perks',
  'banner.fundadorTag': 'FOUNDING MEMBER',
  'banner.fundadorTitulo': 'Founding Members',
  'banner.fundadorSub': 'The first partners supporting the community',
  'banner.fundadorCta': 'See founders',
  'banner.seloTag': 'DICAS LGBT+ PICK',
  'banner.seloTitulo': 'Team picks',
  'banner.seloSub': 'Places we visited, loved and recommend from the heart.',
  'banner.seloCta': 'See picks',
  'banner.cupomTag': 'COUPONS',
  'banner.cupomTitulo': 'Exclusive coupons',
  'banner.cupomSub': 'Partner discounts for app members',
  'banner.cupomCta': 'See coupons',
  'app.subtitulo': 'LGBTQ+ Connections & Experiences',
  'home.atalhoLocais': 'Places near you',
  'home.atalhoLocaisSub': 'Bars, restaurants, culture and services on the map',
  'tab.inicio': 'Home',
  'tab.mapa': 'Map',
  'tab.eventos': 'Events',
  'tab.trip': 'Trip',
  'tab.conta': 'Account',

  'cat.turismo': 'Tourism | Dicas Trip',
  'cat.bares': 'Bars & Nightlife',
  'cat.festas': 'Parties & Events',
  'cat.gastronomia': 'Food',
  'cat.cultura': 'Culture',
  'cat.servicos': 'Services',
  'cat.produtos': 'Shopping & Products',
  'cat.lazer': 'Experiences & Leisure',
  'cat.lojas': 'Shops',
  'cat.beleza': 'Beauty & Aesthetics',
  'cat.saude': 'Health & Wellness',
  'cat.comunidade': 'Community & Support',
  'cat.mais18': '18+ Venues',

  'home.voceEstaEm': 'You are in',
  'home.ativarLocalizacao': 'Turn on location',
  'home.semLocalizacao': 'Tap to see what is nearby',
  'home.busca': 'Where to tonight?',
  'home.atalhoBares': 'Bars near you',
  'home.atalhoBaresSub': 'See what is close on the map',
  'home.atalhoTrip': 'Plan a trip',
  'home.atalhoTripSub': 'LGBTQ+ destinations, itineraries and packages',
  'home.categorias': 'Categories',
  'home.emBreveDica': 'Coming soon: tap to get notified',
  'home.emBreve': 'SOON',
  'home.brasil2027Tag': 'JUN–JUL 2027 · 8 HOST CITIES',
  'home.brasil2027Titulo': 'Women’s football in Brazil: LGBTQ+ itineraries by host city',
  'home.brasil2027Cta': 'Notify me',
  'home.inbox': 'Inbox',

  'aviso.loginTitulo': 'Create an account to get notified',
  'aviso.loginTexto': 'With an account we save your request and let you know when it opens.',
  'aviso.agoraNao': 'Not now',
  'aviso.entrar': 'Sign in / Sign up',
  'aviso.okTitulo': 'Done!',
  'aviso.okTexto': 'We will let you know when "{alvo}" opens in the app.',
  'aviso.erro': 'We could not save it right now. Please try again in a few seconds.',

  'trip.titulo': 'Dicas Trip',
  'trip.sub': 'Travel Brazil with people who know the community',
  'trip.busca': 'Which city?',
  'trip.brasilTitulo': 'Brazil hosts women’s football in 2027',
  'trip.brasilSub': 'LGBTQ+ itineraries, bars and parties near every stadium',
  'trip.planeje': 'Plan your trip',
  'trip.roteiros': 'Itineraries',
  'trip.hospedagem': 'Stays',
  'trip.pacotes': 'Packages',
  'trip.passeios': 'Tours',
  'trip.agencias': 'Agencies',
  'trip.eventos': 'Events',
  'trip.parceiroAviso': 'Packages and bookings are made directly with the partner, outside the app.',
  'trip.destinos': 'Featured destinations',
  'trip.pacotesDestaque': 'Partner packages and itineraries',
  'trip.semPacotes': 'The first partner packages will show up here once approved.',
  'trip.aPartirDe': 'from',
  'trip.dicasBrasil': 'Useful tips about Brazil',

  'conta.titulo': 'Account',
  'conta.inbox': 'Inbox',
  'conta.acoes': 'Recent activity',
  'conta.semInbox': 'No messages yet. Community announcements show up here.',
  'conta.semAcoes': 'Your check-ins, used coupons and VIP lists show up here.',
  'conta.checkin': 'CHECK-IN',
  'conta.cupom': 'COUPON USED',
  'conta.listaVip': 'VIP LIST',
  'conta.idioma': 'Language',
  'conta.privacidade': 'Privacy policy',
  'conta.termos': 'Terms of use',
  'conta.entrePraVer': 'Sign in to see your messages and recent activity.',
};

const es: Dic = {
  'trip.tagDestino': 'DESTINO',
  'trip.verGuia': 'Ver guía completa',
  'rodape.site': 'Sitio oficial',
  'rodape.produtos': 'Productos y servicios',
  'rodape.parceiro': 'Sé un socio',
  'secao.subExperiencia': 'Elige el ambiente del plan',
  'home.boxTrip': 'Dicas Trip',
  'home.boxQtd': '{n} opciones',
  'home.boxQtd1': '1 opción',
  'home.boxVer': 'Ver',
  'secao.subTrip': 'Alojamientos, agencias y rutas destacadas',
  'secao.subEmAlta': 'Los lugares que están de moda ahora',
  'secao.subHoje': 'Fiestas de hoy y lugares abiertos ahora',
  'secao.subSemana': 'Socios destacados de esta semana',
  'secao.vazio': 'Aún no hay nada. Los socios aparecerán aquí cuando sean aprobados.',
  'secao.abrirTrip': 'Abrir Dicas Trip completo',
  'secao.abrirAgenda': 'Ver la agenda completa',
  'home.localizacao': 'Ubicación',
  'home.patrocinado': 'PATROCINADO',
  'home.news': 'Noticias',
  'home.emAlta': 'En tendencia',
  'home.verMais': 'Ver más',
  'home.encontreLugares': 'Encuentra lugares cerca de ti',
  'home.hojeTitulo': 'Qué hacer hoy',
  'home.destaqueSemana': 'Destacados de la semana',
  'home.experiencia': 'Elige por experiencia',
  'home.conhecaSelos': 'Conoce nuestros Sellos Dicas LGBT+',
  'home.rolandoHoje': 'Ver lo que pasa hoy',
  'home.selos': 'Sellos y beneficios',
  'banner.fundadorTag': 'MIEMBRO FUNDADOR',
  'banner.fundadorTitulo': 'Miembros Fundadores',
  'banner.fundadorSub': 'Los primeros socios que apoyan a la comunidad',
  'banner.fundadorCta': 'Ver fundadores',
  'banner.seloTag': 'SELLO DICAS LGBT+',
  'banner.seloTitulo': 'Recomendados del equipo',
  'banner.seloSub': 'Lugares que conocimos, amamos y recomendamos de corazón.',
  'banner.seloCta': 'Ver recomendados',
  'banner.cupomTag': 'CUPONES',
  'banner.cupomTitulo': 'Cupones exclusivos',
  'banner.cupomSub': 'Descuentos de socios para quien tiene cuenta',
  'banner.cupomCta': 'Ver cupones',
  'app.subtitulo': 'Conexiones y Experiencias LGBT+',
  'home.atalhoLocais': 'Lugares cerca de ti',
  'home.atalhoLocaisSub': 'Bares, restaurantes, cultura y servicios en el mapa',
  'tab.inicio': 'Inicio',
  'tab.mapa': 'Mapa',
  'tab.eventos': 'Eventos',
  'tab.trip': 'Trip',
  'tab.conta': 'Cuenta',

  'cat.turismo': 'Turismo | Dicas Trip',
  'cat.bares': 'Bares y Vida Nocturna',
  'cat.festas': 'Fiestas y Eventos',
  'cat.gastronomia': 'Gastronomía',
  'cat.cultura': 'Cultura',
  'cat.servicos': 'Servicios',
  'cat.produtos': 'Compras y Productos',
  'cat.lazer': 'Experiencias y Ocio',
  'cat.lojas': 'Tiendas',
  'cat.beleza': 'Belleza y Estética',
  'cat.saude': 'Salud y Bienestar',
  'cat.comunidade': 'Comunidad y Apoyo',
  'cat.mais18': 'Espacios 18+',

  'home.voceEstaEm': 'Estás en',
  'home.ativarLocalizacao': 'Activar ubicación',
  'home.semLocalizacao': 'Toca para ver lo que hay cerca',
  'home.busca': '¿A dónde vamos hoy?',
  'home.atalhoBares': 'Bares cerca de ti',
  'home.atalhoBaresSub': 'Mira en el mapa lo que está cerca',
  'home.atalhoTrip': 'Planear un viaje',
  'home.atalhoTripSub': 'Destinos, rutas y paquetes LGBT+',
  'home.categorias': 'Categorías',
  'home.emBreveDica': 'Próximamente: toca y te avisamos',
  'home.emBreve': 'PRONTO',
  'home.brasil2027Tag': 'JUN–JUL 2027 · 8 SEDES',
  'home.brasil2027Titulo': 'Fútbol femenino en Brasil: rutas LGBT+ por ciudad sede',
  'home.brasil2027Cta': 'Avísame',
  'home.inbox': 'Bandeja de entrada',

  'aviso.loginTitulo': 'Crea tu cuenta para recibir el aviso',
  'aviso.loginTexto': 'Con la cuenta guardamos tu pedido y te avisamos cuando abra.',
  'aviso.agoraNao': 'Ahora no',
  'aviso.entrar': 'Entrar / Crear cuenta',
  'aviso.okTitulo': '¡Listo!',
  'aviso.okTexto': 'Te avisaremos cuando "{alvo}" abra en la app.',
  'aviso.erro': 'No pudimos guardarlo ahora. Inténtalo de nuevo en unos segundos.',

  'trip.titulo': 'Dicas Trip',
  'trip.sub': 'Viaja por Brasil con quien conoce la comunidad',
  'trip.busca': '¿A qué ciudad?',
  'trip.brasilTitulo': 'Brasil recibe el fútbol femenino en 2027',
  'trip.brasilSub': 'Rutas, bares y fiestas LGBT+ cerca de cada estadio',
  'trip.planeje': 'Planea tu viaje',
  'trip.roteiros': 'Rutas',
  'trip.hospedagem': 'Alojamiento',
  'trip.pacotes': 'Paquetes',
  'trip.passeios': 'Paseos',
  'trip.agencias': 'Agencias',
  'trip.eventos': 'Eventos',
  'trip.parceiroAviso': 'Los paquetes y reservas se hacen directo con el socio, fuera de la app.',
  'trip.destinos': 'Destinos destacados',
  'trip.pacotesDestaque': 'Paquetes y rutas de socios',
  'trip.semPacotes': 'Los primeros paquetes de socios aparecerán aquí cuando sean aprobados.',
  'trip.aPartirDe': 'desde',
  'trip.dicasBrasil': 'Consejos útiles sobre Brasil',

  'conta.titulo': 'Cuenta',
  'conta.inbox': 'Bandeja de entrada',
  'conta.acoes': 'Últimas acciones',
  'conta.semInbox': 'Aún no hay avisos. Los comunicados de la comunidad aparecen aquí.',
  'conta.semAcoes': 'Tus check-ins, cupones usados y listas VIP aparecen aquí.',
  'conta.checkin': 'CHECK-IN',
  'conta.cupom': 'CUPÓN USADO',
  'conta.listaVip': 'LISTA VIP',
  'conta.idioma': 'Idioma',
  'conta.privacidade': 'Política de privacidad',
  'conta.termos': 'Términos de uso',
  'conta.entrePraVer': 'Entra en tu cuenta para ver tus avisos y últimas acciones.',
};

const DICIONARIOS: Record<Idioma, Dic> = { pt, en, es };

interface I18nCtx {
  idioma: Idioma;
  setIdioma: (i: Idioma) => void;
  proximoIdioma: () => void;
  t: (chave: string, vars?: Record<string, string>) => string;
}

const Ctx = createContext<I18nCtx>({
  idioma: 'pt',
  setIdioma: () => {},
  proximoIdioma: () => {},
  t: (chave) => pt[chave] ?? chave,
});

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [idioma, setIdiomaState] = useState<Idioma>('pt');

  useEffect(() => {
    AsyncStorage.getItem(CHAVE)
      .then((v) => {
        if (v === 'pt' || v === 'en' || v === 'es') setIdiomaState(v);
      })
      .catch(() => {});
  }, []);

  const setIdioma = useCallback((i: Idioma) => {
    setIdiomaState(i);
    AsyncStorage.setItem(CHAVE, i).catch(() => {});
  }, []);

  const proximoIdioma = useCallback(() => {
    const idx = IDIOMAS.findIndex((x) => x.code === idioma);
    setIdioma(IDIOMAS[(idx + 1) % IDIOMAS.length].code);
  }, [idioma, setIdioma]);

  const t = useCallback(
    (chave: string, vars?: Record<string, string>) => {
      let s = DICIONARIOS[idioma][chave] ?? pt[chave] ?? chave;
      if (vars) for (const k of Object.keys(vars)) s = s.replace(`{${k}}`, vars[k]);
      return s;
    },
    [idioma]
  );

  return <Ctx.Provider value={{ idioma, setIdioma, proximoIdioma, t }}>{children}</Ctx.Provider>;
}

export const useI18n = () => useContext(Ctx);
