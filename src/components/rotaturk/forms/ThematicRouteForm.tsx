'use client';

import { useState } from 'react';
import { Loader2, Palette, Landmark, Leaf, Wind, Beef, Scroll, Castle, Flower2, Grape, Mountain, Trees, Sailboat, MountainSnow, Bike, Bath, Building, Anchor, Waves, BookOpen, ChefHat, Droplets, Shield, Film, Hand, Heart, Church, Gem, Salad, Snowflake, TreePine, Ship, Turtle, Bird, Camera, Theater, Globe2, BookMarked, PenTool, Caravan, Store, TowerControl, BrickWall, Utensils } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getManualRoute } from '@/app/actions';
import type { RouteResult } from '@/lib/types';
import thematicRoutesData from '@/lib/data/thematic-routes.json';
import { cn } from '@/lib/utils';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useLocale, useTranslations } from 'next-intl';

type ThematicRouteFormProps = {
  onResult: (type: 'thematic', data: Partial<RouteResult>) => void;
  onLoading: (isLoading: boolean) => void;
  isLoading: boolean;
  clearResults: () => void;
};

const iconMap: { [key: string]: React.ElementType } = {
    Palette, Landmark, Leaf, Wind, Beef, Scroll, Castle, Flower2, Grape, Mountain, Trees, Sailboat, Waves, MountainSnow, Bike, Bath, Building, Anchor, BookOpen, ChefHat, Droplets, Shield, Film, Hand, Heart, Church, Gem, Salad, Snowflake, TreePine, Ship, Turtle, Bird, Camera, Theater, Globe2, BookMarked, PenTool, Caravan, Store, TowerControl, BrickWall,
    Utensils,
};


export function ThematicRouteForm({ onResult, onLoading, isLoading, clearResults }: ThematicRouteFormProps) {
  const { toast } = useToast();
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const locale = useLocale();
  const t = useTranslations('ThematicRouteForm');

  const handleThemeSelect = async (theme: (typeof thematicRoutesData.routes)[0]) => {
    if (isLoading && selectedKey === theme.key) return;

    setSelectedKey(theme.key);
    onLoading(true);
    clearResults();

    try {
      const result = await getManualRoute(theme.params);
      if (result) {
        // Override the name with the thematic route name for the current locale
        const localizedName = (theme.name as any)[locale] || theme.name.en || theme.name.tr;
        const thematicResult = { ...result, name: localizedName };
        onResult('thematic', thematicResult);
      } else {
        throw new Error(t('error'));
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: t('errorTitle'),
        description: t('errorDescription'),
      });
      onLoading(false);
    }
  };

  const getLocalizedName = (theme: any) => {
    return theme.name[locale] || theme.name.en || theme.name.tr;
  };

  const getLocalizedDesc = (theme: any) => {
    return theme.description[locale] || theme.description.en || theme.description.tr;
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="font-semibold text-lg">{t('title')}</h3>
        <p className="text-sm text-primary-foreground/80 mt-2">{t('subtitle')}</p>
      </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {thematicRoutesData.routes.map((theme) => {
            const Icon = (theme.icon && iconMap[theme.icon]) ? iconMap[theme.icon] : Landmark;
            return (
            <Card
                key={theme.key}
                onClick={() => handleThemeSelect(theme)}
                className={cn(
                'cursor-pointer transition-all hover:shadow-md flex flex-row items-center p-3 bg-card text-card-foreground hover:bg-accent',
                isLoading && selectedKey === theme.key ? 'ring-2 ring-primary animate-pulse' : 'ring-0'
                )}
            >
                <div className="mr-4 bg-primary/10 text-primary p-3 rounded-lg">
                    <Icon className="h-6 w-6" />
                </div>
                <CardHeader className="p-0 flex-grow">
                    <CardTitle className="text-base">{getLocalizedName(theme)}</CardTitle>
                    <CardDescription className="text-xs leading-snug pt-1">{getLocalizedDesc(theme)}</CardDescription>
                </CardHeader>
                {isLoading && selectedKey === theme.key && (
                    <div className="flex justify-center items-center pl-2">
                        <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    </div>
                )}
            </Card>
            )
        })}
        </div>
    </div>
  );
}
