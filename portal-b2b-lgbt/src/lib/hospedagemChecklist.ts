// Rodada 64 — checklist do cadastro completo de hospedagem.
// Obrigatório = precisa estar ok pra enviar para validação.
// Recomendado = melhora a posição no app (o % de completude ordena as listas).
// Peso: obrigatório vale 2, recomendado vale 1.

export type DadosHospedagem = {
  local: {
    tipo_hospedagem: string | null;
    cnpj: string | null;
    endereco: string | null;
    lat: number | null;
    lng: number | null;
    foto_capa_url: string | null;
    galeria_fotos: string[] | null;
    atributos: Record<string, string[]>;
  };
  perfil: {
    cadastur_numero: string | null;
    total_quartos: number | null;
    checkin_hora: string | null;
    checkout_hora: string | null;
    idiomas: string[];
    cancelamento_tipo: string | null;
    formas_pagamento: string[];
    link_reserva: string | null;
    whatsapp_reserva: string | null;
    email_reserva: string | null;
    site: string | null;
  };
  validacao: { compromissos: string[]; comprovante_path: string | null; termo_aceito_em: string | null };
  espacos: { tipo: string; foto_url: string | null }[];
  pontos: { status: string }[];
};

export type ItemChecklist = { id: string; etapa: number; label: string; obrigatorio: boolean; ok: boolean };

export const ETAPAS = [
  { n: 1, titulo: 'Dados básicos' },
  { n: 2, titulo: 'Fotos' },
  { n: 3, titulo: 'Quartos e espaços' },
  { n: 4, titulo: 'Estrutura' },
  { n: 5, titulo: 'Políticas' },
  { n: 6, titulo: 'Acolhimento LGBT+' },
  { n: 7, titulo: 'Locais próximos' },
  { n: 8, titulo: 'Reserva' },
  { n: 9, titulo: 'Revisão e envio' },
] as const;

const qtd = (a: Record<string, string[]>, g: string) => (a[g] || []).length;

export function montarChecklist(d: DadosHospedagem): ItemChecklist[] {
  const a = d.local.atributos || {};
  const quartosComFoto = d.espacos.filter((e) => e.tipo === 'quarto' && e.foto_url).length;
  return [
    { id: 'tipo', etapa: 1, label: 'Tipo de hospedagem', obrigatorio: true, ok: !!d.local.tipo_hospedagem },
    { id: 'cadastur', etapa: 1, label: 'Número do Cadastur', obrigatorio: true, ok: !!d.perfil.cadastur_numero?.trim() },
    { id: 'horarios', etapa: 1, label: 'Horários de check-in e check-out', obrigatorio: true, ok: !!d.perfil.checkin_hora && !!d.perfil.checkout_hora },
    { id: 'mapa', etapa: 1, label: 'Endereço com localização no mapa', obrigatorio: true, ok: !!d.local.endereco && d.local.lat != null && d.local.lng != null },
    { id: 'cnpj', etapa: 1, label: 'CNPJ', obrigatorio: false, ok: !!d.local.cnpj },
    { id: 'total_quartos', etapa: 1, label: 'Total de quartos/unidades', obrigatorio: false, ok: !!d.perfil.total_quartos },
    { id: 'idiomas', etapa: 1, label: 'Idiomas de atendimento', obrigatorio: false, ok: d.perfil.idiomas.length > 0 },

    { id: 'capa', etapa: 2, label: 'Foto de capa', obrigatorio: true, ok: !!d.local.foto_capa_url },
    { id: 'galeria', etapa: 2, label: 'Pelo menos 4 fotos na galeria', obrigatorio: false, ok: (d.local.galeria_fotos || []).length >= 4 },

    { id: 'quarto', etapa: 3, label: 'Pelo menos 1 quarto com foto', obrigatorio: true, ok: quartosComFoto >= 1 },
    { id: 'area_comum', etapa: 3, label: 'Área em comum cadastrada', obrigatorio: false, ok: d.espacos.some((e) => e.tipo === 'area_comum') },
    { id: 'lazer', etapa: 3, label: 'Espaço de lazer cadastrado', obrigatorio: false, ok: d.espacos.some((e) => e.tipo === 'lazer') },

    { id: 'comodidades', etapa: 4, label: 'Pelo menos 3 comodidades', obrigatorio: true, ok: qtd(a, 'comodidades') >= 3 },
    { id: 'acessibilidade', etapa: 4, label: 'Acessibilidade informada', obrigatorio: false, ok: qtd(a, 'acessibilidade') > 0 },
    { id: 'servicos', etapa: 4, label: 'Serviços ao hóspede', obrigatorio: false, ok: qtd(a, 'servicos') > 0 },
    { id: 'quartos_caract', etapa: 4, label: 'Características dos quartos', obrigatorio: false, ok: qtd(a, 'quartos') > 0 },

    { id: 'cancelamento', etapa: 5, label: 'Política de cancelamento', obrigatorio: true, ok: !!d.perfil.cancelamento_tipo },
    { id: 'pagamento', etapa: 5, label: 'Formas de pagamento', obrigatorio: false, ok: d.perfil.formas_pagamento.length > 0 },
    { id: 'politicas', etapa: 5, label: 'Regras (pets, crianças, day use…)', obrigatorio: false, ok: qtd(a, 'politicas') > 0 },

    { id: 'termo', etapa: 6, label: 'Termo de compromisso aceito', obrigatorio: true, ok: !!d.validacao.termo_aceito_em },
    { id: 'compromissos', etapa: 6, label: 'Pelo menos 3 compromissos de acolhimento', obrigatorio: false, ok: d.validacao.compromissos.length >= 3 },
    { id: 'comprovante', etapa: 6, label: 'Comprovante enviado (política, certificado…)', obrigatorio: false, ok: !!d.validacao.comprovante_path },

    { id: 'proximos', etapa: 7, label: 'Pelo menos 3 locais próximos indicados', obrigatorio: false, ok: d.pontos.filter((p) => p.status !== 'recusado').length >= 3 },

    {
      id: 'canal_reserva',
      etapa: 8,
      label: 'Pelo menos 1 canal de reserva',
      obrigatorio: true,
      ok: !!(d.perfil.link_reserva || d.perfil.whatsapp_reserva || d.perfil.email_reserva || d.perfil.site),
    },
  ];
}

export function calcularCompletude(itens: ItemChecklist[]): number {
  let total = 0;
  let feito = 0;
  for (const i of itens) {
    const peso = i.obrigatorio ? 2 : 1;
    total += peso;
    if (i.ok) feito += peso;
  }
  return total === 0 ? 0 : Math.round((feito / total) * 100);
}
