
'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Route } from 'lucide-react';
import { ManualRouteResults } from './ManualRouteResults';
import { RouteResult, POI, ActiveTraveler } from '@/lib/types';
import { PlannerResult } from '../RoutePlanner';
import { useTranslations } from 'next-intl';

interface ResultsPanelProps {
  isLoading: boolean;
  result: PlannerResult | undefined | null;
  onSave?: (route: RouteResult) => void;
  isSaved?: boolean;
  onMarkerClick?: (poi: POI) => void;
  onTravelerClick?: (traveler: ActiveTraveler) => void;
  onResultUpdate?: (type: any, data: Partial<RouteResult>) => void;
  onLoading?: (loading: boolean) => void;
}

const LoadingSkeleton = () => (
    <div className="space-y-8 animate-pulse">
        <div className="space-y-2">
            <Skeleton className="h-8 w-3/4 bg-background/20" />
            <Skeleton className="h-4 w-1/2 bg-background/20" />
        </div>
        <div className="flex gap-4">
            <Skeleton className="h-10 flex-1 bg-background/20" />
            <Skeleton className="h-10 w-32 bg-background/20" />
        </div>
        <Skeleton className="h-[400px] w-full bg-background/20" />
        <Skeleton className="h-px w-full bg-background/20" />
        <div className="space-y-2">
             <Skeleton className="h-6 w-1/3 bg-background/20" />
        </div>
        <div className="space-y-4">
            <Skeleton className="h-32 w-full bg-background/20" />
            <Skeleton className="h-32 w-full bg-background/20" />
        </div>
    </div>
)

const Placeholder = () => {
    const t = useTranslations('ResultsPanel');
    return (
        <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <Route size={64} className="mb-4 text-primary-foreground/50" />
            <h3 className="text-2xl font-semibold">{t('title')}</h3>
             <p className="mt-2 max-w-sm hidden md:block">
                {t('subtitle')}
            </p>
            <p className="mt-2 max-w-sm md:hidden">
                {t('subtitleMobile')}
            </p>
        </div>
    );
};


export function ResultsPanel({ 
    isLoading, 
    result, 
    onSave, 
    isSaved, 
    onMarkerClick, 
    onTravelerClick,
    onResultUpdate,
    onLoading
}: ResultsPanelProps) {
  // Use the same fallback mechanism as EmbeddedMap
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || 'AIzaSyCQNvNepfLrxH7o-PCRGqEBJFd3ofEotUQ';
  const t = useTranslations('General');

  if (!apiKey) {
      return (
          <Card className="min-h-[600px] h-full bg-destructive text-destructive-foreground">
            <CardContent className="p-6 h-full flex items-center justify-center">
                <p>{t('googleMapsKeyMissing')}</p>
            </CardContent>
          </Card>
      )
  }

  return (
    <Card className="min-h-[600px] h-full bg-primary text-primary-foreground">
      <CardContent className="p-6 h-full">
        {isLoading ? (
          <LoadingSkeleton />
        ) : result ? (
          <>
            {(['manual', 'city', 'nearby', 'thematic', 'regional', 'loop'].includes(result.type)) && (
              <ManualRouteResults
                result={result.data as RouteResult}
                onSave={onSave}
                isSaved={isSaved}
                onMarkerClick={onMarkerClick}
                onTravelerClick={onTravelerClick}
                onResultUpdate={onResultUpdate}
                onLoading={onLoading}
              />
            )}
          </>
        ) : (
          <Placeholder />
        )}
      </CardContent>
    </Card>
  );
}
