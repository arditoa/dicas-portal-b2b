// Cidade/bairro atual pro cabeçalho da Home ("Você está em ...").
//
// Regra de privacidade (App Store 5.1.1 + LGPD): NUNCA pede permissão ao
// abrir o app. Só lê a localização se a pessoa já tiver autorizado antes;
// caso contrário mostra "Ativar localização" e só chama o pedido do sistema
// quando ela toca (função `ativar`).
import * as Location from 'expo-location';
import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';

export interface CidadeAtual {
  cidade: string | null;
  bairro: string | null;
  coords: { lat: number; lng: number } | null;
}

async function lerCidade(): Promise<CidadeAtual> {
  const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
  const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
  if (Platform.OS === 'web') return { cidade: null, bairro: null, coords };
  try {
    const [end] = await Location.reverseGeocodeAsync({ latitude: coords.lat, longitude: coords.lng });
    return {
      cidade: end?.city || end?.subregion || null,
      bairro: end?.district || null,
      coords,
    };
  } catch {
    return { cidade: null, bairro: null, coords };
  }
}

export function useCidadeAtual() {
  const [estado, setEstado] = useState<CidadeAtual>({ cidade: null, bairro: null, coords: null });
  const [autorizado, setAutorizado] = useState(false);

  useEffect(() => {
    let ativo = true;
    (async () => {
      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        if (status !== 'granted' || !ativo) return;
        setAutorizado(true);
        const r = await lerCidade();
        if (ativo) setEstado(r);
      } catch {
        // sem GPS: segue mostrando "Ativar localização"
      }
    })();
    return () => {
      ativo = false;
    };
  }, []);

  const ativar = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return false;
      setAutorizado(true);
      setEstado(await lerCidade());
      return true;
    } catch {
      return false;
    }
  }, []);

  return { ...estado, autorizado, ativar };
}
