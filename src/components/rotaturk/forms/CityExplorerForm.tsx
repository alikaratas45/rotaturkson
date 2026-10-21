'use client';

import { useForm } from 'react-hook-form';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Search, Info, Calendar, Ticket } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getCityPoisAction, getCityInfoAction, getCityEventsAction } from '@/app/actions';
import locations from '@/lib/data/turkey-locations.json';
import type { RouteResult } from '@/lib/types';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

type CityExplorerFormProps = {
    onResult: (type: 'city', data: Partial<RouteResult>) => void;
    onLoading: (isLoading: boolean) => void;
    isLoading: boolean;
    clearResults: () => void;
};

export function CityExplorerForm({ onResult, onLoading, isLoading, clearResults }: CityExplorerFormProps) {
    const { toast } = useToast();
    const t = useTranslations('CityExplorerForm');
    const locale = useLocale();
    const [cityInfo, setCityInfo] = useState<string | null>(null);
    const [cityEvents, setCityEvents] = useState<any[]>([]);
    const [isInfoLoading, setIsInfoLoading] = useState(false);
    
    // Schema with localized required message
    const FormSchema = z.object({
        city: z.string().min(1, t('cityRequired')),
    });

    const form = useForm<z.infer<typeof FormSchema>>({
        resolver: zodResolver(FormSchema),
        defaultValues: {
            city: '',
        }
    });

    const selectedCity = form.watch('city');

    useEffect(() => {
        if (selectedCity && selectedCity !== '') {
            setIsInfoLoading(true);
            setCityInfo(null);
            setCityEvents([]);
            
            Promise.all([
                getCityInfoAction({ city: selectedCity, locale }),
                getCityEventsAction({ city: selectedCity })
            ])
            .then(([infoRes, eventsRes]) => {
                setCityInfo(infoRes.info);
                setCityEvents(eventsRes || []);
            })
            .catch(error => {
                console.error("Failed to fetch city data:", error);
            })
            .finally(() => {
                setIsInfoLoading(false);
            });
        }
    }, [selectedCity, locale]);
    
    async function onSubmit(data: z.infer<typeof FormSchema>) {
        if (!data.city) return;
        
        onLoading(true);
        clearResults();
        try {
          const result = await getCityPoisAction({ city: data.city });
          if (result && result.touristPois && result.touristPois.length > 0) {
            onResult('city', result);
          } else {
            toast({
              title: t('noPoisFoundTitle'),
              description: t('noPoisFoundDesc', { city: data.city }),
              variant: "default",
            });
            onLoading(false);
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

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <h3 className="font-semibold text-lg">{t('title')}</h3>
                <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>{t('cityLabel')}</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                    <SelectTrigger className="text-black bg-white">
                                        <SelectValue placeholder={t('cityPlaceholder')} />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent className="max-h-[300px]">
                                    {locations.map((location) => (
                                        <SelectItem key={location.name} value={location.name}>
                                            {location.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <Button 
                    type="submit" 
                    className="w-full bg-white text-primary hover:bg-white/90 h-12 shadow-lg" 
                    disabled={isLoading || !selectedCity}
                >
                    {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Search className="mr-2 h-5 w-5" />}
                    {t('findButton')}
                </Button>

                {(isInfoLoading || cityInfo || cityEvents.length > 0) && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
                        {cityInfo && !isInfoLoading && (
                            <Card className="bg-white/10 border-white/30 text-primary-foreground/90 backdrop-blur-sm">
                                <CardContent className="p-4">
                                    <div className="flex items-start gap-3">
                                        <Info className="h-5 w-5 mt-1 flex-shrink-0 text-blue-200" />
                                        <p className="text-sm leading-relaxed">{cityInfo}</p>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {cityEvents.length > 0 && !isInfoLoading && (
                            <div className="space-y-3">
                                <h4 className="text-sm font-bold flex items-center gap-2 px-1 text-white">
                                    <Calendar className="h-4 w-4" /> {t('upcomingEvents')}
                                </h4>
                                {cityEvents.map((event, idx) => (
                                    <Card key={`${event.id || idx}`} className="bg-white/10 border-white/20 text-white overflow-hidden hover:bg-white/15 transition-colors">
                                        <CardContent className="p-3">
                                            <div className="flex justify-between items-start mb-1">
                                                <h5 className="font-bold text-sm leading-tight">
                                                    {(event.title && event.title[locale]) || (event.title && event.title.tr) || 'Etkinlik'}
                                                </h5>
                                                <Badge variant="outline" className="text-[9px] h-4 bg-white/20 border-none text-white whitespace-nowrap">
                                                    {event.type}
                                                </Badge>
                                            </div>
                                            <p className="text-[11px] opacity-80 line-clamp-2 mb-2 italic">
                                                "{(event.description && event.description[locale]) || (event.description && event.description.tr) || ''}"
                                            </p>
                                            <div className="flex items-center gap-2 text-[10px] font-semibold text-blue-200">
                                                <Ticket className="h-3 w-3" />
                                                <span>{(event.dateInfo && event.dateInfo[locale]) || (event.dateInfo && event.dateInfo.tr) || ''}</span>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}

                        {isInfoLoading && (
                            <div className="space-y-4">
                                <Skeleton className="h-24 w-full bg-white/20 rounded-xl" />
                                <Skeleton className="h-32 w-full bg-white/20 rounded-xl" />
                            </div>
                        )}
                    </div>
                )}
            </form>
        </Form>
    );
}
