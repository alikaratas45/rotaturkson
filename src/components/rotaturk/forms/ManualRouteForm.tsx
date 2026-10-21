'use client';

import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  ToggleGroup,
  ToggleGroupItem,
} from '@/components/ui/toggle-group';
import { Switch } from '@/components/ui/switch';
import {
  Palette,
  Scroll,
  Trees,
  Landmark,
  MapPin,
  Loader2,
  Utensils,
  Bed,
  PlusCircle,
  XCircle,
  Fuel,
  Zap,
  Map as MapIcon,
  Route,
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { getManualRoute, reverseGeocode } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import type { RouteResult } from '@/lib/types';
import { LocationCombobox } from '../common/LocationCombobox';
import { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { useUser, useFirestore, useAuth } from '@/firebase';
import { doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';

const LocationSchema = z.object({
  city: z.string().min(1, 'İl seçmelisiniz.'),
  district: z.string().optional(),
});

const FormSchema = z.object({
  start: LocationSchema,
  end: LocationSchema,
  stops: z.array(LocationSchema),
  poiTypes: z.array(z.string()).min(1, 'En az bir ilgi alanı seçmelisiniz.'),
  fuelCostPerKm: z.coerce.number().min(0, "Maliyet 0'dan küçük olamaz.").default(3.2),
  shareLocation: z.boolean().default(true),
  shareRoute: z.boolean().default(true),
});

type ManualRouteFormProps = {
    onResult: (type: 'manual', data: Partial<RouteResult>) => void;
    onLoading: (isLoading: boolean) => void;
    isLoading: boolean;
    clearResults: () => void;
};

const poiOptions = [
  { value: 'Kültürel', labelKey: 'cultural', icon: Palette },
  { value: 'Arkeolojik', labelKey: 'archaeological', icon: Scroll },
  { value: 'Doğal', labelKey: 'natural', icon: Trees },
  { value: 'Tarihi', labelKey: 'historical', icon: Landmark },
  { value: 'Yeme-İçme', labelKey: 'foodDrink', icon: Utensils },
  { value: 'Konaklama', labelKey: 'accommodation', icon: Bed },
];

export function ManualRouteForm({ onResult, onLoading, isLoading, clearResults }: ManualRouteFormProps) {
  const t = useTranslations('ManualRouteForm');
  const { toast } = useToast();
  const [isFindingLocation, setIsFindingLocation] = useState(false);
  const [capturedLoc, setCapturedLoc] = useState<{city: string, district?: string, lat: number, lng: number} | null>(null);
  
  const { user } = useUser();
  const auth = useAuth();
  const db = useFirestore();
  const watchIdRef = useRef<number | null>(null);

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      poiTypes: ['Kültürel', 'Arkeolojik', 'Doğal', 'Tarihi', 'Yeme-İçme', 'Konaklama'],
      fuelCostPerKm: 3.2,
      start: {city: '', district: ''},
      end: {city: '', district: ''},
      stops: [],
      shareLocation: true,
      shareRoute: true,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "stops"
  });

  useEffect(() => {
    findMyLocation(true);
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  const stopSharing = async () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (user && db) {
      await deleteDoc(doc(db, 'activeTravelers', user.uid));
    }
  };

  const startSharing = async (currentRoute: Partial<RouteResult>, values: z.infer<typeof FormSchema>) => {
    if (!values.shareLocation && !values.shareRoute) {
        await stopSharing();
        return;
    }

    try {
      let currentUser = user;
      if (!currentUser) {
        const cred = await signInAnonymously(auth);
        currentUser = cred.user;
      }

      if (!navigator.geolocation) return;

      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }

      watchIdRef.current = navigator.geolocation.watchPosition(
        (position) => {
          if (db && currentUser) {
            setDoc(doc(db, 'activeTravelers', currentUser.uid), {
              userId: currentUser.uid,
              displayName: currentUser.displayName || 'Gezgin',
              latitude: values.shareLocation ? position.coords.latitude : 0,
              longitude: values.shareLocation ? position.coords.longitude : 0,
              lastUpdated: serverTimestamp(),
              routeName: values.shareRoute ? (currentRoute.name || null) : null,
              routePolyline: values.shareRoute ? (currentRoute.polyline || null) : null,
            }, { merge: true });
          }
        },
        null,
        { enableHighAccuracy: true }
      );
    } catch (error) {
      console.error("Sharing error:", error);
    }
  };
  
  const handlePoiTypesChange = (value: string[]) => {
    form.setValue('poiTypes', value);
  };

  const findMyLocation = (isAuto = false) => {
    if (navigator.geolocation) {
      if (!isAuto) toast({ title: t('findingLocation') });
      setIsFindingLocation(true);
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          const { location, error } = await reverseGeocode({ lat: latitude, lng: longitude });
          setIsFindingLocation(false);
          if (location?.city) {
            form.setValue('start.city', location.city, { shouldValidate: true });
            if (location.district) {
                form.setValue('start.district', location.district, { shouldValidate: true });
            } else {
                form.setValue('start.district', '', { shouldValidate: true });
            }
            setCapturedLoc({ 
                city: location.city, 
                district: location.district || '', 
                lat: latitude, 
                lng: longitude 
            });
          }
        },
        () => setIsFindingLocation(false)
      );
    }
  };

  const handleCreateRoute = async (corridorWidth: number) => {
    const isValid = await form.trigger();
    if (!isValid) return;

    const values = form.getValues();
    onLoading(true);
    clearResults();
    
    const startVal = values.start;
    const finalStart = (capturedLoc && capturedLoc.city === startVal.city && capturedLoc.district === (startVal.district || ''))
      ? { ...startVal, lat: capturedLoc.lat, lng: capturedLoc.lng }
      : startVal;

    try {
      const result = await getManualRoute({ 
        ...values, 
        start: finalStart,
        corridorWidth 
      });
      if (result) {
        onResult('manual', result);
        if (values.shareLocation || values.shareRoute) {
          startSharing(result, values);
        } else {
          stopSharing();
        }
      } else {
        throw new Error(t('routeCreationError'));
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: t('errorTitle'),
        description: t('routeCreationErrorDesc'),
      });
      onLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
        <h3 className="font-semibold text-lg">{t('title')}</h3>
        
        <div className="space-y-2">
            <LocationCombobox form={form} name="start" label={t('startLabel')} labelClassName='text-primary-foreground/90' />
            <Button type="button" variant="ghost" size="sm" onClick={() => findMyLocation(false)} disabled={isFindingLocation || isLoading} className="text-primary-foreground/90 hover:text-primary-foreground hover:bg-white/20">
                <MapPin className="mr-2 h-4 w-4" />
                {isFindingLocation ? t('findingLocation') : t('findMyLocation')}
            </Button>
        </div>

        <div className="space-y-4">
          {fields.map((field, index) => (
            <div key={field.id} className="flex items-end gap-2">
                <div className='flex-grow'>
                    <LocationCombobox form={form} name={`stops.${index}`} label={`${t('stopLabel')} ${index + 1}`} labelClassName='text-primary-foreground/90' />
                </div>
                <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="text-destructive-foreground hover:text-destructive-foreground/80">
                    <XCircle className="h-5 w-5" />
                </Button>
            </div>
          ))}

          <Button type="button" variant="outline" size="sm" className="w-full bg-background/20 border-white/50 text-white hover:bg-background/30" onClick={() => append({ city: "", district: "" })}>
            <PlusCircle className="mr-2 h-4 w-4" />
            {t('addStop')}
          </Button>
        </div>
        
        <div className="space-y-4">
          <LocationCombobox form={form} name="end" label={t('endLabel')} labelClassName='text-primary-foreground/90' />
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="shareLocation"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-xl border border-white/20 bg-white/10 p-3 space-y-0">
                    <div className="space-y-0.5">
                      <FormLabel className="text-[11px] font-bold flex items-center gap-1.5 leading-tight">
                        <MapPin className="h-3 w-3" /> {t('shareLocationLabel')}
                      </FormLabel>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        className="scale-75"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="shareRoute"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-xl border border-white/20 bg-white/10 p-3 space-y-0">
                    <div className="space-y-0.5">
                      <FormLabel className="text-[11px] font-bold flex items-center gap-1.5 leading-tight">
                        <Route className="h-3 w-3" /> {t('shareRouteLabel')}
                      </FormLabel>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        className="scale-75"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
          </div>
        </div>

        <Separator className="bg-white/20" />
        
        <div className="space-y-4">
            <h4 className="font-medium flex items-center"><Fuel className="mr-2 h-5 w-5"/> {t('fuelCostTitle')}</h4>
            <FormField
              control={form.control}
              name="fuelCostPerKm"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className='text-primary-foreground/90'>{t('fuelCostLabel')}</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.1" {...field} className='bg-background/20 border-white/50 text-white placeholder:text-white/60' />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
        </div>

        <Separator className="bg-white/20" />

        <FormField
          control={form.control}
          name="poiTypes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('poiTitle')}</FormLabel>
              <p className="text-xs">{t('poiSubtitle')}</p>
              <FormControl>
                <ToggleGroup type="multiple" variant="outline" value={field.value} onValueChange={handlePoiTypesChange} className="flex-wrap justify-start gap-2">
                    {poiOptions.map(option => (
                        <ToggleGroupItem key={option.value} value={option.value} aria-label={t(option.labelKey as any)} className='border-white/50 text-white data-[state=on]:bg-white data-[state=on]:text-primary'>
                            <option.icon className="mr-2 h-4 w-4"/>
                            {t(option.labelKey as any)}
                        </ToggleGroupItem>
                    ))}
                </ToggleGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Button 
              type="button" 
              className="bg-white text-primary hover:bg-white/90 shadow-xl" 
              disabled={isLoading}
              onClick={() => handleCreateRoute(10)}
            >
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Zap className="mr-2 h-4 w-4" />}
              {t('createFastRoute')}
            </Button>
            <Button 
              type="button" 
              className="bg-secondary text-secondary-foreground hover:opacity-90 shadow-xl" 
              disabled={isLoading}
              onClick={() => handleCreateRoute(45)}
            >
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MapIcon className="mr-2 h-4 w-4" />}
              {t('createWanderingRoute')}
            </Button>
          </div>
          <p className="text-[10px] text-center text-primary-foreground/70 italic leading-tight">
            {t('routeModeExplanation')}
          </p>
        </div>
      </form>
    </Form>
  );
}
