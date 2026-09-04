export interface CNPJAddressData {
  companyName: string;
  tradeName: string;
  street: string;
  number: string;
  neighborhood: string;
  city: string;
  state: string;
  cep: string;
  latitude: number;
  longitude: number;
}

export async function fetchCNPJAndLocation(cnpj: string): Promise<CNPJAddressData | null> {
  const cleanCnpj = cnpj.replace(/\D/g, '');
  if (cleanCnpj.length !== 14) return null;

  try {
    // 1. Consulta Dados Oficiais do CNPJ via BrasilAPI (Gratuito e sem API Key)
    const cnpjResponse = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanCnpj}`);
    if (!cnpjResponse.ok) return null;

    const cnpjData = await cnpjResponse.json();

    const companyName = cnpjData.nome_fantasia || cnpjData.razao_social || 'Novo Estabelecimento';
    const street = cnpjData.logradouro || '';
    const number = cnpjData.numero || '';
    const neighborhood = cnpjData.bairro || '';
    const city = cnpjData.municipio || '';
    const state = cnpjData.uf || '';
    const cep = cnpjData.cep || '';

    // 2. Transforma o Endereço em Latitude/Longitude para o Mapa
    let latitude = -23.5505;
    let longitude = -46.6333;

    try {
      const addressQuery = `${street}, ${number}, ${neighborhood}, ${city} - ${state}, Brasil`;
      const geoResponse = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addressQuery)}`,
        { headers: { 'User-Agent': 'DicasLGBTApp/1.0' } }
      );
      const geoData = await geoResponse.json();

      if (geoData && geoData.length > 0) {
        latitude = parseFloat(geoData[0].lat);
        longitude = parseFloat(geoData[0].lon);
      }
    } catch {
      // Caso ocorra falha no Geocoding, mantém as coordenadas padrão da cidade
    }

    return {
      companyName,
      tradeName: companyName,
      street,
      number,
      neighborhood,
      city,
      state,
      cep,
      latitude,
      longitude,
    };
  } catch (error) {
    console.error('Erro ao buscar dados do CNPJ:', error);
    return null;
  }
}