import { useState, useEffect } from 'react';
import * as Location from 'expo-location';

// `enabled` (default false) evita pedir permissão de localização assim
// que a tela monta — só dispara a solicitação real quando quem chama o
// hook passa `enabled: true` (ex.: usuário tocou num filtro de distância).
export function useLocation(enabled: boolean = false) {
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled || coords) return;

    setLoading(true);
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Permissão de acesso à localização negada.');
        setLoading(false);
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      setCoords({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
      setLoading(false);
    })();
  }, [enabled]);

  return { coords, errorMsg, loading };
}
