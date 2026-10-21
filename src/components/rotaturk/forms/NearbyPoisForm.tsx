'use client';

import { Button } from '@/components/ui/button';
import { Loader2, Navigation } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getNearbyPois } from '@/app/actions';
import type { RouteResult } from '@/lib/types';
import { useTranslations } from 'next-intl';

type NearbyPoisFormProps = {
    onResult: (type: 'nearby', data: Partial<RouteResult>) => void;
    onLoading: (isLoading: boolean) => void;
    isLoading: boolean;
    clearResults: () => void;
};

export function NearbyPoisForm({ onResult, onLoading, isLoading, clearResults }: NearbyPoisFormProps) {
  const { toast } = useToast();
  const t = useTranslations('NearbyPoisForm');

  const handleFindNearby = () => {
    onLoading(true);
    clearResults();

    if (!navigator.geolocation) {
      toast({
        variant: 'destructive',
        title: t('unsupportedBrowserTitle'),
        description: t('unsupportedBrowserDesc'),
      });
      onLoading(false);
      return;
    }

    toast({ title: t('findingLocation') });

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const result = await getNearbyPois({ lat: latitude, lng: longitude });
          if (result && result.touristPois && result.touristPois.length > 0) {
            onResult('nearby', result);
          } else {
            toast({
              title: t('noResultsTitle'),
              description: t('noResultsDesc'),
            });
            onLoading(false);
          }
        } catch (error) {
          console.error(error);
          toast({
            variant: 'destructive',
            title: t('errorTitle'),
            description: t('errorDesc'),
          });
          onLoading(false);
        }
      },
      (error) => {
        onLoading(false);
        let description = t('errorDesc');
        if (error.code === error.PERMISSION_DENIED) {
            description = t('permissionErrorDesc');
        } else if (error.code === error.POSITION_UNAVAILABLE) {
            description = t('unavailableErrorDesc');
        } else if (error.code === error.TIMEOUT) {
            description = t('timeoutErrorDesc');
        }
        toast({
          variant: 'destructive',
          title: t('permissionErrorTitle'),
          description,
        });
      }
    );
  };

  return (
    <div className="space-y-6">
      <div className='text-center'>
        <h3 className="font-semibold text-lg">{t('title')}</h3>
        <p className="text-sm mt-2">
            {t('subtitle')}
        </p>
      </div>
      <Button onClick={handleFindNearby} className="w-full bg-white text-primary hover:bg-white/90 h-12 shadow-lg" disabled={isLoading}>
        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Navigation className="mr-2 h-4 w-4" />}
        {t('findButton')}
      </Button>
    </div>
  );
}
