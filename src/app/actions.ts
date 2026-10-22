
'use server';

import {
  collection,
  getDocs,
  query,
} from 'firebase/firestore';
import { getFirestoreInstance } from '@/firebase/server';
import { Client, Language, TravelMode } from "@googlemaps/google-maps-services-js";

import type { POI, RouteResult } from '@/lib/types';
import staticPoisData from '@/lib/data/static-pois.json';
import staticPoisData2 from '@/lib/data/static-pois2.json';
import funFactsData from '@/lib/data/fun-facts.json';
import cityInfoData from '@/lib/data/city-info.json';
import cityEventsData from '@/lib/data/city-events.json';
import regionalToursData from '@/lib/data/regional-tours.json';

/**
 * Agresif Serialization: Firestore nesnelerini (Timestamps, Classes, toJSON vb.) 
 * Next.js Client Components ile tam uyumlu saf JSON'a dönüştürür.
 */
function serializeData(data: any): any {
  if (data === null || data === undefined) return data;
  
  if (data && typeof data === 'object') {
    if (typeof data.toDate === 'function') {
      return data.toDate().toISOString();
    }
    if (typeof data.toISOString === 'function') {
      return data.toISOString();
    }
    if ('seconds' in data && 'nanoseconds' in data) {
      return new Date(data.seconds * 1000).toISOString();
    }
  }

  if (Array.isArray(data)) {
    return data.map(item => serializeData(item));
  }

  if (typeof data === 'object' && Object.prototype.toString.call(data) === '[object Object]') {
    const result: any = {};
    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        result[key] = serializeData(data[key]);
      }
    }
    return result;
  }

  return data;
}

