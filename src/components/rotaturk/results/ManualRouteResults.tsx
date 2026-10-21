'use client';

import { RouteResult, POI, ActiveTraveler } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ExternalLink, Save, Map, Fuel, Clock, Pin, Share2, Check, Loader2, RefreshCw, Navigation, StopCircle, ArrowRight, Route as RouteIcon, Info } from 'lucide-react';
import { PoiCard } from '../cards/PoiCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useState } from 'react';
import { PoiReviewDialog } from '../dialogs/PoiReviewDialog';
import { useTranslations, useLocale } from 'next-intl';
import { useToast } from '@/hooks/use-toast';
import { useFirestore } from '@/firebase';
import { doc, collection, setDoc, serverTimestamp } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { EmbeddedMap } from '@/components/map';
import { cn } from '@/lib/utils';
import { getManualRoute } from '@/app/actions';

interface ManualRouteResultsProps {
  result: Partial<RouteResult>;
  onSave?: (route: RouteResult) => void;
  isSaved?: boolean;
  isSharedPage?: boolean;
  onMarkerClick?: (poi: POI) => void;
  onTravelerClick?: (traveler: ActiveTraveler) => void;
  onResultUpdate?: (type: 'manual', data: Partial<RouteResult>) => void;
  onLoading?: (loading: boolean) => void;
}

const formatDuration = (seconds?: number, t?: (key: string, values?: any) => string): string | null => {
    if (seconds === undefined) return null;
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    let result = '';
    if (hours > 0) {
        result += t ? t('hours', { count: hours }) : `${hours} saat`;
        result += ' ';
    }
    if (minutes > 0) {
        result += t ? t('minutes', { count: minutes }) : `${minutes} dakika`;
    }
    
    return result.trim() || (t ? t('lessThanAMinute') : '1 dakikadan az');
}

