'use client';

import React from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import thematicRoutesData from '@/lib/data/thematic-routes.json';
import { Landmark, Palette, Leaf, Wind, Beef, Scroll, Castle, Flower2, Grape, Mountain, Trees, Sailboat, Waves, MountainSnow, Bike, Bath, Building, Anchor, BookOpen, ChefHat, Droplets, Shield, Film, Hand, Heart, Church, Gem, Salad, Snowflake, TreePine, Ship, Turtle, Bird, Camera, Theater, Globe2, BookMarked, PenTool, Caravan, Store, TowerControl, BrickWall, Utensils } from "lucide-react";
import { useTranslations, useLocale } from 'next-intl';

// Moved iconMap directly into this file to resolve compilation issues.
const iconMap: { [key: string]: React.ElementType } = {
    Palette, Landmark, Leaf, Wind, Beef, Scroll, Castle, Flower2, Grape, Mountain, Trees, Sailboat, Waves, MountainSnow, Bike, Bath, Building, Anchor, BookOpen, ChefHat, Droplets, Shield, Film, Hand, Heart, Church, Gem, Salad, Snowflake, TreePine, Ship, Turtle, Bird, Camera, Theater, Globe2, BookMarked, PenTool, Caravan, Store, TowerControl, BrickWall,
    Utensils,
};

// Adjusted type definition for flexibility
type LucideIcon = React.ElementType;

interface RouteOfTheWeekProps {
    onDiscover: (theme: any) => void;
}

export function RouteOfTheWeek({ onDiscover }: RouteOfTheWeekProps) {
    const [currentRoute, setCurrentRoute] = React.useState<(typeof thematicRoutesData.routes)[0] | null>(null);
    const t = useTranslations('RoutePlanner');
    const locale = useLocale();

    React.useEffect(() => {
        // Function to get the week number
        const getWeekNumber = (d: Date) => {
            d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
            d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
            const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
            const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
            return weekNo;
        };

        const today = new Date();
        const weekNumber = getWeekNumber(today);
        const routes = thematicRoutesData.routes;
        const routeIndex = (weekNumber - 1) % routes.length; // Use week number to pick a route, looping back if necessary
        
        setCurrentRoute(routes[routeIndex]);

    }, []);

    if (!currentRoute) {
        return null; // or a loading skeleton
    }
    
    const Icon: LucideIcon = (currentRoute.icon && iconMap[currentRoute.icon]) ? iconMap[currentRoute.icon] : Landmark;

    const handleDiscoverClick = () => {
        onDiscover(currentRoute);
    }

    const localizedName = (currentRoute.name as any)[locale] || currentRoute.name.en || currentRoute.name.tr;
    const localizedDesc = (currentRoute.description as any)[locale] || currentRoute.description.en || currentRoute.description.tr;

    return (
        <section className="mb-12">
            <Card className="overflow-hidden shadow-lg transition-all hover:shadow-xl border-primary/20 bg-accent/50">
                <div className="p-8 text-center">
                     <div className="flex items-center justify-center gap-3 mb-3">
                        <div className="bg-primary/10 text-primary p-3 rounded-xl">
                           <Icon className="h-6 w-6" />
                        </div>
                        <h2 className="text-xl font-bold text-primary tracking-wide uppercase">{t('routeOfTheWeek')}</h2>
                    </div>
                    <h3 className="text-3xl md:text-4xl font-bold font-headline mb-3">{localizedName}</h3>
                    <p className="text-muted-foreground mb-6 leading-relaxed max-w-3xl mx-auto">
                        {localizedDesc}
                    </p>
                    <Button onClick={handleDiscoverClick} size="lg">
                        {t('discoverTheRoute')}
                    </Button>
                </div>
            </Card>
        </section>
    );
}
