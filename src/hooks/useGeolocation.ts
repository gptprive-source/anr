import { useState, useCallback } from "react";

interface GeolocationState {
  latitude: number | null;
  longitude: number | null;
  error: string | null;
  loading: boolean;
}

export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>({
    latitude: null,
    longitude: null,
    error: null,
    loading: false,
  });

  const getCurrentPosition = useCallback((): Promise<{ latitude: number; longitude: number }> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        const error = "La géolocalisation n'est pas supportée par votre navigateur";
        setState(prev => ({ ...prev, error, loading: false }));
        reject(new Error(error));
        return;
      }

      setState(prev => ({ ...prev, loading: true, error: null }));

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setState({
            latitude,
            longitude,
            error: null,
            loading: false,
          });
          resolve({ latitude, longitude });
        },
        (error) => {
          let errorMessage = "Erreur de géolocalisation";
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = "Vous devez autoriser l'accès à votre position";
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = "Position non disponible";
              break;
            case error.TIMEOUT:
              errorMessage = "La requête a expiré";
              break;
          }
          setState(prev => ({ ...prev, error: errorMessage, loading: false }));
          reject(new Error(errorMessage));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    });
  }, []);

  return {
    ...state,
    getCurrentPosition,
  };
}
