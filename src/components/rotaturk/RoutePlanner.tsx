
'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { MapIcon, Globe, Navigation, Building, Sparkles, Compass, RefreshCw, Search, Store } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import useLocalStorage from '@/hooks/use-local-storage';
import { ManualRouteForm } from './forms/ManualRouteForm';
import { ResultsPanel } from './results/ResultsPanel';
import type { RouteResult, POI, ActiveTraveler } from '@/lib/types';
import { NearbyPoisForm } from './forms/NearbyPoisForm';
import { CityExplorerForm } from './forms/CityExplorerForm';
import { useToast } from '@/hooks/use-toast';
import { ThematicRouteForm } from './forms/ThematicRouteForm';
import { RegionalTourForm } from './forms/RegionalTourForm';
import { MultiDayLoopForm } from './forms/MultiDayLoopForm';
import { SearchPoisForm } from './forms/SearchPoisForm';
import { getManualRoute, getRandomFact, getCityPoisAction } from '@/app/actions';
import { RouteOfTheWeek } from './RouteOfTheWeek';
import { cn } from '@/lib/utils';
import { Skeleton } from '../ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useLocale, useTranslations } from 'next-intl';
import { useSearchParams, useRouter } from 'next/navigation';

export type ResultType = 'manual' | 'city' | 'nearby' | 'thematic' | 'regional' | 'loop';

export type PlannerResult = {
  type: ResultType;
  data: Partial<RouteResult>;
}

type PlannerState = {
  activeTab: string;
  result?: PlannerResult;
};

interface RoutePlannerProps {
  onResultChange?: (result: PlannerResult | undefined) => void;
  onMarkerClick?: (poi: POI) => void;
  onTravelerClick?: (traveler: ActiveTraveler) => void;
}

const LoadingSkeleton = () => (
    <div className="space-y-6">
        <Skeleton className="h-10 w-full rounded-2xl" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-4">
                <Skeleton className="h-[600px] w-full rounded-3xl" />
            </div>
            <div className="lg:col-span-8">
                <Skeleton className="h-[600px] w-full rounded-3xl" />
            </div>
        </div>
    </div>
);

