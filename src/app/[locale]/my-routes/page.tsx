'use client';

import { useState, useEffect } from 'react';
import useLocalStorage from '@/hooks/use-local-storage';
import { RouteResult } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Trash2, ExternalLink, Map, Pin, Route as RouteIcon } from 'lucide-react';
import Link from 'next/link';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useTranslations } from 'next-intl';

export default function MyRoutesPage() {
  const [savedRoutes, setSavedRoutes] = useLocalStorage<RouteResult[]>('rotaTurkSavedRoutes', []);
  const [isClient, setIsClient] = useState(false);
  const t = useTranslations('MyRoutesPage');

  useEffect(() => {
    setIsClient(true);
  }, []);

  const deleteRoute = (routeId: string) => {
    setSavedRoutes(savedRoutes.filter(route => route.routeId !== routeId));
  };

  const getRouteTitle = (route: RouteResult) => {
     if (route.start && route.end) {
      return `${route.start.city} → ${route.end.city}`;
    }
    return route.name;
  }
  
  if (!isClient) return null;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold font-headline">{t('title')}</h1>
        <Button asChild variant="outline">
          <Link href="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('backToMenu')}
          </Link>
        </Button>
      </div>

      {savedRoutes.length === 0 ? (
        <div className="text-center py-20 border-dashed border-2 rounded-xl">
          <RouteIcon className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-2 text-xl font-semibold">{t('noRoutesTitle')}</h3>
          <p className="mt-1 text-muted-foreground">
            {t('noRoutesSubtitle')}
          </p>
          <Button asChild className="mt-6">
            <Link href="/">{t('createRoute')}</Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {savedRoutes.map((route, index) => (
            <Card key={`${route.routeId}-${index}`} className="flex flex-col">
              <CardHeader>
                <CardTitle>{getRouteTitle(route)}</CardTitle>
                <CardDescription>{route.name}</CardDescription>
              </CardHeader>
              <CardContent className="flex-grow">
                <div className="text-sm text-muted-foreground space-y-2">
                    {route.totalDistance && (
                        <div className="flex items-center">
                            <Map className="mr-2 h-4 w-4"/>
                            <span>{t('distance')}: {Math.round(route.totalDistance)} km</span>
                        </div>
                    )}
                    {(route.touristPois?.length > 0 || route.servicePois?.length > 0) && (
                        <div className="flex items-center">
                            <Pin className="mr-2 h-4 w-4"/>
                            <span>{ (route.touristPois?.length || 0) + (route.servicePois?.length || 0) } {t('pois')}</span>
                        </div>
                    )}
                </div>
              </CardContent>
              <CardFooter className="grid grid-cols-2 gap-2">
                <Button asChild variant="secondary" className="w-full">
                    <a href={route.googleMapsUrl} target='_blank' rel='noopener noreferrer' title={t('openInMap')}>
                        <ExternalLink className='h-4 w-4 mr-2' /> {t('openInMap')}
                    </a>
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="w-full" title={t('delete')}>
                      <Trash2 className="h-4 w-4 mr-2" /> {t('delete')}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>{t('areYouSure')}</AlertDialogTitle>
                      <AlertDialogDescription>
                        {t('deleteConfirmation')}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                      <AlertDialogAction onClick={() => deleteRoute(route.routeId)}>
                        {t('delete')}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
