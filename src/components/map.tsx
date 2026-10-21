
'use client';

import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import {
  APIProvider,
  Map,
  AdvancedMarker,
  useMap,
} from '@vis.gl/react-google-maps';
import { useLocale } from 'next-intl';
import type { POI, RouteResult, ActiveTraveler } from '@/lib/types';
import { RoutePolyline } from './rotaturk/results/RoutePolyline';
import { LocateFixed, Loader2, Users, Maximize2, Minimize2, Layers, Landmark, Utensils, Bed, MapPin, Navigation as NavigationIcon, Trees, Palette, Scroll } from 'lucide-react';
import { Button } from './ui/button';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, where, Timestamp } from 'firebase/firestore';

const MapHandler = ({ 
  userLocation, 
  userHeading,
  route, 
  pois,
  navigationMode
}: { 
  userLocation: {lat: number, lng: number} | null, 
  userHeading: number | null,
  route?: Partial<RouteResult>, 
  pois: POI[],
  navigationMode?: boolean
}) => {
  const map = useMap();
  const hasAutoCenteredRef = useRef(false);
  const isNavInitializedRef = useRef(false);

  useEffect(() => {
    if (!map) return;

    if (navigationMode && userLocation) {
        // Navigasyon modunda kullanıcıyı merkezde tut
        map.panTo(userLocation);
        
        if (!isNavInitializedRef.current) {
            map.setZoom(18);
            map.setTilt(45);
            isNavInitializedRef.current = true;
        }

        if (userHeading !== null) {
            map.setHeading(userHeading);
        }
    } else {
        // Navigasyon modu kapalıysa veya ilk açılışta rota yoksa genel odaklanma
        isNavInitializedRef.current = false;

        if (map && userLocation && !hasAutoCenteredRef.current && !route && pois.length > 0) {
            map.panTo(userLocation);
            map.setZoom(12);
            map.setTilt(0);
            map.setHeading(0);
            hasAutoCenteredRef.current = true;
        }
        
        if (!navigationMode) {
            map.setTilt(0);
            map.setHeading(0);
        }
    }
  }, [map, userLocation, userHeading, route, pois.length, navigationMode]);

  return null;
};

