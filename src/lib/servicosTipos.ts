// Tipos de serviço (filtros "fofos" da página Serviços em destaque).
// O parceiro pode escolher o tipo na Subcategoria do cadastro (o portal sugere esta lista); para
// quem não escolheu, o app deduz pelo texto de subcategoria/especialidade/nome. Sem pista = "Outros serviços".
// O portal tem uma cópia deste arquivo (portal-b2b-lgbt/src/lib/servicosTipos.ts): se mudar um, copie no outro.

export type TipoServico = { rotulo: string; icone: string; cor: string; palavras: string[] };

export const TIPOS_SERVICO: TipoServico[] = [
  { rotulo: 'Beleza e estética', icone: 'scissors', cor: '#F0ABFC', palavras: ['beleza', 'cabel', 'barbe', 'salao', 'estetic', 'maquiag', 'unha', 'manicure', 'sobrancelha', 'depila', 'tatuag'] },
  { rotulo: 'Saúde e bem-estar', icone: 'heart', cor: '#F472B6', palavras: ['psicolog', 'terapeut', 'psiquiatr', 'clinic', 'medic', 'dentis', 'odonto', 'nutri', 'fisioterap', 'saude', 'bem-estar', 'bem estar', 'massag', 'yoga', 'pilates', 'personal'] },
  { rotulo: 'Fotografia e vídeo', icone: 'camera', cor: '#60A5FA', palavras: ['foto', 'video', 'filmag', 'audiovisual', 'cinegraf'] },
  { rotulo: 'Seguros e finanças', icone: 'shield', cor: '#34D399', palavras: ['seguro', 'corretor', 'financ', 'contab', 'credito', 'investiment', 'consorcio', 'previdenc'] },
  { rotulo: 'Jurídico', icone: 'file-text', cor: '#FBBF24', palavras: ['advog', 'juridic', 'direito', 'cartorio'] },
  { rotulo: 'Comunicação e marketing', icone: 'message-circle', cor: '#FB923C', palavras: ['comunicac', 'marketing', 'design', 'publicid', 'social media', 'midia', 'branding', 'imprensa'] },
  { rotulo: 'Eventos e festas', icone: 'gift', cor: '#FDE047', palavras: ['evento', 'buffet', 'cerimonial', 'decorac', 'casamento', 'festa'] },
  { rotulo: 'Tecnologia', icone: 'cpu', cor: '#38BDF8', palavras: ['tecnolog', 'software', 'desenvolv', 'informatica'] },
  { rotulo: 'Lojas e moda', icone: 'shopping-bag', cor: '#FCA5A5', palavras: ['loja', 'moda', 'roupa', 'acessor', 'joia', 'calcad', 'presente', 'livraria'] },
  { rotulo: 'Outros serviços', icone: 'more-horizontal', cor: '#A78BFA', palavras: [] },
];

const norm = (s?: string | null) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function tipoDoServico(l: { categoria?: string | null; subcategoria?: string | null; especialidade?: string | null; nome?: string | null }): string {
  // 1) o parceiro escolheu exatamente um dos tipos
  const exato = TIPOS_SERVICO.find((t) => norm(t.rotulo) === norm(l.subcategoria));
  if (exato) return exato.rotulo;
  // 2) categoria própria no banco
  if (l.categoria === 'beleza') return 'Beleza e estética';
  if (l.categoria === 'lojas') return 'Lojas e moda';
  // 3) palavras na subcategoria/especialidade e, por último, no nome
  for (const texto of [`${norm(l.subcategoria)} ${norm(l.especialidade)}`, norm(l.nome)]) {
    if (!texto.trim()) continue;
    const t = TIPOS_SERVICO.find((x) => x.palavras.some((p) => texto.includes(p)));
    if (t) return t.rotulo;
  }
  return 'Outros serviços';
}
