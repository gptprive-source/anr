import { useEffect, useState, useRef } from 'react';
import L from 'leaflet';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Navigation, Package, MapPin, Clock, Route, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in Leaflet with Vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface DeliveryPoint {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  type: 'relay' | 'recipient';
  parcelsCount?: number;
}

interface RouteOptimizationMapProps {
  deliveryPoints: DeliveryPoint[];
  startPosition?: [number, number];
}

interface OptimizedRoute {
  coordinates: [number, number][];
  totalDistance: number;
  totalDuration: number;
  waypoints: DeliveryPoint[];
}

// Custom marker icons
const createCustomIcon = (color: string) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="
      background-color: ${color};
      width: 30px;
      height: 30px;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      border: 2px solid white;
      box-shadow: 0 2px 5px rgba(0,0,0,0.3);
    "></div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 30],
    popupAnchor: [0, -30],
  });
};

const relayIcon = createCustomIcon('#0EA5E9');
const recipientIcon = createCustomIcon('#22C55E');
const startIcon = createCustomIcon('#EF4444');

export function RouteOptimizationMap({ deliveryPoints, startPosition }: RouteOptimizationMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const routeLayerRef = useRef<L.Polyline | null>(null);
  
  const [optimizedRoute, setOptimizedRoute] = useState<OptimizedRoute | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(startPosition || null);
  const [mapReady, setMapReady] = useState(false);

  const defaultCenter: [number, number] = [48.8566, 2.3522];

  // Get user's current location
  useEffect(() => {
    if (!startPosition && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation([position.coords.latitude, position.coords.longitude]);
        },
        (error) => {
          console.log('Geolocation error:', error);
        }
      );
    }
  }, [startPosition]);

  // Initialize map using vanilla Leaflet
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const center = userLocation || defaultCenter;
    
    const map = L.map(mapContainerRef.current, {
      center: center,
      zoom: 12,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    mapRef.current = map;
    setMapReady(true);

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Update markers when delivery points or user location changes
  useEffect(() => {
    if (!mapRef.current || !mapReady) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    const map = mapRef.current;
    const bounds: L.LatLngBoundsExpression = [];

    // Add start position marker
    if (userLocation) {
      const marker = L.marker(userLocation, { icon: startIcon })
        .addTo(map)
        .bindPopup('<strong>Point de départ</strong><br/>Votre position actuelle');
      markersRef.current.push(marker);
      bounds.push(userLocation);
    }

    // Add delivery point markers
    deliveryPoints.forEach((point, index) => {
      const icon = point.type === 'relay' ? relayIcon : recipientIcon;
      const position: [number, number] = [point.latitude, point.longitude];
      
      let orderInfo = '';
      if (optimizedRoute) {
        const orderIndex = optimizedRoute.waypoints.findIndex(w => w.id === point.id);
        if (orderIndex >= 0) {
          orderInfo = `<div style="margin-top: 4px; font-size: 12px; font-weight: bold; color: #0EA5E9;">Arrêt #${orderIndex + 1}</div>`;
        }
      }

      const popupContent = `
        <div style="min-width: 150px;">
          <strong>${point.name}</strong><br/>
          <span style="font-size: 12px; color: #666;">${point.address}</span>
          ${point.parcelsCount ? `<br/><span style="font-size: 12px;">${point.parcelsCount} colis</span>` : ''}
          ${orderInfo}
        </div>
      `;

      const marker = L.marker(position, { icon })
        .addTo(map)
        .bindPopup(popupContent);
      
      markersRef.current.push(marker);
      bounds.push(position);
    });

    // Fit bounds if we have points
    if (bounds.length > 1) {
      map.fitBounds(bounds, { padding: [50, 50] });
    } else if (bounds.length === 1) {
      map.setView(bounds[0] as [number, number], 12);
    }
  }, [deliveryPoints, userLocation, mapReady, optimizedRoute]);

  // Update route polyline
  useEffect(() => {
    if (!mapRef.current || !mapReady) return;

    // Remove existing route
    if (routeLayerRef.current) {
      routeLayerRef.current.remove();
      routeLayerRef.current = null;
    }

    // Add new route if available
    if (optimizedRoute && optimizedRoute.coordinates.length > 0) {
      routeLayerRef.current = L.polyline(optimizedRoute.coordinates, {
        color: '#0EA5E9',
        weight: 4,
        opacity: 0.8,
      }).addTo(mapRef.current);
    }
  }, [optimizedRoute, mapReady]);

  // Calculate optimized route using OSRM
  const optimizeRoute = async () => {
    if (deliveryPoints.length < 2) {
      toast.error('Ajoutez au moins 2 points de livraison');
      return;
    }

    setIsOptimizing(true);

    try {
      const start = userLocation || defaultCenter;
      const allPoints = [
        { lat: start[0], lon: start[1] },
        ...deliveryPoints.map(p => ({ lat: p.latitude, lon: p.longitude }))
      ];

      const coordinatesStr = allPoints
        .map(p => `${p.lon},${p.lat}`)
        .join(';');

      const response = await fetch(
        `https://router.project-osrm.org/trip/v1/driving/${coordinatesStr}?source=first&roundtrip=false&geometries=geojson&overview=full`
      );

      if (!response.ok) {
        throw new Error('Erreur lors du calcul de l\'itinéraire');
      }

      const data = await response.json();

      if (data.code !== 'Ok' || !data.trips || data.trips.length === 0) {
        throw new Error('Impossible de calculer l\'itinéraire');
      }

      const trip = data.trips[0];
      const coordinates: [number, number][] = trip.geometry.coordinates.map(
        (coord: [number, number]) => [coord[1], coord[0]]
      );

      const waypointOrder = data.waypoints.map((wp: any) => wp.waypoint_index);
      const orderedPoints = waypointOrder
        .slice(1)
        .map((index: number) => deliveryPoints[index - 1])
        .filter(Boolean);

      setOptimizedRoute({
        coordinates,
        totalDistance: trip.distance,
        totalDuration: trip.duration,
        waypoints: orderedPoints,
      });

      toast.success('Itinéraire optimisé calculé !');
    } catch (error) {
      console.error('Route optimization error:', error);
      toast.error('Erreur lors de l\'optimisation');
    } finally {
      setIsOptimizing(false);
    }
  };

  const formatDistance = (meters: number) => {
    if (meters >= 1000) {
      return `${(meters / 1000).toFixed(1)} km`;
    }
    return `${Math.round(meters)} m`;
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}min`;
    }
    return `${minutes} min`;
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Route className="h-5 w-5 text-primary" />
              Optimisation de tournée
            </CardTitle>
            <Button 
              onClick={optimizeRoute} 
              disabled={isOptimizing || deliveryPoints.length < 2}
            >
              {isOptimizing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Calcul...
                </>
              ) : (
                <>
                  <Navigation className="h-4 w-4 mr-2" />
                  Optimiser l'itinéraire
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {optimizedRoute && (
            <div className="flex gap-4 mb-4 flex-wrap">
              <Badge variant="secondary" className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {formatDistance(optimizedRoute.totalDistance)}
              </Badge>
              <Badge variant="secondary" className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatDuration(optimizedRoute.totalDuration)}
              </Badge>
              <Badge variant="secondary" className="flex items-center gap-1">
                <Package className="h-3 w-3" />
                {deliveryPoints.length} arrêts
              </Badge>
            </div>
          )}

          <div 
            ref={mapContainerRef}
            className="h-[400px] rounded-lg overflow-hidden border"
            style={{ minHeight: '400px' }}
          />
        </CardContent>
      </Card>

      {optimizedRoute && optimizedRoute.waypoints.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Ordre de livraison optimisé</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {optimizedRoute.waypoints.map((point, index) => (
                <div
                  key={point.id}
                  className="flex items-center gap-3 p-2 rounded-lg bg-muted/50"
                >
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{point.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{point.address}</p>
                  </div>
                  <Badge variant={point.type === 'relay' ? 'default' : 'secondary'}>
                    {point.type === 'relay' ? 'Relais' : 'Direct'}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
