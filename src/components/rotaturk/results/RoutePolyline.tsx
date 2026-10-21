'use client';

import { useEffect, useMemo } from 'react';
import { useMap } from '@vis.gl/react-google-maps';
import type { POI } from '@/lib/types';

/**
 * Rota çizgisini harita üzerinde gösteren ve haritayı rotaya göre ortalayan bileşen.
 */
export const RoutePolyline = ({ encodedPolyline, path, pois }: { encodedPolyline?: string, path?: {lat: number, lng: number}[], pois: POI[] }) => {
  const map = useMap();

  const decodedPathPoints = useMemo(() => {
    if (path && path.length > 0) return path;
    if (!encodedPolyline) return [];
    
    if (typeof window === 'undefined' || !window.google?.maps?.geometry) {
      return [];
    }
    try {
      const decoded = window.google.maps.geometry.encoding.decodePath(encodedPolyline);
      return decoded.map(p => ({ lat: p.lat(), lng: p.lng() }));
    } catch (e) {
      console.error("Polyline decoding failed:", e);
      return [];
    }
  }, [encodedPolyline, path]);

  useEffect(() => {
    if (!map || decodedPathPoints.length === 0 || typeof window === 'undefined' || !window.google?.maps) return;

    const routePolyline = new window.google.maps.Polyline({
      path: decodedPathPoints,
      strokeColor: '#1D4ED8', // My Route: Blue
      strokeOpacity: 0.9,
      strokeWeight: 8,
      geodesic: false, 
      map: map,
    });
    
    const bounds = new window.google.maps.LatLngBounds();
    decodedPathPoints.forEach(point => bounds.extend(point));
    map.fitBounds(bounds, 50); 

    return () => {
      routePolyline.setMap(null);
    };
  }, [map, decodedPathPoints]);

  return null;
};