export function ManualRouteResults({ 
    result: initialResult, 
    onSave, 
    isSaved, 
    isSharedPage = false,
    onMarkerClick,
    onTravelerClick,
    onResultUpdate,
    onLoading
}: ManualRouteResultsProps) {
    const result = initialResult as RouteResult;
    const [selectedPoiForDialog, setSelectedPoiForDialog] = useState<POI | null>(null);
    const [isSharing, setIsSharing] = useState(false);
    const [isCopied, setIsCopied] = useState(false);
    const [isNavigating, setIsNavigating] = useState(false);
    const [selectedPoiIds, setSelectedPoiIds] = useState<Set<string>>(new Set());
    
    const db = useFirestore();
    const t = useTranslations('ManualRouteResults');
    const t_duration = useTranslations('Duration');
    const locale = useLocale();
    const { toast } = useToast();

    const isCalculatedRoute = result?.start && result?.end;
    const isNearbyRoute = result?.routeId?.includes('nearby');
    const isLoopRoute = result?.routeId?.includes('loop');
    
    const getTitle = () => {
        if (isSharedPage) {
            return t('sharedRouteTitle', { routeName: result?.name || '' });
        }
        if (isLoopRoute) {
            return result?.name || t('circularTourTitle');
        }
        if (isNearbyRoute) {
            return t('nearbyPoisTitle');
        }
        if (result?.name && !isCalculatedRoute) {
            const cityName = result.name.replace(/ İçin Öneriler/g, '').replace(/Recommendations for /g, '');
            return t('cityPoisTitle', { cityName });
        }
        return t('routeDetailsTitle', { startCity: result?.start?.city || '', endCity: result?.end?.city || '' });
    }

    const getSubtitle = () => {
        if (isSharedPage) {
            return t('sharedRouteSubtitle');
        }
        if (isLoopRoute) {
            return t('loopRouteSubtitle');
        }
        if (isCalculatedRoute) {
            return t('calculatedRouteSubtitle');
        }
        return t('regionalRouteSubtitle');
    }

    const handleSave = () => {
        if (onSave && result) {
            onSave(result);
        }
    }

    const handleShare = async () => {
        if (!db || !result) return;
        setIsSharing(true);
        
        try {
            const sharedCol = collection(db, 'sharedRoutes');
            const newDocRef = doc(sharedCol);
            const shareUrl = `${window.location.origin}/${locale}/share/${newDocRef.id}`;

            const updateData = {
                routeData: result,
                createdAt: serverTimestamp()
            };

            setDoc(newDocRef, updateData)
                .catch(async (serverError) => {
                    const permissionError = new FirestorePermissionError({
                        path: newDocRef.path,
                        operation: 'create',
                        requestResourceData: updateData,
                    });
                    errorEmitter.emit('permission-error', permissionError);
                });

            if (navigator.share) {
                await navigator.share({
                    title: `RotaTurk - ${result.name}`,
                    text: `Bu rotayı seninle paylaşıyorum: ${result.name}`,
                    url: shareUrl,
                });
            } else {
                await navigator.clipboard.writeText(shareUrl);
                setIsCopied(true);
                toast({
                    title: t('linkCopied'),
                    description: t('linkCopiedDesc'),
                });
                setTimeout(() => setIsCopied(false), 3000);
            }
        } catch (error) {
            console.error("Share failed", error);
        } finally {
            setIsSharing(false);
        }
    }

    const handleShowDetails = (poi: POI) => {
        setSelectedPoiForDialog(poi);
    }

    const togglePoiSelection = (poi: POI) => {
        setSelectedPoiIds(prev => {
            const next = new Set(prev);
            if (next.has(poi.id)) next.delete(poi.id);
            else next.add(poi.id);
            return next;
        });
    }

    const handleCreateCustomRoute = async () => {
        if (selectedPoiIds.size === 0 || !onResultUpdate || !onLoading) return;

        onLoading(true);
        try {
            const allPoisInContext = [...(result.touristPois || []), ...(result.servicePois || [])];
            const selectedPois = allPoisInContext.filter(p => selectedPoiIds.has(p.id));

            if (selectedPois.length === 0) {
              onLoading(false);
              return;
            }

            // Başlangıç ve Varış noktalarını belirle
            const start = result.start || { city: selectedPois[0].location.city, district: selectedPois[0].location.district };
            const end = result.end || { city: selectedPois[selectedPois.length-1].location.city, district: selectedPois[selectedPois.length-1].location.district };
            
            // Seçilen noktaları durak olarak ekle
            const stops = selectedPois.map(p => ({
                lat: p.latitude,
                lng: p.longitude,
                city: p.location.city,
                district: p.location.district
            }));

            const allTypes = ['Kültürel', 'Arkeolojik', 'Doğal', 'Tarihi', 'Yeme-İçme', 'Konaklama'];

            const customResult = await getManualRoute({
                start,
                end,
                stops,
                poiTypes: allTypes, 
                corridorWidth: 5,
                selectedPoiIds: Array.from(selectedPoiIds)
            });

            if (customResult) {
                onResultUpdate('manual', customResult);
                setSelectedPoiIds(new Set());
                toast({ title: "Rota Hazır", description: "Seçtiğiniz noktalara göre yeni rotanız oluşturuldu." });
            }
        } catch (e) {
            toast({ variant: "destructive", title: "Hata", description: "Özel rota oluşturulamadı." });
        } finally {
            onLoading(false);
        }
    }

    const hasRouteDetails = result?.totalDistance || result?.fuelCost || result?.totalDuration || (result?.stops && result.stops.length > 0);
    const formattedDuration = formatDuration(result?.totalDuration, t_duration);
    const poiCount = (result?.touristPois?.length || 0) + (result?.servicePois?.length || 0);

    return (
        <div className="space-y-6 animate-in fade-in-50">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl md:text-3xl font-bold font-headline flex items-center gap-3">
                        {isLoopRoute && <RefreshCw className="text-white h-7 w-7" />}
                        {getTitle()}
                    </h2>
                    <p className="mt-1 opacity-90 text-sm font-medium">
                        {getSubtitle()}
                    </p>
                </div>
                {!isSharedPage && isCalculatedRoute && (
                  <div className="flex gap-2">
                    <Button 
                        onClick={() => setIsNavigating(!isNavigating)}
                        variant={isNavigating ? "destructive" : "default"}
                        className={cn(
                            "rounded-full font-black h-14 px-10 text-base uppercase tracking-widest shadow-2xl transition-all active:scale-95",
                            !isNavigating ? "bg-emerald-500 hover:bg-emerald-600 text-white animate-pulse" : "bg-rose-500 hover:bg-rose-600"
                        )}
                    >
                        {isNavigating ? (
                            <><StopCircle className="mr-2 h-6 w-6" /> Navigasyonu Durdur</>
                        ) : (
                            <><Navigation className="mr-2 h-6 w-6 fill-white" /> Rotayı Başlat</>
                        )}
                    </Button>
                  </div>
                )}
            </div>

            {/* Özel Seçim Alanı */}
            {!isSharedPage && poiCount > 0 && (
                <div className="bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md p-6 rounded-[2rem] border border-white/20 shadow-xl space-y-4 animate-in slide-in-from-top-4">
                    <div className="flex items-start gap-4">
                        <div className="bg-primary/20 p-3 rounded-2xl text-primary shrink-0">
                            <RouteIcon className="h-6 w-6" />
                        </div>
                        <div className="space-y-1">
                            <h4 className="text-lg font-black text-foreground leading-tight">{t('selectionTitle')}</h4>
                            <p className="text-xs text-muted-foreground font-medium">İstediğiniz yerleri seçin, size en uygun yolu çizelim.</p>
                        </div>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-dashed">
                        <div className="flex items-center gap-2">
                             <div className="bg-zinc-100 dark:bg-zinc-800 px-4 py-2 rounded-full border border-zinc-200 dark:border-zinc-700 whitespace-nowrap">
                                <span className="font-black text-primary">{selectedPoiIds.size}</span>
                                <span className="text-[10px] uppercase font-bold text-muted-foreground ml-2">Nokta Seçildi</span>
                             </div>
                        </div>
                        <Button 
                            disabled={selectedPoiIds.size === 0} 
                            onClick={handleCreateCustomRoute}
                            className="rounded-full font-black px-6 bg-primary text-primary-foreground hover:opacity-90 h-12 shadow-lg active:scale-95 transition-all w-full sm:w-auto text-xs md:text-sm"
                        >
                            <span className="truncate">{t('createCustomRoute')}</span>
                            <ArrowRight className="ml-2 h-4 w-4 shrink-0" />
                        </Button>
                    </div>
                </div>
            )}
            
            {hasRouteDetails && (
                <Card className="bg-white/10 border-white/20 text-white">
                    <CardHeader className="pb-2">
                        <CardTitle className='text-lg font-bold'>
                            {t('summaryTitle')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 lg:grid-cols-4 gap-6 text-sm">
                        {result.totalDistance != null && (
                            <div className="flex items-center">
                                <Map className="mr-3 h-6 w-6 text-blue-200" />
                                <div>
                                    <p className="text-blue-100/70 text-[10px] uppercase font-bold tracking-wider">{t('distanceLabel')}</p>
                                    <p className="font-black text-lg">{Math.round(result.totalDistance)} km</p>
                                </div>
                            </div>
                        )}
                        {formattedDuration && (
                            <div className="flex items-center">
                                <Clock className="mr-3 h-6 w-6 text-blue-200" />
                                <div>
                                    <p className="text-blue-100/70 text-[10px] uppercase font-bold tracking-wider">{t('durationLabel')}</p>
                                    <p className="font-black text-lg">{formattedDuration}</p>
                                </div>
                            </div>
                        )}
                            {result.fuelCost != null && !isLoopRoute && (
                            <div className="flex items-center">
                                <Fuel className="mr-3 h-6 w-6 text-blue-200" />
                                <div>
                                    <p className="text-blue-100/70 text-[10px] uppercase font-bold tracking-wider">{t('fuelCostLabel')}</p>
                                    <p className="font-black text-lg">{Math.round(result.fuelCost)} TL</p>
                                </div>
                            </div>
                        )}
                        {poiCount > 0 && (
                            <div className="flex items-center">
                                <Pin className="mr-3 h-6 w-6 text-blue-200" />
                                <div>
                                    <p className="text-blue-100/70 text-[10px] uppercase font-bold tracking-wider">{t('poiCountLabel')}</p>
                                    <p className="font-black text-lg">{poiCount}</p>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            <div className="flex flex-wrap gap-3">
                {result?.googleMapsUrl && (
                    <Button asChild variant="secondary" className="rounded-full font-bold shadow-lg h-12 px-8 bg-white text-black hover:bg-white/90">
                        <a href={result.googleMapsUrl} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="mr-2 h-5 w-5 text-black"/>
                            <span className="text-black">{t('viewOnGoogleMaps')}</span>
                        </a>
                    </Button>
                )}
                {onSave && !isSharedPage && result && (
                    <Button variant="secondary" onClick={handleSave} disabled={isSaved} className="rounded-full bg-white h-12 px-8 font-bold shadow-lg text-black hover:bg-white/90">
                        <Save className="mr-2 h-5 w-5 text-black" />
                        <span className="text-black">{isSaved ? t('routeSaved') : t('saveRoute')}</span>
                    </Button>
                )}
                {!isSharedPage && result && (
                    <Button 
                        variant="secondary" 
                        onClick={handleShare} 
                        disabled={isSharing} 
                        className="rounded-full bg-white h-12 px-8 font-bold shadow-lg text-black hover:bg-white/90"
                    >
                        {isSharing ? (
                            <Loader2 className="mr-2 h-5 w-5 animate-spin text-black" />
                        ) : isCopied ? (
                            <Check className="mr-2 h-5 w-5 text-black" />
                        ) : (
                            <Share2 className="mr-2 h-5 w-5 text-black" />
                        )}
                        <span className="text-black">{isCopied ? t('linkCopied') : t('shareRoute')}</span>
                    </Button>
                )}
            </div>

            <div className="h-[350px] sm:h-[450px] w-full rounded-[2.5rem] overflow-hidden shadow-2xl border border-white/20 relative">
                <EmbeddedMap 
                    pois={[...(result?.touristPois || []), ...(result?.servicePois || [])]} 
                    route={result}
                    waypoints={result?.touristPois || []}
                    defaultZoom={isLoopRoute ? 10 : 11}
                    onMarkerClick={onMarkerClick}
                    onTravelerClick={onTravelerClick}
                    navigationMode={isNavigating}
                />
            </div>
            
            {result?.touristPois && result.touristPois.length === 0 && result?.servicePois && result.servicePois.length === 0 && (
                <div className="text-center py-20 bg-white/5 rounded-3xl border border-white/10">
                    <p className="text-white/60 font-medium">{t('noPoisFound')}</p>
                </div>
            )}
            
            {((result?.touristPois && result.touristPois.length > 0) || (result?.servicePois && result.servicePois.length > 0)) && <Separator className="bg-white/20" />}
            
            {result?.touristPois && result.touristPois.length > 0 && (
                <div className="space-y-6">
                    <h3 className="text-3xl font-extrabold font-headline text-white tracking-tight">{t('touristPoisTitle')}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {result.touristPois.map(poi => (
                            <PoiCard 
                                key={poi.id} 
                                poi={poi} 
                                onShowDetails={handleShowDetails} 
                                selectable={!isSharedPage}
                                isSelected={selectedPoiIds.has(poi.id)}
                                onToggleSelect={togglePoiSelection}
                            />
                        ))}
                    </div>
                </div>
            )}

            {result?.servicePois && result.servicePois.length > 0 && (
                <div className="space-y-6 pt-10">
                    <h3 className="text-3xl font-extrabold font-headline text-white tracking-tight">{t('servicePoisTitle')}</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {result.servicePois.map(poi => (
                            <PoiCard 
                                key={poi.id} 
                                poi={poi} 
                                onShowDetails={handleShowDetails} 
                                selectable={!isSharedPage}
                                isSelected={selectedPoiIds.has(poi.id)}
                                onToggleSelect={togglePoiSelection}
                            />
                        ))}
                    </div>
                </div>
            )}

            {selectedPoiForDialog && (
                <PoiReviewDialog
                    poi={selectedPoiForDialog}
                    open={!!selectedPoiForDialog}
                    onOpenChange={(isOpen) => {
                        if (!isOpen) {
                            setSelectedPoiForDialog(null);
                        }
                    }}
                />
            )}
        </div>
    );
}
