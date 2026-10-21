
'use client';

import { POI } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Sparkles, Info, ArrowRight, Landmark, Utensils, Bed, Trees, Scroll, Palette, CheckCircle2, Circle } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

interface PoiCardProps {
  poi: POI;
  onShowDetails: (poi: POI) => void;
  selectable?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (poi: POI) => void;
}

export function PoiCard({ poi, onShowDetails, selectable, isSelected, onToggleSelect }: PoiCardProps) {
  const locale = useLocale();
  const t = useTranslations('PoiCard');
  const t_poiTypes = useTranslations('PoiTypes');

  const gmapsSearchUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${poi.name?.tr || ''}, ${poi.location?.city || ''}`
  )}`;

  const getTranslatedPoiType = (type: string) => {
    try {
      return t_poiTypes(type as any);
    } catch (error) {
      return type;
    }
  };
  
  const localizedName = poi.name ? ((poi.name as any)[locale] || poi.name.en || poi.name.tr || "İsimsiz Nokta") : "İsimsiz Nokta";
  const localizedDesc = poi.description ? ((poi.description as any)[locale] || poi.description.en || poi.description.tr || "") : "";

  const getPoiIcon = () => {
    const iconSize = 16;
    switch(poi.type) {
      case 'Konaklama': return <Bed size={iconSize} />;
      case 'Yeme-İçme': return <Utensils size={iconSize} />;
      case 'Doğal': return <Trees size={iconSize} />;
      case 'Kültürel': return <Palette size={iconSize} />;
      case 'Arkeolojik': return <Scroll size={iconSize} />;
      case 'Tarihi': return <Landmark size={iconSize} />;
      default: return <MapPin size={iconSize} />;
    }
  };

  return (
    <Card className={cn(
        "card-3d overflow-hidden flex flex-col group border-white/10 relative",
        isSelected && "ring-2 ring-primary bg-primary/5 border-primary/20"
    )}>
      {selectable && (
        <Button
            size="sm"
            variant={isSelected ? "default" : "outline"}
            className={cn(
                "absolute top-4 right-4 z-20 rounded-full h-10 px-4 transition-all shadow-lg active:scale-95",
                isSelected ? "bg-primary text-white" : "bg-white/80 backdrop-blur-sm text-muted-foreground border-muted-foreground/20 hover:border-primary hover:text-primary"
            )}
            onClick={() => onToggleSelect?.(poi)}
        >
            {isSelected ? (
                <><CheckCircle2 className="w-4 h-4 mr-1.5" /> {t('selected')}</>
            ) : (
                <><Circle className="w-4 h-4 mr-1.5" /> {t('select')}</>
            )}
        </Button>
      )}

      <CardContent className="p-6 flex flex-col justify-between h-full flex-grow bg-card">
        <div className="space-y-4">
          <div className="flex justify-between items-start gap-2">
            <Badge
              variant={poi.sponsored ? 'default' : 'secondary'}
              className={cn(
                "whitespace-nowrap rounded-lg px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                poi.sponsored && "animate-pulse bg-primary text-white"
              )}
            >
              <span className="flex items-center gap-1">
                {poi.sponsored ? <Sparkles size={10} className="fill-white" /> : getPoiIcon()}
                {getTranslatedPoiType(poi.type)}
              </span>
            </Badge>
            {poi.sponsored && (
                <span className="text-[10px] font-black text-primary uppercase tracking-widest bg-primary/10 px-2 py-0.5 rounded-full">
                    Sponsorlu
                </span>
            )}
          </div>

          <div>
            <h4 className="font-bold text-xl leading-tight group-hover:text-primary transition-colors mb-2 pr-20">
                {localizedName}
            </h4>
            <div className="flex items-center text-muted-foreground text-sm font-semibold mb-3">
                <MapPin className="w-3.5 h-3.5 mr-1 text-primary/70" />
                {poi.location?.district ? `${poi.location.district}, ` : ''}{poi.location?.city || ''}
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground line-clamp-3 italic">
                "{localizedDesc}"
            </p>
          </div>
        </div>
        
        <div className="mt-6 pt-4 border-t border-dashed flex flex-wrap items-center justify-between gap-2">
            <Button
                variant="ghost"
                size="sm"
                className="font-bold text-primary hover:bg-primary/10 rounded-lg text-xs"
                onClick={() => onShowDetails(poi)}
            >
                <Info className="w-4 h-4 mr-2" /> {t('details')}
            </Button>
            <Button size="sm" asChild className="rounded-lg shadow-md group/btn h-9 px-4 text-xs">
                <a href={gmapsSearchUrl} target="_blank" rel="noopener noreferrer">
                    <span className="mr-2">{t('showOnMap')}</span>
                    <ArrowRight className="w-4 h-4 transition-transform group-hover/btn:translate-x-1" />
                </a>
            </Button>
        </div>
      </CardContent>
    </Card>
  );
}
