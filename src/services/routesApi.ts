/**
 * Google Maps Platform Routes API Client
 * Computes routes, distance, duration, and encoded polylines between locations.
 */

import { isValidGoogleMapsApiKey, getGoogleMapsApiKey } from './googleMapsConfig';

export interface LatLngLiteral {
  lat: number;
  lng: number;
}

export interface RouteComputationResult {
  distanceMeters: number;
  distanceKm: number;
  durationSeconds: number;
  durationText: string;
  encodedPolyline?: string;
  path?: LatLngLiteral[];
}

export class RoutesApi {
  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || getGoogleMapsApiKey();
  }

  /**
   * Computes a driving route between origin and destination coordinates.
   */
  async computeRoute(
    origin: LatLngLiteral,
    destination: LatLngLiteral
  ): Promise<RouteComputationResult> {
    const key = this.apiKey || getGoogleMapsApiKey();
    if (!isValidGoogleMapsApiKey(key)) {
      return this.computeFallbackRoute(origin, destination);
    }

    // Try server-side proxy first (bypasses browser CORS restrictions completely)
    try {
      const proxyRes = await fetch('/api/maps/routes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ origin, destination })
      });

      if (proxyRes.status === 429) {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
        }
      }

      if (proxyRes.ok) {
        const data = await proxyRes.json();
        if (data?.error?.status === 'RESOURCE_EXHAUSTED' || data?.status === 'RESOURCE_EXHAUSTED') {
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
          }
        }
        const route = data.routes?.[0];
        if (route) {
          const distanceMeters = route.distanceMeters || 0;
          const durationSeconds = parseInt(route.duration?.replace('s', '') || '0', 10);
          const hours = Math.floor(durationSeconds / 3600);
          const mins = Math.floor((durationSeconds % 3600) / 60);
          const durationText = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

          return {
            distanceMeters,
            distanceKm: Math.round(distanceMeters / 1000),
            durationSeconds,
            durationText,
            encodedPolyline: route.polyline?.encodedPolyline
          };
        }
      }
    } catch (proxyErr) {
      console.warn('Server routes proxy error, trying fallback:', proxyErr);
    }

    return this.computeFallbackRoute(origin, destination);
  }

  /**
   * Generates a realistic geometric curved route path and haversine distance.
   */
  private computeFallbackRoute(origin: LatLngLiteral, destination: LatLngLiteral): RouteComputationResult {
    const R = 6371; // Earth radius in km
    const dLat = ((destination.lat - origin.lat) * Math.PI) / 180;
    const dLon = ((destination.lng - origin.lng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((origin.lat * Math.PI) / 180) *
        Math.cos((destination.lat * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const straightKm = R * c;

    // Road network factor in Saudi Arabia (approx 1.25x straight line distance)
    const distanceKm = Math.round(straightKm * 1.25);
    const distanceMeters = distanceKm * 1000;

    // Average heavy fleet speed: 75 km/h
    const durationHours = distanceKm / 75;
    const durationSeconds = Math.round(durationHours * 3600);
    const hours = Math.floor(durationHours);
    const mins = Math.round((durationHours - hours) * 60);
    const durationText = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

    // Interpolate 5 intermediate corridor waypoints with realistic highway bend
    const steps = 6;
    const path: LatLngLiteral[] = [];
    for (let i = 0; i <= steps; i++) {
      const frac = i / steps;
      const lat = origin.lat + (destination.lat - origin.lat) * frac;
      const lng = origin.lng + (destination.lng - origin.lng) * frac;
      // Slight perpendicular deviation for road curvature
      const arcBend = Math.sin(frac * Math.PI) * 0.04;
      path.push({
        lat: lat + arcBend,
        lng: lng + arcBend * 0.5
      });
    }

    return {
      distanceMeters,
      distanceKm,
      durationSeconds,
      durationText,
      path
    };
  }
}

export const routesApiClient = new RoutesApi();
