
'use client';

import { useState, useEffect, useRef } from 'react';
import { useUser, useFirestore, useAuth } from '@/firebase';
import { doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { signInAnonymously } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { useTranslations } from 'next-intl';

export function LiveTrackingControl() {
  const { user } = useUser();
  const auth = useAuth();
  const db = useFirestore();
  const { toast } = useToast();
  const t = useTranslations('LiveTracking');
  
  const [isSharing, setIsSharing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const watchIdRef = useRef<number | null>(null);

  const getActiveRoute = () => {
    if (typeof window === 'undefined') return null;
    try {
      const plannerData = window.localStorage.getItem('rotaTurkPlanner');
      if (plannerData) {
        const parsed = JSON.parse(plannerData);
        return parsed.value?.result?.data || null;
      }
    } catch (e) {
      return null;
    }
    return null;
  };

  const stopSharing = async () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (user && db) {
      await deleteDoc(doc(db, 'activeTravelers', user.uid));
    }
    setIsSharing(false);
    toast({ title: t('sharingStopped') });
  };

  const startSharing = async () => {
    setIsLoading(true);
    try {
      let currentUser = user;
      if (!currentUser) {
        const cred = await signInAnonymously(auth);
        currentUser = cred.user;
      }

      if (!navigator.geolocation) {
        throw new Error("Geolocation not supported");
      }

      watchIdRef.current = navigator.geolocation.watchPosition(
        (position) => {
          if (db && currentUser) {
            const activeRoute = getActiveRoute();
            setDoc(doc(db, 'activeTravelers', currentUser.uid), {
              userId: currentUser.uid,
              displayName: currentUser.displayName || t('anonymousTraveler'),
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              lastUpdated: serverTimestamp(),
              routeName: activeRoute?.name || null,
              routePolyline: activeRoute?.polyline || null,
            }, { merge: true });
          }
        },
        (err) => {
          console.error(err);
          stopSharing();
        },
        { enableHighAccuracy: true }
      );

      setIsSharing(true);
      toast({ title: t('sharingStarted'), description: t('sharingDesc') });
    } catch (error) {
      toast({ variant: 'destructive', title: t('error'), description: t('genericError') });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        stopSharing();
      }
    };
  }, []);

  return (
    <Button 
      onClick={isSharing ? stopSharing : startSharing}
      variant={isSharing ? "destructive" : "secondary"}
      className="rounded-full shadow-lg h-9 px-4 bg-white/90 backdrop-blur-md border border-primary/20 text-primary hover:bg-white font-extrabold text-[10px] uppercase tracking-wider whitespace-nowrap"
      disabled={isLoading}
    >
      {isSharing ? t('stopSharing') : t('shareMyLocation')}
    </Button>
  );
}