export const EmbeddedMap = ({
  pois,
  route,
  onMarkerClick,
  onTravelerClick,
  waypoints,
  defaultZoom = 13,
  navigationMode = false
}: {
  pois: POI[];
  route?: Partial<RouteResult>;
  onMarkerClick?: (poi: POI) => void;
  onTravelerClick?: (traveler: ActiveTraveler) => void;
  waypoints?: POI[];
  defaultZoom?: number;
  navigationMode?: boolean;
}) => {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || 'AIzaSyCQNvNepfLrxH7o-PCRGqEBJFd3ofEotUQ';
  const db = useFirestore();
  const { user, isUserLoading } = useUser();
  const [userLocation, setUserLocation] = useState<{lat: number; lng: number} | null>(null);
  const [userHeading, setUserHeading] = useState<number | null>(null);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [mapTypeId, setMapTypeId] = useState('roadmap');

  const activeTravelersQuery = useMemoFirebase(() => {
    if (!db) return null;
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    return query(
      collection(db, 'activeTravelers'),
      where('lastUpdated', '>', Timestamp.fromDate(tenMinutesAgo))
    );
  }, [db]);

  const { data: activeTravelers } = useCollection<ActiveTraveler>(activeTravelersQuery);

  const otherTravelers = useMemo(() => {
    if (isUserLoading || !activeTravelers) return [];
    if (!user) return activeTravelers;
    return activeTravelers.filter(t => t.userId !== user.uid);
  }, [activeTravelers, user, isUserLoading]);

  useEffect(() => {
    if (typeof window !== 'undefined' && navigator.geolocation) {
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
          setUserHeading(position.coords.heading);
        },
        null,
        { enableHighAccuracy: true }
      );
      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, []);

  const toggleFullScreen = () => {
    setIsFullScreen(!isFullScreen);
    if (!isFullScreen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
  };

  const toggleMapType = () => {
    const types = ['roadmap', 'satellite', 'terrain', 'hybrid'];
    const currentIndex = types.indexOf(mapTypeId);
    const nextIndex = (currentIndex + 1) % types.length;
    setMapTypeId(types[nextIndex]);
  };

  useEffect(() => {
    return () => {
      if (typeof document !== 'undefined') {
        document.body.style.overflow = 'auto';
      }
    };
  }, []);

  if (!apiKey) return <div className="h-full w-full flex items-center justify-center bg-muted font-bold text-destructive p-4 text-center">Google Maps API Key eksik.</div>;

  return (
    <APIProvider apiKey={apiKey} libraries={['geometry']}>
      <div className={isFullScreen ? "fixed inset-0 z-[999999] bg-background w-screen h-screen top-0 left-0" : "h-full w-full relative z-10"}>
        <Map
          mapId={'rotaturk-map'}
          mapTypeId={mapTypeId}
          disableDefaultUI={true}
          gestureHandling={'greedy'}
          className="h-full w-full"
          defaultCenter={pois.length === 1 ? { lat: pois[0].latitude, lng: pois[0].longitude } : (userLocation || { lat: 38.9637, lng: 35.2433 })}
          defaultZoom={pois.length === 1 ? defaultZoom : (pois.length > 50 ? 6 : 11)}
        >
          <MapHandler 
            userLocation={userLocation} 
            userHeading={userHeading}
            route={route} 
            pois={pois} 
            navigationMode={navigationMode}
          />
          
          {route && (route.path || route.polyline) && (
             <RoutePolyline 
                encodedPolyline={route.polyline} 
                path={route.path}
                pois={waypoints || []} 
             />
          )}

          {otherTravelers?.map((traveler) => (
             traveler.routePolyline && (
               <TravelerRoutePolyline key={`route-${traveler.id}`} encodedPolyline={traveler.routePolyline} />
             )
          ))}

          <PoiMarkers pois={pois} onMarkerClick={onMarkerClick} hasPolyline={!!route?.polyline || !!route?.path} />
          
          {otherTravelers?.map((traveler) => (
            <TravelerMarker 
              key={traveler.id} 
              traveler={traveler} 
              onClick={() => onTravelerClick?.(traveler)} 
            />
          ))}

          {userLocation && <UserLocationMarker position={userLocation} heading={userHeading} />}
        </Map>
        
        <div className="absolute top-4 right-4 z-[10000] flex flex-col gap-2 pointer-events-auto">
            <Button 
              size="icon" 
              variant="secondary" 
              className="h-10 w-10 rounded-full shadow-lg bg-white/95 backdrop-blur-md border border-primary/20 text-primary hover:bg-white" 
              onClick={toggleMapType}
              title="Harita Görünümünü Değiştir"
            >
              <Layers size={20} />
            </Button>
            <Button 
              size="icon" 
              variant="secondary" 
              className="h-10 w-10 rounded-full shadow-lg bg-white/95 backdrop-blur-md border border-primary/20 text-primary hover:bg-white" 
              onClick={toggleFullScreen}
            >
              {isFullScreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
            </Button>
        </div>

        <div className="absolute bottom-10 right-4 z-[10000] flex flex-col gap-2 pointer-events-auto">
            <LocateMeButton userLocation={userLocation} setUserLocation={setUserLocation} />
        </div>

        {navigationMode && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[10000] pointer-events-none">
             <div className="bg-primary/90 backdrop-blur-md text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 border border-white/20 animate-bounce">
                <NavigationIcon size={20} className="fill-white" />
                <span className="font-bold text-sm tracking-wide">Navigasyon Aktif</span>
             </div>
          </div>
        )}
      </div>
    </APIProvider>
  );
};

const TravelerRoutePolyline = ({ encodedPolyline }: { encodedPolyline: string }) => {
  const map = useMap();
  useEffect(() => {
    if (!map || !encodedPolyline || typeof window === 'undefined' || !window.google?.maps?.geometry) return;
    try {
      const decoded = window.google.maps.geometry.encoding.decodePath(encodedPolyline);
      const poly = new window.google.maps.Polyline({
        strokeColor: '#ef4444',
        strokeOpacity: 0.9,
        strokeWeight: 8,
        path: decoded,
        map: map,
      });
      return () => poly.setMap(null);
    } catch (e) { return; }
  }, [map, encodedPolyline]);
  return null;
};

const TravelerMarker = ({ traveler, onClick }: { traveler: ActiveTraveler, onClick: () => void }) => {
  return (
    <AdvancedMarker position={{ lat: traveler.latitude, lng: traveler.longitude }} onClick={onClick}>
      <div className="relative flex flex-col items-center cursor-pointer group">
         <div className="absolute bottom-full mb-2 hidden group-hover:block px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 rounded-full shadow-lg whitespace-nowrap z-[10001]">
            {traveler.displayName} {traveler.routeName ? `(${traveler.routeName})` : '(Gezgin)'}
         </div>
         <div className="relative flex items-center justify-center">
            <div className="absolute w-8 h-8 bg-indigo-500/30 rounded-full animate-ping"></div>
            <div className="w-5 h-5 bg-indigo-600 rounded-full border-2 border-white shadow-xl flex items-center justify-center animate-bounce">
                <Users size={10} className="text-white" />
            </div>
         </div>
      </div>
    </AdvancedMarker>
  );
};

const LocateMeButton = ({ userLocation, setUserLocation }: any) => {
    const map = useMap();
    const [loading, setLoading] = useState(false);

    const handleLocate = useCallback(() => {
        if (!navigator.geolocation) return;
        setLoading(true);
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const newPos = { lat: position.coords.latitude, lng: position.coords.longitude };
                setUserLocation(newPos);
                if (map) { map.panTo(newPos); map.setZoom(15); }
                setLoading(false);
            },
            () => setLoading(false),
            { enableHighAccuracy: true }
        );
    }, [map, setUserLocation]);

    return (
        <Button size="icon" variant="secondary" className="h-12 w-12 rounded-full shadow-2xl bg-white/95 backdrop-blur-md border border-primary/20 text-primary hover:bg-white" onClick={handleLocate} disabled={loading}>
            {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : <LocateFixed className="h-6 w-6" />}
        </Button>
    );
};