// --- Helpers ---
const haversineDistance = (coords1: { lat: number; lng: number }, coords2: { lat: number; lng: number }): number => {
  const toRad = (x: number) => (x * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(coords2.lat - coords1.lat);
  const dLon = toRad(coords2.lng - coords1.lng);
  const lat1 = toRad(coords1.lat);
  const lat2 = toRad(coords2.lat);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const decodePolyline = (encoded: string): { lat: number, lng: number }[] => {
    let index = 0, len = encoded.length, lat = 0, lng = 0;
    const path = [];
    while (index < len) {
        let b, shift = 0, result = 0;
        do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
        lat += ((result & 1) ? ~(result >> 1) : (result >> 1));
        shift = 0; result = 0;
        do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
        lng += ((result & 1) ? ~(result >> 1) : (result >> 1));
        path.push({ lat: lat / 1e5, lng: lng / 1e5 });
    }
    return path;
};

export async function getAllPois(): Promise<POI[]> {
    try {
        const db = getFirestoreInstance();
        const poisCol = collection(db, 'pois');
        const snapshot = await getDocs(poisCol);
        
        if (!snapshot.empty) {
            const poisById = new Map<string, POI>();
            for (const poiDoc of snapshot.docs) {
                poisById.set(poiDoc.id, {
                    ...poiDoc.data(),
                    id: poiDoc.id
                } as POI);
            }
            const existingNames = new Set(
                Array.from(poisById.values())
                    .flatMap(poi => Object.values(poi.name || {}))
                    .filter((name): name is string => typeof name === 'string' && name.trim().length > 0)
                    .map(name => name.trim().toLocaleLowerCase('tr-TR'))
            );
            for (const poi of staticPoisData2.pois as POI[]) {
                const names = Object.values(poi.name || {})
                    .filter((name): name is string => typeof name === 'string' && name.trim().length > 0)
                    .map(name => name.trim().toLocaleLowerCase('tr-TR'));
                if (poisById.has(poi.id) || names.some(name => existingNames.has(name))) continue;
                poisById.set(poi.id, poi);
                names.forEach(name => existingNames.add(name));
            }
            return serializeData(Array.from(poisById.values())) as POI[];
        }
        
        const combinedLocal = [
            ...(staticPoisData.pois as any[]),
            ...(staticPoisData2.pois as any[])
        ];
        return serializeData(combinedLocal) as POI[];
    } catch (error) {
        const combinedLocal = [
            ...(staticPoisData.pois as any[]),
            ...(staticPoisData2.pois as any[])
        ];
        return serializeData(combinedLocal) as POI[];
    }
}

export async function getCityEventsAction(input: { city: string }): Promise<any[]> {
    try {
        const events = (cityEventsData.events || []) as any[];
        return serializeData(events.filter(ev => ev.city === input.city));
    } catch (e) {
        return [];
    }
}

export async function getRandomFact(locale: string): Promise<{ fact: string }> {
  const facts = (funFactsData as Record<string, string[]>)[locale] || (funFactsData as any).tr || [];
  if (facts.length === 0) return { fact: "" };
  const randomIndex = Math.floor(Math.random() * facts.length);
  return { fact: facts[randomIndex] };
}

export async function getManualRoute(input: any): Promise<Partial<RouteResult>> {
  const { start, end, stops = [], poiTypes, fuelCostPerKm = 3.2, corridorWidth = 20, selectedPoiIds } = input;
  
  const getLocStr = (loc: any) => {
    if (loc.lat && loc.lng) return `${loc.lat},${loc.lng}`;
    return loc.district ? `${loc.district}, ${loc.city}` : loc.city;
  };

  const startStr = getLocStr(start);
  const endStr = getLocStr(end);
  const manualWaypointsStrings = stops.map((s: any) => getLocStr(s));

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || 'AIzaSyCQNvNepfLrxH7o-PCRGqEBJFd3ofEotUQ';
  const client = new Client({});
  
  try {
    const initialRes = await client.directions({
        params: { origin: startStr, destination: endStr, waypoints: manualWaypointsStrings, optimize: false, mode: TravelMode.driving, key: apiKey, language: Language.tr },
    });

    if (initialRes.data.status !== 'OK' || initialRes.data.routes.length === 0) {
        throw new Error("Rota hesaplanamadı.");
    }

    const initialRoute = initialRes.data.routes[0];
    const initialFullPath: { lat: number, lng: number }[] = [];
    initialRoute.legs.forEach(leg => { 
        leg.steps.forEach(step => {
            initialFullPath.push(...decodePolyline(step.polyline.points));
        });
    });

    const pathLength = initialFullPath.length;
    const samplingRate = Math.max(1, Math.floor(pathLength / 300));
    const sampledPath: { lat: number; lng: number }[] = [];
    for (let i = 0; i < pathLength; i += samplingRate) {
        sampledPath.push(initialFullPath[i]);
    }

    // --- POI Keşif Filtreleme ---
    let allAvailablePois = await getAllPois();

    // Eğer kullanıcı spesifik noktalar SEÇEREK yeni bir rota oluşturmuşsa (selectedPoiIds varsa),
    // sadece bu noktaları dikkate al, diğerlerini listeden çıkar.
    if (selectedPoiIds && Array.isArray(selectedPoiIds) && selectedPoiIds.length > 0) {
        allAvailablePois = allAvailablePois.filter(poi => selectedPoiIds.includes(poi.id));
    }

    const candidatePoisWithOrder = allAvailablePois
        .filter(poi => poi && poi.id && (!poiTypes || poiTypes.includes(poi.type)))
        .map(poi => {
            let minDistance = Infinity;
            let closestIndex = -1;
            const poiCoords = { lat: poi.latitude, lng: poi.longitude };
            
            for (let i = 0; i < sampledPath.length; i++) {
                const dist = haversineDistance(poiCoords, sampledPath[i]);
                if (dist < minDistance) {
                    minDistance = dist;
                    closestIndex = i;
                }
            }
            // Eğer özel seçim varsa mesafeye bakmaksızın (veya daha esnek bir şekilde) dahil et
            const threshold = (selectedPoiIds && selectedPoiIds.length > 0) ? 100 : corridorWidth;
            return { poi, order: minDistance <= threshold ? closestIndex : -1 };
        })
        .filter(item => item.order !== -1)
        .sort((a, b) => a.order - b.order);

    const touristPois = candidatePoisWithOrder.map(item => item.poi).filter(p => ['Kültürel', 'Arkeolojik', 'Doğal', 'Tarihi'].includes(p.type));
    const servicePois = candidatePoisWithOrder.map(item => item.poi).filter(p => ['Yeme-İçme', 'Konaklama'].includes(p.type));

    const maxPoiStops = Math.max(0, 18 - manualWaypointsStrings.length);
    const selectedPoiStops = touristPois.slice(0, maxPoiStops);
    const poiWaypointStrings = selectedPoiStops.map(p => `${p.latitude},${p.longitude}`);

    const finalWaypoints = [...manualWaypointsStrings, ...poiWaypointStrings];

    const finalRes = await client.directions({
        params: { 
            origin: startStr, 
            destination: endStr, 
            waypoints: finalWaypoints, 
            optimize: true, 
            mode: TravelMode.driving, 
            key: apiKey, 
            language: Language.tr 
        },
    });

    if (finalRes.data.status === 'OK' && finalRes.data.routes.length > 0) {
        const finalRoute = finalRes.data.routes[0];
        let totalDist = 0;
        let totalDur = 0;
        const finalFullPath: { lat: number, lng: number }[] = [];
        
        finalRoute.legs.forEach(leg => { 
            totalDist += leg.distance.value; 
            totalDur += leg.duration.value; 
            leg.steps.forEach(step => {
                finalFullPath.push(...decodePolyline(step.polyline.points));
            });
        });

        const totalDistKm = totalDist / 1000;

        const waypointsParam = finalWaypoints.length > 0 ? `&waypoints=${encodeURIComponent(finalWaypoints.join('|'))}` : '';
        const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(startStr)}&destination=${encodeURIComponent(endStr)}${waypointsParam}&travelmode=driving`;

        return serializeData({
            routeId: `detailed-${Date.now()}`,
            name: `${start.city} - ${end.city} Detaylı Rotası`,
            start, end, stops,
            totalDistance: totalDistKm,
            totalDuration: totalDur,
            fuelCost: totalDistKm * fuelCostPerKm,
            polyline: finalRoute.overview_polyline.points,
            path: finalFullPath,
            touristPois,
            servicePois,
            googleMapsUrl
        });
    }
    
    throw new Error("Detaylı rota hesaplanamadı.");
  } catch(e: any) {
     throw new Error(e.message);
  }
}

export async function getCityPoisAction(input: { city: string }): Promise<Partial<RouteResult>> {
  const all = await getAllPois();
  const cityPois = all.filter(p => p && p.location && p.location.city === input.city);
  return serializeData({
    routeId: `city-${input.city}`,
    name: `${input.city} İçin Öneriler`,
    touristPois: cityPois.filter(p => ['Kültürel', 'Arkeolojik', 'Doğal', 'Tarihi'].includes(p.type)),
    servicePois: cityPois.filter(p => ['Yeme-İçme', 'Konaklama'].includes(p.type)),
    googleMapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(input.city)}`
  });
}

export async function getCityInfoAction(input: { city: string, locale: string }): Promise<{ info: string | null }> {
  try {
    const cityData = (cityInfoData as any)[input.city];
    return { info: cityData ? (cityData[input.locale] || cityData.tr) : null };
  } catch (e) {
    return { info: null };
  }
}

export async function getNearbyPois(input: { lat: number, lng: number }): Promise<Partial<RouteResult>> {
    const all = await getAllPois();
    const nearby = all
        .filter(p => p && p.id)
        .map(poi => ({
            poi,
            distance: haversineDistance({lat: poi.latitude, lng: poi.longitude}, input)
        }))
        .filter(item => item.distance <= 50)
        .sort((a, b) => a.distance - b.distance)
        .map(item => item.poi);

    return serializeData({
        routeId: `nearby-${Date.now()}`,
        name: `Yakınınızdaki Gezilecek Yerler`,
        touristPois: nearby.filter(p => ['Kültürel', 'Arkeolojik', 'Doğal', 'Tarihi'].includes(p.type)),
        servicePois: nearby.filter(p => ['Yeme-İçme', 'Konaklama'].includes(p.type)),
        googleMapsUrl: `https://www.google.com/maps/search/?api=1&query=${input.lat},${input.lng}`
    });
}

export async function reverseGeocode(coords: { lat: number; lng: number }): Promise<{ location?: { city: string; district?: string }; error?: string }> {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || 'AIzaSyCQNvNepfLrxH7o-PCRGqEBJFd3ofEotUQ';
  if (!apiKey) return { error: "API Key missing" };

  const client = new Client({});
  try {
    const res = await client.reverseGeocode({
      params: { latlng: [coords.lat, coords.lng], key: apiKey, language: Language.tr },
    });

    if (res.data.status === 'OK' && res.data.results.length > 0) {
      let city = '';
      let district = '';

      for (const result of res.data.results) {
        for (const component of result.address_components) {
          const types = (component.types as unknown) as string[];
          if (types.includes('administrative_area_level_1')) {
            city = component.long_name.replace(' Province', '').replace(' İli', '');
          }
          if (types.includes('administrative_area_level_2')) {
            district = component.long_name.replace(' District', '').replace(' İlçesi', '');
          }
        }
        if (city) break;
      }
      return { location: { city, district } };
    }
    return { error: "Location not found" };
  } catch (e: any) {
    return { error: e.message };
  }
}

export async function getRegionalPoisAction(input: { regionKey: string; locale: string; userLocation?: { lat: number; lng: number } }): Promise<Partial<RouteResult>> {
  const region = regionalToursData.regions.find(r => r.key === input.regionKey);
  if (!region) throw new Error("Region not found");

  const all = await getAllPois();
  const regionPois = all.filter(p => p && p.location && region.cities.includes(p.location.city));

  const touristPois = regionPois.filter(p => ['Kültürel', 'Arkeolojik', 'Doğal', 'Tarihi'].includes(p.type));
  const servicePois = regionPois.filter(p => ['Yeme-İçme', 'Konaklama'].includes(p.type));

  const localizedName = (region.name as any)[input.locale] || region.name.tr;

  return serializeData({
    routeId: `regional-${input.regionKey}`,
    name: `${localizedName} Turu`,
    touristPois,
    servicePois,
    googleMapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(localizedName)}`
  });
}

export async function getMultiDayLoopAction(input: { lat: number; lng: number; days: number; locale: string }): Promise<Partial<RouteResult>> {
    try {
        const all = await getAllPois();
        const radius = input.days * 60;
        const userCoords = { lat: input.lat, lng: input.lng };
        
        const nearbyWithDist = all
            .filter(p => p && p.id)
            .map(poi => ({
                poi,
                distance: haversineDistance({lat: poi.latitude, lng: poi.longitude}, userCoords)
            }))
            .filter(item => item.distance <= radius)
            .sort((a, b) => a.distance - b.distance);

        const rawPois = nearbyWithDist.map(item => item.poi);
        const selectedPois: POI[] = [];
        if (rawPois.length > 0) {
            const step = Math.max(1, Math.floor(rawPois.length / 8));
            for (let i = 0; i < rawPois.length && selectedPois.length < 8; i += step) {
                selectedPois.push(rawPois[i]);
            }
        }

        if (selectedPois.length === 0) {
            throw new Error("Çevrede uygun gezi noktası bulunamadı.");
        }

        const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || 'AIzaSyCQNvNepfLrxH7o-PCRGqEBJFd3ofEotUQ';
        const client = new Client({});
        const originStr = `${input.lat},${input.lng}`;
        const waypointsStrings = selectedPois.map(p => `${p.latitude},${p.longitude}`);

        const res = await client.directions({
            params: { origin: originStr, destination: originStr, waypoints: waypointsStrings, optimize: true, mode: TravelMode.driving, key: apiKey, language: Language.tr },
        });

        if (res.data.status === 'OK' && res.data.routes.length > 0) {
            const route = res.data.routes[0];
            let totalDist = 0;
            let totalDur = 0;
            const fullPath: { lat: number, lng: number }[] = [];
            
            route.legs.forEach(leg => { 
                totalDist += leg.distance.value; 
                totalDur += leg.duration.value; 
                leg.steps.forEach(step => {
                    fullPath.push(...decodePolyline(step.polyline.points));
                });
            });

            const waypointsParam = waypointsStrings.length > 0 ? `&waypoints=${encodeURIComponent(waypointsStrings.join('|'))}` : '';
            const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(originStr)}&destination=${encodeURIComponent(originStr)}${waypointsParam}&travelmode=driving`;

            return serializeData({
                routeId: `loop-${Date.now()}`,
                name: `${input.days} Günlük Döngüsel Tur`,
                totalDistance: totalDist / 1000,
                totalDuration: totalDur,
                fuelCost: (totalDist / 1000) * 3.2,
                polyline: route.overview_polyline.points,
                path: fullPath,
                touristPois: selectedPois.filter(p => ['Kültürel', 'Arkeolojik', 'Doğal', 'Tarihi'].includes(p.type)),
                servicePois: selectedPois.filter(p => ['Yeme-İçme', 'Konaklama'].includes(p.type)),
                googleMapsUrl
            });
        }
        throw new Error("Google Rota servisi sonuç döndürmedi.");
    } catch (error: any) {
        throw new Error(error.message || "Rota hesaplanamadı.");
    }
}

