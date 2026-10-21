// Distância em linha reta entre dois pontos (fórmula de Haversine).
// Não usa API paga: é só conta com latitude/longitude. Para mostrar algo
// mais próximo do trajeto real a pé, `tempoAPe` aplica um fator de 1,3
// (ruas não são linha reta) e 80 m/min de caminhada.

export function distanciaMetros(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const rad = (g: number) => (g * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLng = rad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export function formatarDistancia(m: number): string {
  if (m < 1000) return `${Math.max(50, Math.round(m / 50) * 50)} m`;
  return `${(m / 1000).toFixed(1).replace('.', ',')} km`;
}

export function tempoAPe(m: number): string | null {
  const min = Math.round((m * 1.3) / 80);
  if (min > 40) return null;
  return `${Math.max(1, min)} min a pé`;
}