const PoiMarkers = ({ pois, onMarkerClick, hasPolyline }: any) => {
  const map = useMap();
  const geocodedPois = useMemo(() => {
    if (!Array.isArray(pois)) return [];
    return pois.map((p: any) => ({...p, lat: p.latitude, lng: p.longitude}));
  }, [pois]);

  useEffect(() => {
    if (!map || geocodedPois.length === 0 || hasPolyline || typeof window === 'undefined' || !window.google?.maps) return;
    
    const bounds = new window.google.maps.LatLngBounds();
    geocodedPois.forEach((poi: any) => {
      if (typeof poi.lat === 'number' && typeof poi.lng === 'number') {
        bounds.extend({ lat: poi.lat, lng: poi.lng });
      }
    });
    
    if (geocodedPois.length === 1) { 
        map.setCenter({ lat: geocodedPois[0].lat, lng: geocodedPois[0].lng }); 
        map.setZoom(11); 
    }
    else if (geocodedPois.length > 1) { 
        map.fitBounds(bounds, 50); 
    }
  }, [map, geocodedPois, hasPolyline]);

  return (
    <>
      {geocodedPois.map((poi: any) => (
        <PoiMarker key={poi.id} poi={poi} onClick={() => onMarkerClick?.(poi)} />
      ))}
    </>
  );
};

const UserLocationMarker = ({ position, heading }: { position: {lat: number, lng: number}, heading?: number | null }) => (
  <AdvancedMarker position={position} zIndex={2000}>
    <div 
      className="w-6 h-6 flex items-center justify-center transition-transform duration-300"
      style={{ transform: `rotate(${heading || 0}deg)` }}
    >
      <svg width="20" height="20" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M20 4L36 34L20 29L4 34L20 4Z" fill="#3B82F6" stroke="white" strokeWidth="4" strokeLinejoin="round"/>
      </svg>
    </div>
  </AdvancedMarker>
);

const PoiMarker = ({ poi, onClick }: any) => {
  const locale = useLocale();
  
  const localizedName = useMemo(() => {
    if (!poi?.name) return poi.type || "Gezi Noktası";
    const name = (poi.name as any)[locale] || poi.name.en || poi.name.tr;
    return name || poi.type || "Gezi Noktası";
  }, [poi.name, poi.type, locale]);

  let color = "bg-red-500";
  let IconComponent = MapPin;
  
  if (poi.type === 'Konaklama') {
    color = "bg-cyan-500";
    IconComponent = Bed;
  }
  else if (poi.type === 'Yeme-İçme') {
    color = "bg-orange-500";
    IconComponent = Utensils;
  }
  else if (poi.type === 'Doğal') {
    color = "bg-emerald-500";
    IconComponent = Trees;
  }
  else if (poi.type === 'Kültürel') {
    color = "bg-indigo-500";
    IconComponent = Palette;
  }
  else if (poi.type === 'Arkeolojik') {
    color = "bg-amber-600";
    IconComponent = Scroll;
  }
  else if (poi.type === 'Tarihi') {
    color = "bg-slate-600";
    IconComponent = Landmark;
  }

  return (
    <AdvancedMarker position={{ lat: poi.lat, lng: poi.lng }} onClick={onClick} zIndex={1500}>
      <div className="relative flex flex-col items-center cursor-pointer group">
         <div className="absolute bottom-full mb-2 hidden group-hover:block px-3 py-1.5 text-xs font-bold text-white bg-black/90 rounded-xl shadow-2xl whitespace-nowrap z-[10001] animate-in fade-in zoom-in-95">
            {localizedName}
         </div>
         <div className={cn("w-4 h-4 rounded-full border-[1px] border-white shadow-lg flex items-center justify-center transition-all group-hover:scale-125", color)}>
            <IconComponent size={8} className="text-white" />
         </div>
         <div className={cn("w-0.5 h-0.5 rounded-full -mt-0.5 shadow-sm", color)}></div>
      </div>
    </AdvancedMarker>
  );
};

function cn(...inputs: any[]) {
    return inputs.filter(Boolean).join(' ');
}
