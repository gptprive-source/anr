import { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
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
  totalDistance: number; // in meters
  totalDuration: number; // in seconds
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

const relayIcon = createCustomIcon('#0EA5E9'); // Blue for relay points
const recipientIcon = createCustomIcon('#22C55E'); // Green for recipients
const startIcon = createCustomIcon('#EF4444'); // Red for start position

// Component to fit map bounds to markers
function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  
  useEffect(() => {
    if (points.length > 0) {
      const bounds = L.latLngBounds(points.map(p => [p[0], p[1]]));
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [points, map]);
  
  return null;
}

export function RouteOptimizationMap({ deliveryPoints, startPosition }: RouteOptimizationMapProps) {
  const [optimizedRoute, setOptimizedRoute] = useState<OptimizedRoute | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(startPosition || null);

  // Default center (Paris)
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

  // Calculate optimized route using OSRM
  const optimizeRoute = async () => {
    if (deliveryPoints.length < 2) {
      toast.error('Ajoutez au moins 2 points de livraison');
      return;
    }

    setIsOptimizing(true);

    try {
      // Build coordinates string for OSRM
      const start = userLocation || defaultCenter;
      const allPoints = [
        { lat: start[0], lon: start[1] },
        ...deliveryPoints.map(p => ({ lat: p.latitude, lon: p.longitude }))
      ];

      const coordinatesStr = allPoints
        .map(p => `${p.lon},${p.lat}`)
        .join(';');

      // Call OSRM Trip API for route optimization (traveling salesman)
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
        (coord: [number, number]) => [coord[1], coord[0]] // Swap lon/lat to lat/lon for Leaflet
      );

      // Reorder waypoints according to optimized route
      const waypointOrder = data.waypoints.map((wp: any) => wp.waypoint_index);
      const orderedPoints = waypointOrder
        .slice(1) // Skip the starting point
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

  // Format distance
  const formatDistance = (meters: number) => {
    if (meters >= 1000) {
      return `${(meters / 1000).toFixed(1)} km`;
    }
    return `${Math.round(meters)} m`;
  };

  // Format duration
  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}min`;
    }
    return `${minutes} min`;
  };

  const mapCenter = userLocation || defaultCenter;
  const allMapPoints: [number, number][] = [
    mapCenter,
    ...deliveryPoints.map(p => [p.latitude, p.longitude] as [number, number])
  ];

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

          <div className="h-[400px] rounded-lg overflow-hidden border">
            <MapContainer
              center={mapCenter}
              zoom={12}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              
              <FitBounds points={allMapPoints} />

              {/* Start position marker */}
              {userLocation && (
                <Marker position={userLocation} icon={startIcon}>
                  <Popup>
                    <strong>Point de départ</strong>
                    <br />
                    Votre position actuelle
                  </Popup>
                </Marker>
              )}

              {/* Delivery point markers */}
              {deliveryPoints.map((point, index) => (
                <Marker
                  key={point.id}
                  position={[point.latitude, point.longitude]}
                  icon={point.type === 'relay' ? relayIcon : recipientIcon}
                >
                  <Popup>
                    <div className="min-w-[150px]">
                      <strong>{point.name}</strong>
                      <br />
                      <span className="text-sm text-muted-foreground">{point.address}</span>
                      {point.parcelsCount && (
                        <>
                          <br />
                          <Badge variant="outline" className="mt-1">
                            {point.parcelsCount} colis
                          </Badge>
                        </>
                      )}
                      {optimizedRoute && (
                        <div className="mt-1 text-xs font-medium text-primary">
                          Arrêt #{optimizedRoute.waypoints.findIndex(w => w.id === point.id) + 1}
                        </div>
                      )}
                    </div>
                  </Popup>
                </Marker>
              ))}

              {/* Optimized route polyline */}
              {optimizedRoute && (
                <Polyline
                  positions={optimizedRoute.coordinates}
                  color="#0EA5E9"
                  weight={4}
                  opacity={0.8}
                />
              )}
            </MapContainer>
          </div>
        </CardContent>
      </Card>

      {/* Optimized order list */}
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
