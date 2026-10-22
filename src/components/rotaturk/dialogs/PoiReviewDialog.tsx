
'use client';

import { useQuery } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Info, ExternalLink, X, Map as MapIcon, Loader2, ImageOff, AlertCircle, MapPin, Star, Trophy, UserCircle } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { useLocale, useTranslations } from 'next-intl';
import { getGooglePlaceDetails } from '@/app/actions';
import type { POI, FirebaseUser } from '@/lib/types';
import { useState, useEffect } from 'react';
import { EmbeddedMap } from '@/components/map';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useFirestore, useUser, useAuth, useDoc, useMemoFirebase } from '@/firebase';
import { doc, setDoc, updateDoc, increment, collection, serverTimestamp, getDoc } from 'firebase/firestore';
import { signInAnonymously, updateProfile } from 'firebase/auth';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

interface PoiReviewDialogProps {
  poi: POI;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const haversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

export function PoiReviewDialog({ poi, open, onOpenChange }: PoiReviewDialogProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [brokenImages, setBrokenImages] = useState<Set<number>>(new Set());
  const [isNearby, setIsNearby] = useState(false);
  const [rating, setRating] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  
  const locale = useLocale();
  const { user } = useUser();
  const auth = useAuth();
  const db = useFirestore();
  const { toast } = useToast();
  const t = useTranslations('PoiReviewDialog');

  // Kullanıcı profil verisi
  const userRef = useMemoFirebase(() => (db && user ? doc(db, 'users', user.uid) : null), [db, user]);
  const { data: userProfile } = useDoc(userRef);

  useEffect(() => {
    if (open && navigator.geolocation && poi) {
      navigator.geolocation.getCurrentPosition((pos) => {
        const dist = haversineDistance(pos.coords.latitude, pos.coords.longitude, poi.latitude, poi.longitude);
        setIsNearby(dist <= 0.05); // 50 metre sınırı (0.05 km)
      });
    }
  }, [open, poi]);

  const isSpecialPoi = poi?.id === "poi_ayvatlar_kanyonu";

  const { data: placeDetails, isLoading, error: googleError } = useQuery({
      queryKey: ['googlePlaceDetails', poi?.id, poi?.name?.tr],
      queryFn: () => getGooglePlaceDetails({ 
        poiName: poi.name?.tr || poi.name?.en || '', 
        poiLocation: `${poi.location?.district || ''} ${poi.location?.city || ''}` 
      }),
      enabled: open && !!poi && !isSpecialPoi,
      staleTime: 1000 * 60 * 60 * 24,
  });

  const details = placeDetails?.details;
  const localizedName = poi?.name ? ((poi.name as any)[locale] || poi.name.en || poi.name.tr || "İsimsiz Nokta") : "İsimsiz Nokta";
  const localizedDesc = poi?.description ? ((poi.description as any)[locale] || poi.description.en || poi.description.tr || "") : "";

  const handleCheckIn = async () => {
    if (!db || !poi) return;
    setIsSubmitting(true);

    try {
      let currentUser = user;
      if (!currentUser) {
        const cred = await signInAnonymously(auth);
        currentUser = cred.user;
      }

      // Ad soyad kontrolü/güncellemesi
      const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
      const finalDisplayName = currentUser.displayName || fullName || userProfile?.displayName || 'Gezgin';

      if (!currentUser.displayName && fullName) {
         await updateProfile(currentUser, { displayName: fullName });
      }

      // 1. Check-in kaydı oluştur
      const checkinRef = doc(collection(db, 'checkins'));
      await setDoc(checkinRef, {
        userId: currentUser.uid,
        poiId: poi.id,
        rating: rating,
        userName: finalDisplayName,
        timestamp: serverTimestamp()
      });

      // 2. Kullanıcı profilini ve puanını güncelle
      const uRef = doc(db, 'users', currentUser.uid);
      await setDoc(uRef, {
        id: currentUser.uid,
        displayName: finalDisplayName,
        firstName: firstName || userProfile?.firstName || '',
        lastName: lastName || userProfile?.lastName || '',
        totalPoints: increment(10),
        lastActivity: serverTimestamp()
      }, { merge: true });

      // 3. Mekan istatistiklerini güncelle
      const pRef = doc(db, 'pois', poi.id);
      await setDoc(pRef, {
        checkinCount: increment(1),
      }, { merge: true });

      toast({ 
        title: t('congratulations'), 
        description: t('checkinSuccess'),
      });
      
      onOpenChange(false);
    } catch (e: any) {
      console.error("Check-in Error:", e);
      toast({ variant: 'destructive', title: t('error'), description: t('checkinFailed') });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImageError = (index: number) => {
    setBrokenImages(prev => {
      const next = new Set(prev);
      next.add(index);
      return next;
    });
  };

  const visiblePhotos = details?.photos?.filter((_: any, i: number) => !brokenImages.has(i)).slice(0, 2) || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl h-full sm:h-[85vh] flex flex-col p-0 border-none shadow-2xl overflow-hidden bg-background">
        <DialogHeader className="p-6 pb-2 bg-background relative">
          <div className="flex justify-between items-start">
              <div>
                <DialogTitle className="text-2xl font-extrabold text-primary">{localizedName}</DialogTitle>
                <DialogDescription className="font-medium text-muted-foreground">
                    {details?.formatted_address || `${poi?.location?.district ? `${poi.location.district}, ` : ''}${poi?.location?.city || ''}`}
                </DialogDescription>
              </div>
              {userProfile?.totalPoints != null && (
                  <div className="flex items-center gap-2 bg-amber-100 text-amber-700 px-4 py-2 rounded-2xl border border-amber-200 animate-in zoom-in">
                      <Trophy size={18} className="fill-amber-500" />
                      <span className="font-black text-sm">{userProfile.totalPoints} {t('points')}</span>
                  </div>
              )}
          </div>
        </DialogHeader>
        
        <Tabs defaultValue="details" className="flex-grow flex flex-col min-h-0 bg-background">
          <div className="px-6 border-b bg-muted/20">
            <TabsList className="bg-muted/50 gap-2 h-12 p-1 rounded-xl w-full max-w-md mx-auto my-2">
              <TabsTrigger value="details" className="flex-1 rounded-lg font-bold text-xs"><Info size={14} className="mr-1.5" /> {t('details')}</TabsTrigger>
              <TabsTrigger value="map" className="flex-1 rounded-lg font-bold text-xs"><MapIcon size={14} className="mr-1.5" /> {t('map')}</TabsTrigger>
              <TabsTrigger value="checkin" className="flex-1 rounded-lg font-bold text-xs"><MapPin size={14} className="mr-1.5" /> {t('checkin')}</TabsTrigger>
            </TabsList>
          </div>

          <ScrollArea className="flex-grow min-h-0 p-6">
            <TabsContent value="details" className="mt-0 focus-visible:outline-none">
                <div className="space-y-6">
                    {isLoading && (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <Loader2 className="h-10 w-10 animate-spin text-primary" />
                        <div className="grid grid-cols-2 gap-4 w-full mt-8">
                            {[...Array(2)].map((_, i) => <Skeleton key={i} className="aspect-video w-full rounded-xl" />)}
                        </div>
                    </div>
                    )}
                    {!isLoading && visiblePhotos.length > 0 ? (
                        <div>
                            <div className="grid grid-cols-2 gap-4">
                                {visiblePhotos.map((photo: any, index: number) => (
                                    <button key={index} onClick={() => setSelectedImage(photo.url)} className="group rounded-2xl overflow-hidden aspect-video bg-muted relative shadow-md">
                                        <img src={photo.url} alt={`${localizedName} ${index + 1}`} className="w-full h-full object-cover transition-transform group-hover:scale-110" onError={() => handleImageError(index)} />
                                    </button>
                                ))}
                            </div>
                            <p className="mt-2 text-xs text-muted-foreground">{t('photoSource')}</p>
                        </div>
                    ) : !isLoading && <div className="py-10 text-center text-muted-foreground bg-muted/20 rounded-2xl"><ImageOff size={48} className="mx-auto mb-2 opacity-20" /> {t('noPhotos')}</div>}
                    
                    <div className="p-6 bg-accent/30 rounded-[2rem] border border-primary/10 shadow-inner">
                        <h4 className="text-xs font-black text-primary uppercase tracking-widest mb-3 flex items-center gap-2">
                           <Info size={14} /> Mekan Hakkında
                        </h4>
                        <p className="text-base leading-relaxed text-foreground/90 font-medium">
                            {localizedDesc}
                        </p>
                    </div>
                </div>
            </TabsContent>
            
            <TabsContent value="map" className="mt-0 focus-visible:outline-none h-[400px]">
              <div className="w-full h-full rounded-2xl overflow-hidden border shadow-inner">
                {poi && <EmbeddedMap pois={[poi]} defaultZoom={15} />}
              </div>
            </TabsContent>

            <TabsContent value="checkin" className="mt-0 focus-visible:outline-none">
               <div className="flex flex-col items-center py-6 space-y-8 animate-in slide-in-from-bottom-4">
                  {!isNearby ? (
                    <div className="bg-rose-50 text-rose-600 p-8 rounded-[2.5rem] border border-rose-100 text-center space-y-4 max-w-sm">
                        <div className="bg-white p-4 rounded-full w-20 h-20 flex items-center justify-center mx-auto shadow-sm">
                            <MapPin size={40} className="text-rose-400" />
                        </div>
                        <h4 className="text-xl font-black">{t('tooFarTitle')}</h4>
                        <p className="text-sm font-medium leading-relaxed">{t('tooFarDesc')}</p>
                    </div>
                  ) : (
                    <div className="w-full max-w-md space-y-8">
                        <div className="text-center space-y-2">
                            <div className="bg-primary/10 p-4 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
                                <Trophy size={40} className="text-primary" />
                            </div>
                            <h4 className="text-2xl font-black text-foreground">{t('youAreHereTitle')}</h4>
                            <p className="text-muted-foreground font-medium">{t('youAreHereDesc')}</p>
                        </div>

                        {(!user?.displayName && !userProfile?.displayName) && (
                            <div className="grid grid-cols-2 gap-4 p-6 bg-muted/30 rounded-3xl border border-muted-foreground/10">
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold uppercase tracking-wider">{t('firstNameLabel')}</Label>
                                    <Input placeholder="Ali" value={firstName} onChange={e => setFirstName(e.target.value)} className="bg-background rounded-xl h-12" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold uppercase tracking-wider">{t('lastNameLabel')}</Label>
                                    <Input placeholder="Yılmaz" value={lastName} onChange={e => setLastName(e.target.value)} className="bg-background rounded-xl h-12" />
                                </div>
                            </div>
                        )}

                        <div className="space-y-4 text-center">
                            <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{t('ratingLabel')}</Label>
                            <div className="flex justify-center gap-3">
                                {[1, 2, 3, 4, 5].map((s) => (
                                    <button key={s} onClick={() => setRating(s)} className="transition-transform active:scale-125 focus:outline-none">
                                        <Star size={40} className={s <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground opacity-30"} />
                                    </button>
                                ))}
                            </div>
                        </div>

                        <Button 
                            className="w-full h-16 rounded-[2rem] text-lg font-black shadow-xl active:scale-95 transition-all" 
                            disabled={isSubmitting || rating === 0 || ((!user?.displayName && !userProfile?.displayName) && (!firstName || !lastName))}
                            onClick={handleCheckIn}
                        >
                            {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : <Trophy className="mr-2" />}
                            {t('submitButton')}
                        </Button>
                    </div>
                  )}
               </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>
        
        <DialogFooter className="mt-auto p-6 pt-4 border-t flex-shrink-0 sm:justify-between w-full bg-background rounded-b-lg">
            <p className="text-[10px] text-muted-foreground text-center sm:text-left font-bold uppercase tracking-wider">{t('pointsSystemActive')}</p>
            {details?.url && !isSpecialPoi && (
                <Button asChild variant="outline" className="rounded-full font-bold h-10 px-6">
                    <a href={details.url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="mr-2 h-4 w-4" /> {t('googleMaps')}
                    </a>
                </Button>
            )}
        </DialogFooter>

        {selectedImage && (
          <div className="fixed inset-0 z-[2000000] bg-black/95 flex items-center justify-center animate-in fade-in" onClick={() => setSelectedImage(null)}>
            <div className="relative max-w-[95vw] max-h-[95vh]">
              <img src={selectedImage} alt="Önizleme" className="object-contain max-w-full max-h-full rounded-lg" />
              <Button variant="secondary" size="icon" className="absolute top-4 right-4 rounded-full h-10 w-10 bg-white/20 text-white" onClick={() => setSelectedImage(null)}><X /></Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
