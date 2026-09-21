// Rodada 49 — pedido direto da Andrea: ela subiu uma foto de capa pro "Bar
// da Gra" no admin e a foto NÃO apareceu no app. Investigando o código de
// renderização (src/app/(tabs)/index.tsx) não achei bug nenhum lá — o
// <Image source={{ uri: item.foto_capa_url }}> está certo. O suspeito mais
// forte é o FORMATO do arquivo: fotos tiradas em iPhone/exportadas do
// Fotos no Mac saem em HEIC/HEIF por padrão, e o campo <input type="file"
// accept="image/*"> aceita esse arquivo de bom grado (o navegador reporta
// mime type "image/heic", que passa o teste `type.startsWith('image/')`),
// o Supabase Storage guarda o arquivo sem problema nenhum (bucket não tem
// restrição de mime type) — só que o componente <Image> do React Native
// (usado na Home do app) NÃO sabe decodificar HEIC/HEIF em nenhuma
// plataforma, e falha SILENCIOSAMENTE: sem erro, sem crash, só não mostra
// nada. Isso bate exatamente com "consegui subir mas não apareceu".
//
// Esta função vira a linha de defesa em TODO lugar que aceita upload de
// foto (admin, formulário de cadastro rápido, cadastro completo de
// local/evento) — bloqueia esses formatos ANTES de gastar upload, com uma
// mensagem que já explica como resolver (trocar o formato no
// iPhone/Fotos, ou mandar um print).
const EXTENSOES_NAO_SUPORTADAS = ['heic', 'heif'];

export function erroFotoNaoSuportada(arquivo: File): string | null {
  const tipo = (arquivo.type || '').toLowerCase();
  if (tipo && !tipo.startsWith('image/')) {
    return 'Selecione um arquivo de imagem (JPG, PNG ou WebP).';
  }
  const extensao = (arquivo.name.split('.').pop() || '').toLowerCase();
  if (EXTENSOES_NAO_SUPORTADAS.includes(extensao) || tipo.includes('heic') || tipo.includes('heif')) {
    return (
      'Esse formato (HEIC/HEIF — comum em fotos de iPhone) não abre dentro do app. ' +
      'No iPhone: Ajustes > Câmera > Formatos > "Mais Compatível" antes de tirar a próxima foto. ' +
      'Pra essa foto que você já tem: abra ela no app Fotos, toque em Compartilhar e escolha ' +
      '"Copiar foto" ou mande pra si mesma pelo WhatsApp (o WhatsApp já converte pra JPEG), ou tire ' +
      'um print da foto e envie o print. Formatos aceitos: JPG, PNG, WebP.'
    );
  }
  return null;
}

export const TAMANHO_MAXIMO_FOTO_MB = 5;