export function RoutePlanner({ onResultChange, onMarkerClick, onTravelerClick }: RoutePlannerProps) {
  const [isMounted, setIsMounted] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();
  const exploreCity = searchParams.get('exploreCity');
  
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const [plannerState, setPlannerState] = useLocalStorage<PlannerState>('rotaTurkPlanner', {
    activeTab: 'create',
    result: undefined,
  });
  const [savedRoutes, setSavedRoutes] = useLocalStorage<RouteResult[]>('rotaTurkSavedRoutes', []);
  const { toast } = useToast();
  
  const [isLoading, setIsLoading] = useState(false);
  const [funFact, setFunFact] = useState<string | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const t = useTranslations('RoutePlanner');
  const t_general = useTranslations('General');
  const locale = useLocale();

  useEffect(() => {
    if (isMounted) {
      getRandomFact(locale).then(({ fact }) => {
        setFunFact(fact);
      });
    }
  }, [locale, isMounted]);

  useEffect(() => {
    if (isMounted) {
      onResultChange?.(plannerState.result);
    }
  }, [plannerState.result, isMounted, onResultChange]);

  useEffect(() => {
    if (plannerState?.result) {
        setTimeout(() => {
            resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
    }
  }, [plannerState?.result]);

  useEffect(() => {
    if (exploreCity && isMounted) {
      const triggerCitySearch = async () => {
        setIsLoading(true);
        clearResults();
        try {
          const result = await getCityPoisAction({ city: exploreCity });
          if (result && result.touristPois && result.touristPois.length > 0) {
            handleResults('city', result);
            setPlannerState(prev => ({ ...prev, activeTab: 'explore' }));
          }
        } catch (error) {
          console.error("Explore city error:", error);
        } finally {
          setIsLoading(false);
          window.history.replaceState({}, '', window.location.pathname);
        }
      };
      triggerCitySearch();
    }
  }, [exploreCity, isMounted]);

  const handleTabChange = (value: string) => {
    if (value === 'add-business') {
      router.push(`/${locale}/sponsorship`);
      return;
    }
    setPlannerState((prev: PlannerState) => ({ ...prev, activeTab: value }));
  };
  
  const handleResults = useCallback((type: ResultType, data: Partial<RouteResult>) => {
    const newResult: PlannerResult = { type, data };
    const tabToSwitch = ['thematic', 'regional'].includes(type) ? 'create' : plannerState.activeTab;
    
    setPlannerState( (prevState: PlannerState) => ({ 
        ...prevState, 
        activeTab: tabToSwitch, 
        result: newResult
    }));

    setIsLoading(false);
  }, [plannerState.activeTab, setPlannerState]);
  
  const clearResults = useCallback(() => {
    setPlannerState((prev: PlannerState) => ({ 
        ...prev,
        result: undefined,
     }));
  }, [setPlannerState]);

  const handleThematicRouteSelect = async (theme: any) => {
    if (!theme) return;
    
    setIsLoading(true);
    clearResults();

    try {
      const result = await getManualRoute(theme.params);
      if (result) {
        const thematicResult = { ...result, name: theme.name[locale] };
        handleResults('thematic', thematicResult);
      } else {
        throw new Error(t_general('errorThematicRoute'));
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: t_general('error'),
        description: t_general('errorThematicRouteDesc'),
      });
      setIsLoading(false);
    }
  };

  const handleSaveRoute = (route: RouteResult) => {
    if (savedRoutes.some(r => r.routeId === route.routeId)) {
        toast({ title: t_general('routeAlreadySaved') });
        return;
    }
    setSavedRoutes((prev) => [...prev, route]);
    toast({ title: t_general('routeSaved'), description: t_general('routeSavedDesc', { routeName: route.name }) });
  };

  const isRouteSaved = (routeId?: string) => {
    if (!routeId) return false;
    return savedRoutes.some(r => r.routeId === routeId);
  }
  
  if (!isMounted) {
    return <div className="w-full space-y-10"><LoadingSkeleton /></div>;
  }

  const isFullWidthTab = ['thematic', 'regional'].includes(plannerState.activeTab);

  return (
    <div className="w-full space-y-10">
      <Tabs value={plannerState.activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 h-auto p-2 gap-2 rounded-[2rem] bg-white/90 dark:bg-card/90 shadow-2xl mb-8 border border-white/40 backdrop-blur-md">
          <TabsTrigger value="create" className="rounded-full py-4 font-bold data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300">
            <MapIcon className="mr-2 h-5 w-5" /> {t('createRoute')}
          </TabsTrigger>
          <TabsTrigger value="search" className="rounded-full py-4 font-bold data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300">
            <Search className="mr-2 h-5 w-5" /> {t('search')}
          </TabsTrigger>
          <TabsTrigger value="loop" className="rounded-full py-4 font-bold data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300">
            <RefreshCw className="mr-2 h-5 w-5" /> {t('circularTour')}
          </TabsTrigger>
           <TabsTrigger value="thematic" className="rounded-full py-4 font-bold data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300">
            <Sparkles className="mr-2 h-5 w-5" /> {t('thematicRoutes')}
          </TabsTrigger>
          <TabsTrigger value="regional" className="rounded-full py-4 font-bold data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300">
            <Globe className="mr-2 h-5 w-5" /> {t('regionalTours')}
          </TabsTrigger>
          <TabsTrigger value="explore" className="rounded-full py-4 font-bold data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300">
            <Building className="mr-2 h-5 w-5" /> {t('exploreByCity')}
          </TabsTrigger>
          <TabsTrigger value="nearby" className="rounded-full py-4 font-bold data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300">
            <Navigation className="mr-2 h-5 w-5" /> {t('whatsNearby')}
          </TabsTrigger>
          <TabsTrigger value="add-business" className="rounded-full py-4 font-bold bg-amber-50 text-amber-700 hover:bg-amber-100 transition-all duration-300 border border-amber-200">
            <Store className="mr-2 h-5 w-5" /> {t('addMyBusiness')}
          </TabsTrigger>
        </TabsList>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 mt-8">
          <div className={cn(isFullWidthTab ? "lg:col-span-12" : "lg:col-span-4")}>
              <Card className="h-full border-none bg-gradient-to-br from-primary via-primary/95 to-primary/80 text-primary-foreground shadow-[0_20px_50px_-15px_rgba(37,99,235,0.4)] rounded-[2.5rem] overflow-hidden relative group">
                  <div className="absolute top-0 right-0 -mr-20 -mt-20 w-60 h-60 bg-white/20 rounded-full blur-3xl group-hover:scale-110 transition-transform duration-700" />
                  <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-60 h-60 bg-black/20 rounded-full blur-3xl group-hover:scale-110 transition-transform duration-700" />
                  <CardContent className="p-10 relative z-10">
                      <TabsContent value="create" className="mt-0 focus-visible:outline-none">
                          <ManualRouteForm onResult={handleResults} onLoading={setIsLoading} isLoading={isLoading} clearResults={clearResults} />
                      </TabsContent>
                      <TabsContent value="search" className="mt-0 focus-visible:outline-none">
                          <SearchPoisForm onResult={handleResults} onLoading={setIsLoading} isLoading={isLoading} clearResults={clearResults} />
                      </TabsContent>
                      <TabsContent value="loop" className="mt-0 focus-visible:outline-none">
                          <MultiDayLoopForm onResult={handleResults} onLoading={setIsLoading} isLoading={isLoading} clearResults={clearResults} />
                      </TabsContent>
                      <TabsContent value="thematic" className="mt-0 focus-visible:outline-none">
                          <ThematicRouteForm onResult={handleResults} onLoading={setIsLoading} isLoading={isLoading} clearResults={clearResults} />
                      </TabsContent>
                       <TabsContent value="regional" className="mt-0 focus-visible:outline-none">
                          <RegionalTourForm onResult={handleResults} onLoading={setIsLoading} isLoading={isLoading} clearResults={clearResults} />
                      </TabsContent>
                      <TabsContent value="explore" className="mt-0 focus-visible:outline-none">
                          <CityExplorerForm onResult={handleResults} onLoading={setIsLoading} isLoading={isLoading} clearResults={clearResults} />
                      </TabsContent>
                      <TabsContent value="nearby" className="mt-0 focus-visible:outline-none">
                          <NearbyPoisForm onResult={handleResults} onLoading={setIsLoading} isLoading={isLoading} clearResults={clearResults} />
                      </TabsContent>
                  </CardContent>
              </Card>
          </div>
          <div className={cn("lg:col-span-8", isFullWidthTab && "hidden")} ref={resultsRef}>
              <ResultsPanel 
                isLoading={isLoading} 
                result={plannerState.result} 
                onSave={handleSaveRoute}
                isSaved={isRouteSaved(plannerState.result?.data.routeId)}
                onMarkerClick={onMarkerClick}
                onTravelerClick={onTravelerClick}
                onResultUpdate={handleResults}
                onLoading={setIsLoading}
              />
          </div>
        </div>
      </Tabs>

      <div className="space-y-10">
        <RouteOfTheWeek onDiscover={handleThematicRouteSelect} />
        
        {funFact && (
            <Alert className="border-primary/20 bg-white dark:bg-card shadow-2xl rounded-2xl animate-fade-in-up overflow-hidden">
                <div className="absolute top-0 left-0 w-2 h-full bg-gradient-to-b from-primary to-primary/40" />
                <div className="flex items-center gap-4">
                    <div className="bg-primary/10 p-4 rounded-full">
                        <Compass className="h-7 w-7 text-primary animate-float" />
                    </div>
                    <div>
                        <AlertTitle className='font-extrabold text-primary text-xl mb-1'>{t('didYouKnow')}</AlertTitle>
                        <AlertDescription className="text-muted-foreground font-semibold italic text-base">
                            "{funFact}"
                        </AlertDescription>
                    </div>
                </div>
            </Alert>
        )}
      </div>
    </div>
  );
}
