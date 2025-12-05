// Geocoding service using OpenStreetMap Nominatim (free, no API key needed)

interface GeocodingResult {
  latitude: number;
  longitude: number;
  displayName: string;
}

// Reverse geocode: convert GPS coordinates to human-readable address
export async function reverseGeocode(latitude: number, longitude: number): Promise<string | null> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'ANR-App/1.0'
        }
      }
    );

    if (!response.ok) {
      console.error('Reverse geocoding request failed:', response.status);
      return null;
    }

    const result = await response.json();
    
    if (!result || result.error) {
      console.warn('No reverse geocoding results found');
      return null;
    }

    return result.display_name;
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    return null;
  }
}

export async function geocodeAddress(address: string): Promise<GeocodingResult | null> {
  try {
    const encodedAddress = encodeURIComponent(address);
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodedAddress}&limit=1&countrycodes=fr`,
      {
        headers: {
          'User-Agent': 'ANR-App/1.0'
        }
      }
    );

    if (!response.ok) {
      console.error('Geocoding request failed:', response.status);
      return null;
    }

    const results = await response.json();
    
    if (results.length === 0) {
      console.warn('No geocoding results found for:', address);
      return null;
    }

    const result = results[0];
    return {
      latitude: parseFloat(result.lat),
      longitude: parseFloat(result.lon),
      displayName: result.display_name
    };
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
}

// Calculate distance between two GPS coordinates in meters (Haversine formula)
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

// Check if visitor is within acceptable proximity (30 meters)
export function isWithinProximity(
  visitorLat: number,
  visitorLon: number,
  anrLat: number,
  anrLon: number,
  maxDistance: number = 30
): boolean {
  const distance = calculateDistance(visitorLat, visitorLon, anrLat, anrLon);
  return distance <= maxDistance;
}
