'use client';

import { useEffect, useState, useRef } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useToast } from '@/hooks/use-toast';
import { getAllPois } from '@/app/actions';
import type { POI } from '@/lib/types';
import { ToastAction } from '@/components/ui/toast';

const haversineDistance = (
  coords1: { lat: number; lng: number },
  coords2: { lat: number; lng: number }
): number => {
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

/**
 * Kullanıcının gezi noktalarına yakınlığını izleyen ve mesafeye göre uyarı veren bileşen.
 */
export function ProximityAlertManager() {
  const t = useTranslations('ProximityAlert');
  const locale = useLocale();
  const { toast } = useToast();
  const [allPois, setAllPois] = useState<POI[]>([]);
  const [canShowAlerts, setCanShowAlerts] = useState(false);
  
  // Bildirimlerin durumunu takip etmek için
  const lastNotifiedPoiIdRef = useRef<string | null>(null);
  const lastNotifiedTypeRef = useRef<'arrived' | 'nearby' | null>(null);

  useEffect(() => {
    getAllPois().then(setAllPois).catch(console.error);

    // Açılış slaytı bittikten sonra bildirimleri aktif et (6 saniye)
    const timer = setTimeout(() => {
      setCanShowAlerts(true);
    }, 6000);
    return () => clearTimeout(timer);
  }, []);

  const formatDistance = (distKm: number, loc: string) => {
    if (distKm < 1) {
      const meters = Math.round(distKm * 1000);
      switch(loc) {
        case 'tr': return `${meters} metre`;
        case 'en': return `${meters} meters`;
        case 'fr': return `${meters} mètres`;
        case 'de': return `${meters} Meter`;
        default: return `${meters} m`;
      }
    }
    return `${distKm.toFixed(1)} km`;
  };

  useEffect(() => {
    if (!canShowAlerts || typeof window === 'undefined' || !navigator.geolocation || allPois.length === 0) return;

    const options = { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 };

    const watchId = navigator.geolocation.watchPosition(
      async (position) => {
        const userCoords = { lat: position.coords.latitude, lng: position.coords.longitude };

        // 1. En yakın noktayı bul
        let nearestPoi: POI | null = null;
        let minDist = Infinity;

        allPois.forEach(poi => {
          const dist = haversineDistance(userCoords, { lat: poi.latitude, lng: poi.longitude });
          if (dist < minDist) {
            minDist = dist;
            nearestPoi = poi;
          }
        });

        // 2. 2 km kısıtlaması
        if (!nearestPoi || minDist > 2.0) {
          lastNotifiedPoiIdRef.current = null;
          lastNotifiedTypeRef.current = null;
          return;
        }

        const poi = nearestPoi as POI;
        const poiName = (poi.name as any)[locale] || poi.name.en || poi.name.tr;
        const currentType = minDist <= 0.05 ? 'arrived' : 'nearby';

        // 3. Durum değişikliği veya yeni mekan kontrolü
        if (poi.id !== lastNotifiedPoiIdRef.current || currentType !== lastNotifiedTypeRef.current) {
          
          let message = "";
          let title = t('title');
          let showCheckinAction = false;

          if (currentType === 'arrived') {
            message = t('message', { name: poiName });
            showCheckinAction = true;
          } else {
            const distanceStr = formatDistance(minDist, locale);
            message = t('nearbyMessage', { name: poiName, distance: distanceStr });
          }

          // Bildirimi göster
          toast({ 
            title: title, 
            description: message,
            duration: 8000,
            action: showCheckinAction ? (
              <ToastAction altText={t('yes')} onClick={() => {
                window.dispatchEvent(new CustomEvent('focus-poi', { detail: poi }));
              }}>
                {t('yes')}
              </ToastAction>
            ) : undefined
          });

          // Sesli uyarı aktifse ve varış durumundaysa oku
          const voiceAlertsEnabled = localStorage.getItem('rt-voice-alerts') !== 'false';
          if (voiceAlertsEnabled && 'speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(message);
            utterance.lang = locale === 'tr' ? 'tr-TR' : locale === 'fr' ? 'fr-FR' : locale === 'de' ? 'de-DE' : 'en-US';
            window.speechSynthesis.speak(utterance);
          }

          // Referansları güncelle
          lastNotifiedPoiIdRef.current = poi.id;
          lastNotifiedTypeRef.current = currentType;
        }
      },
      (error) => console.warn("Geolocation error:", error.message),
      options
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [allPois, locale, t, toast, canShowAlerts]);

  return null;
}
