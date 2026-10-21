'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Loader2, RefreshCw, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getMultiDayLoopAction } from '@/app/actions';
import type { RouteResult } from '@/lib/types';
import { useTranslations, useLocale } from 'next-intl';

type MultiDayLoopFormProps = {
    onResult: (type: 'loop', data: Partial<RouteResult>) => void;
    onLoading: (isLoading: boolean) => void;
    isLoading: boolean;
    clearResults: () => void;
};

export function MultiDayLoopForm({ onResult, onLoading, isLoading, clearResults }: MultiDayLoopFormProps) {
  const [days, setDays] = useState([1]);
  const { toast } = useToast();
  const t = useTranslations('MultiDayLoopForm');
  const locale = useLocale();

  const handleCreateLoop = () => {
    if (isLoading) return;
    
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
          const result = await getMultiDayLoopAction({ 
            lat: latitude, 
            lng: longitude, 
            days: days[0],
            locale 
          });
          
          if (result && result.touristPois && result.touristPois.length > 0) {
            onResult('loop', result);
          } else {
            toast({
              title: t('noResultsTitle'),
              description: t('noResultsDesc'),
            });
            onLoading(false);
          }
        } catch (error: any) {
          console.error("Döngüsel rota hatası:", error);
          toast({
            variant: 'destructive',
            title: t('errorTitle'),
            description: error.message || t('errorDesc'),
          });
          onLoading(false);
        }
      },
      (error) => {
        onLoading(false);
        toast({
          variant: 'destructive',
          title: t('permissionErrorTitle'),
          description: t('permissionErrorDesc'),
        });
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className='text-center'>
        <h3 className="font-extrabold text-2xl font-headline flex items-center justify-center gap-2">
            <Calendar className="h-6 w-6" />
            {t('title')}
        </h3>
        <p className="text-sm mt-2 opacity-90 leading-tight">
            {t('subtitle')}
        </p>
      </div>

      <div className="space-y-6 bg-white/10 p-8 rounded-[2rem] border border-white/20 shadow-inner">
        <div className="flex justify-between items-center mb-2">
            <span className="font-bold text-base uppercase tracking-tighter opacity-80">{t('dayCount')}</span>
            <div className="bg-white text-primary px-5 py-2 rounded-full font-black text-2xl shadow-lg border border-primary/20 transition-transform active:scale-110">
                {days[0]} {t(days[0] === 1 ? 'day' : 'days')}
            </div>
        </div>
        <Slider 
            value={days} 
            onValueChange={setDays} 
            max={7} 
            min={1} 
            step={1} 
            className="py-4 cursor-pointer"
        />
        <div className="flex justify-between text-[10px] font-black uppercase tracking-widest opacity-60 px-1">
            <span>1 {t('day')}</span>
            <span>7 {t('days')}</span>
        </div>
      </div>

      <Button onClick={handleCreateLoop} className="w-full bg-white text-primary hover:bg-white/90 h-16 rounded-2xl shadow-[0_10px_20px_-10px_rgba(255,255,255,0.3)] active:translate-y-1 transition-all" disabled={isLoading}>
        {isLoading ? <Loader2 className="mr-3 h-6 w-6 animate-spin" /> : <RefreshCw className="mr-3 h-6 w-6" />}
        <span className="text-lg font-bold">{t('findButton')}</span>
      </Button>
      
      <p className="text-[10px] text-center italic opacity-60 leading-tight px-4">
        {t('explanation')}
      </p>
    </div>
  );
}