export async function getGooglePlaceDetails(input: { poiName: string; poiLocation: string }): Promise<{ details: any }> {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || 'AIzaSyCQNvNepfLrxH7o-PCRGqEBJFd3ofEotUQ';
    const client = new Client({});
    try {
        const searchQuery = `${input.poiName} ${input.poiLocation} Türkiye`;
        
        let searchRes = await client.textSearch({
            params: {
                query: searchQuery,
                key: apiKey,
                language: Language.tr
            }
        });

        if (searchRes.data.status !== 'OK' || searchRes.data.results.length === 0) {
             searchRes = await client.textSearch({
                params: {
                    query: `${input.poiName} Türkiye`,
                    key: apiKey,
                    language: Language.tr
                }
            });
        }

        if (searchRes.data.status === 'OK' && searchRes.data.results.length > 0) {
            const place = searchRes.data.results[0];
            const placeId = place.place_id!;
            
            const detailsRes = await client.placeDetails({
                params: { 
                    place_id: placeId, 
                    fields: ['name', 'formatted_address', 'photos', 'url', 'rating', 'user_ratings_total', 'geometry'], 
                    key: apiKey, 
                    language: Language.tr 
                }
            });

            const details = detailsRes.data.result;
            if (details && details.photos) {
                details.photos = details.photos.slice(0, 4).map((p: any) => ({
                    ...p,
                    url: `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photoreference=${p.photo_reference}&key=${apiKey}`
                }));
            }
            return serializeData({ details });
        }
        return { details: null };
    } catch (e: any) {
        return { details: null };
    }
}
