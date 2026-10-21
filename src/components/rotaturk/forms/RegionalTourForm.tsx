
'use client';

import { useState } from 'react';
import { Loader2, Ship, Sailboat, Waves, Building, Trees, MountainSnow, Scroll } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getRegionalPoisAction } from '@/app/actions';
import type { RouteResult } from '@/lib/types';
import regionalToursData from '@/lib/data/regional-tours.json';
import { cn } from '@/lib/utils';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useLocale, useTranslations } from 'next-intl';

type RegionalTourFormProps = {
  onResult: (type: 'regional', data: Partial<RouteResult>) => void;
  onLoading: (isLoading: boolean) => void;
  isLoading: boolean;
  clearResults: () => void;
};

const iconMap: { [key: string]: React.ElementType } = {
    Ship, Sailboat, Waves, Building, Trees, MountainSnow, Scroll
};

export function RegionalTourForm({ onResult, onLoading, isLoading, clearResults }: RegionalTourFormProps) {
  const { toast } = useToast();
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const locale = useLocale();
  const t = useTranslations('RegionalTourForm');

  const handleRegionSelect = (region: (typeof regionalToursData.regions)[0]) => {
    if (isLoading && selectedKey === region.key) return;

    setSelectedKey(region.key);
    onLoading(true);
    clearResults();

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        await fetchAndShowResults(region, { lat: latitude, lng: longitude });
      },
      async (error) => {
        console.warn("Kullanıcı konumu alınamadı:", error.message);
        toast({
          title: "Konum Alınamadı",
          description: "Rota varsayılan bir başlangıç noktasından oluşturulacak.",
          variant: "default"
        });
        await fetchAndShowResults(region);
      },
      { timeout: 5000 }
    );
  };
  
  const fetchAndShowResults = async (region: any, userLocation?: {lat: number, lng: number}) => {
     try {
      const result = await getRegionalPoisAction({ regionKey: region.key, locale, userLocation });
      if (result) {
        onResult('regional', result);
      } else {
        throw new Error(t('errorDescription'));
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: t('errorTitle'),
        description: t('errorDescription'),
      });
      onLoading(false);
    }
  }

  const getLocalizedName = (region: any) => {
    return region.name[locale] || region.name.en || region.name.tr;
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="font-semibold text-lg">{t('title')}</h3>
        <p className="text-sm text-primary-foreground/80 mt-2">{t('subtitle')}</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {regionalToursData.regions.map((region) => {
          const Icon = (region.icon && iconMap[region.icon]) ? iconMap[region.icon] : Building;
          return (
            <Card
              key={region.key}
              onClick={() => handleRegionSelect(region)}
              className={cn(
                'cursor-pointer transition-all hover:shadow-md flex flex-col items-center justify-center p-4 text-center bg-card text-card-foreground hover:bg-accent',
                isLoading && selectedKey === region.key ? 'ring-2 ring-primary animate-pulse' : 'ring-0'
              )}
            >
              <div className="mb-2 bg-primary/10 text-primary p-3 rounded-lg">
                <Icon className="h-6 w-6" />
              </div>
              <CardHeader className="p-0">
                <CardTitle className="text-base">{getLocalizedName(region)}</CardTitle>
              </CardHeader>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
