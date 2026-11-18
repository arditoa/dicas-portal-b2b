// Migração 142 — o que a casa oferece de acolhimento e acessibilidade (informado pela casa).
export const ACOLHIMENTO: { slug: string; rotulo: string; curto: string; icone: string }[] = [
  { slug: 'banheiro_sem_genero', rotulo: 'Banheiro sem gênero', curto: 'Banheiro sem gênero', icone: 'users' },
  { slug: 'acessivel', rotulo: 'Acessível para cadeira de rodas', curto: 'Acessível', icone: 'check-circle' },
  { slug: 'nome_social', rotulo: 'Respeita nome social e pronomes', curto: 'Nome social', icone: 'user-check' },
  { slug: 'pessoas_trans', rotulo: 'Equipe preparada para pessoas trans', curto: 'Trans friendly', icone: 'heart' },
  { slug: 'libras', rotulo: 'Atendimento em Libras', curto: 'Libras', icone: 'message-circle' },
  { slug: 'tranquilo', rotulo: 'Ambiente tranquilo (som baixo)', curto: 'Tranquilo', icone: 'volume-1' },
];
export const rotuloAcolhimento = (slug: string) => ACOLHIMENTO.find((a) => a.slug === slug)?.rotulo || slug;

export const TIPOS_SERVICO: Record<string, { rotulo: string; icone: string }> = {
  denuncia: { rotulo: 'Denúncia', icone: 'alert-octagon' },
  centro_referencia: { rotulo: 'Centro de referência LGBT+', icone: 'home' },
  saude: { rotulo: 'Saúde e testagem', icone: 'activity' },
  prep: { rotulo: 'PrEP e PEP', icone: 'shield' },
  defensoria: { rotulo: 'Defensoria Pública', icone: 'briefcase' },
  delegacia: { rotulo: 'Delegacia especializada', icone: 'flag' },
  acolhimento: { rotulo: 'Casa de acolhimento', icone: 'heart' },
  ong: { rotulo: 'ONGs e coletivos', icone: 'users' },
  juridico: { rotulo: 'Apoio jurídico', icone: 'file-text' },
  apoio_emocional: { rotulo: 'Apoio emocional', icone: 'smile' },
};
