'use client';

import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, MapPin, Loader2, X } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { getAllPois } from '@/app/actions';
import type { POI } from '@/lib/types';
import { Card } from '@/components/ui/card';

interface SearchPoisFormProps {
  onResult: (type: 'manual', data: any) => void;
  onLoading: (isLoading: boolean) => void;
  isLoading: boolean;
  clearResults: () => void;
}

export function SearchPoisForm({ onResult, onLoading, isLoading, clearResults }: SearchPoisFormProps) {
  const t = useTranslations('SearchPoisForm');
  const locale = useLocale();
  const [searchTerm, setSearchTerm] = useState('');
  const [allPois, setAllPois] = useState<POI[]>([]);
  const [suggestions, setSuggestions] = useState<POI[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getAllPois().then(setAllPois).catch(console.error);
  }, []);

  useEffect(() => {
    if (searchTerm.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const filtered = allPois.filter(poi => {
      if (!poi || !poi.name) return false;
      const nameObj = poi.name as any;
      const name = nameObj[locale] || nameObj.tr || nameObj.en || '';
      return name.toLowerCase().includes(searchTerm.toLowerCase());
    }).slice(0, 5);

    setSuggestions(filtered);
    setShowSuggestions(filtered.length > 0);
  }, [searchTerm, allPois, locale]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchTerm.trim()) return;

    onLoading(true);
    clearResults();
    setShowSuggestions(false);

    const results = allPois.filter(poi => {
      if (!poi || !poi.name) return false;
      const nameObj = poi.name as any;
      const name = nameObj[locale] || nameObj.tr || nameObj.en || '';
      return name.toLowerCase().includes(searchTerm.toLowerCase());
    });

    setTimeout(() => {
        onResult('manual', {
            routeId: `search-${Date.now()}`,
            name: t('searchResultsFor', { term: searchTerm }),
            touristPois: results,
            servicePois: [],
            googleMapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(searchTerm)}`
        });
    }, 500);
  };

  const handleSelectPoi = (poi: POI) => {
    if (!poi || !poi.name) return;
    const nameObj = poi.name as any;
    const name = nameObj[locale] || nameObj.tr || nameObj.en || '';
    setSearchTerm(name);
    setShowSuggestions(false);
    
    onLoading(true);
    clearResults();
    
    setTimeout(() => {
        onResult('manual', {
            routeId: `search-${poi.id}`,
            name: name,
            touristPois: [poi],
            servicePois: [],
            googleMapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name + " " + (poi.location?.city || ''))}`
        });
    }, 300);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500" ref={containerRef}>
      <div className="text-center">
        <h3 className="font-extrabold text-2xl font-headline flex items-center justify-center gap-2">
            <Search className="h-6 w-6" />
            {t('title')}
        </h3>
        <p className="text-sm mt-2 opacity-90 leading-tight">
            {t('subtitle')}
        </p>
      </div>

      <form onSubmit={handleSearch} className="space-y-4 relative">
        <div className="relative">
            <Input 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onFocus={() => searchTerm.length >= 2 && setShowSuggestions(true)}
                placeholder={t('placeholder')}
                className="bg-white text-black h-14 pl-12 pr-10 rounded-2xl shadow-inner border-none focus-visible:ring-2 focus-visible:ring-blue-400 text-lg font-medium"
            />
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
            {searchTerm && (
                <button 
                    type="button"
                    onClick={() => { setSearchTerm(''); setSuggestions([]); }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-black transition-colors"
                >
                    <X size={18} />
                </button>
            )}

            {showSuggestions && (
                <Card className="absolute top-full left-0 right-0 mt-2 z-[100] shadow-2xl border-none overflow-hidden rounded-2xl bg-white/95 backdrop-blur-md">
                    <div className="p-2 space-y-1">
                        {suggestions.map((poi) => (
                            <button
                                key={poi.id}
                                type="button"
                                onClick={() => handleSelectPoi(poi)}
                                className="w-full text-left px-4 py-3 hover:bg-primary/10 rounded-xl transition-all flex items-center gap-3 group"
                            >
                                <div className="bg-primary/10 p-2 rounded-lg group-hover:bg-primary/20 transition-colors">
                                    <MapPin size={16} className="text-primary" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-black leading-none mb-1">
                                        {poi.name ? ((poi.name as any)[locale] || (poi.name as any).tr) : 'İsimsiz Nokta'}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                                        {poi.location?.district ? `${poi.location.district}, ` : ''}{poi.location?.city || ''}
                                    </p>
                                </div>
                            </button>
                        ))}
                    </div>
                </Card>
            )}
        </div>

        <Button 
            type="submit" 
            disabled={isLoading || !searchTerm.trim()}
            className="w-full bg-white text-primary hover:bg-white/90 h-14 rounded-2xl shadow-lg active:scale-[0.98] transition-all text-lg font-bold"
        >
            {isLoading ? <Loader2 className="mr-3 h-6 w-6 animate-spin" /> : <Search className="mr-3 h-6 w-6" />}
            {t('findButton')}
        </Button>
      </form>
    </div>
  );
}
