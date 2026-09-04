import * as Location from "expo-location";
import { useEffect, useState } from "react";

const DEFAULT_LOCATION = { lat: -23.5583, lng: -46.6565 }; // SP Consolação

export function useUserLocation() {
  const [location, setLocation] = useState<{ lat: number; lng: number }>(DEFAULT_LOCATION);
  const [loading, setLoading] = useState(true);
  const [permissionDenied, setPermissionDenied] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function requestLocation() {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          if (isMounted) {
            setPermissionDenied(true);
            setLoading(false);
          }
          return;
        }

        // Limite de 3 segundos para evitar travamento no navegador
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Timeout GPS")), 3000)
        );

        const positionPromise = Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        const currentPosition: any = await Promise.race([
          positionPromise,
          timeoutPromise,
        ]);

        if (isMounted && currentPosition?.coords) {
          setLocation({
            lat: currentPosition.coords.latitude,
            lng: currentPosition.coords.longitude,
          });
        }
      } catch (error) {
        console.warn("GPS indisponível/timeout no navegador. Usando localização padrão.", error);
        if (isMounted) setPermissionDenied(true);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    requestLocation();

    return () => {
      isMounted = false;
    };
  }, []);

  return { location, loading, permissionDenied };
}
