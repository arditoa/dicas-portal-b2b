// Rodada 27 — a Andrea reportou que "ver no mapa" no perfil de local
// (business/[id].tsx no app) mostra "Este local ainda não informou
// coordenadas no mapa" pro Vezpa Bar (o teste dela). Causa raiz: `locais`
// já tem colunas lat/lng desde a arquitetura original (001), mas NENHUM
// cadastro do portal (local, rápido) nem a "Minha Página" jamais
// preencheram essas colunas — não existia nenhum caminho pra chegar até
// elas, em cadastro nenhum.
//
// Geocodificação automática best-effort via Nominatim (OpenStreetMap) —
// gratuito, sem chave de API, mesmo espírito de conveniência que a busca
// de CNPJ na BrasilAPI já usa em cadastro/local: se falhar (endereço
// impreciso, API fora do ar, rede bloqueada) o cadastro/salvamento
// continua funcionando normalmente, só sem coordenada — nunca bloqueia.
// Precisão depende do que foi informado: endereço completo dá ponto
// exato; só bairro+cidade dá o centro do bairro (melhor que nada, mas
// pode aparecer levemente deslocado no mapa — por isso a "Minha Página"
// também ganhou os campos manuais, pra corrigir à mão quando precisar).
export async function buscarCoordenadas(consulta: string): Promise<{ lat: number; lng: number } | null> {
  const texto = consulta.trim();
  if (!texto) return null;
  try {
    const resp = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=br&q=${encodeURIComponent(texto)}`
    );
    if (!resp.ok) return null;
    const dados = await resp.json();
    const primeiro = Array.isArray(dados) ? dados[0] : null;
    if (!primeiro?.lat || !primeiro?.lon) return null;
    const lat = Number(primeiro.lat);
    const lng = Number(primeiro.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng };
  } catch (err) {
    console.warn('Não foi possível geocodificar o endereço:', err);
    return null;
  }
}
