'use client';

import { useState, useEffect } from 'react';
import { RoutePlanner, type PlannerResult } from '@/components/rotaturk/RoutePlanner';
import { useTranslations } from 'next-intl';
import { FeedbackSection } from '@/components/feedback/FeedbackSection';
import { Preloader } from '@/components/layout/Preloader';
import type { POI, ActiveTraveler } from '@/lib/types';
import { PoiReviewDialog } from '@/components/rotaturk/dialogs/PoiReviewDialog';
import { LeaderboardDialog } from '@/components/rotaturk/dialogs/LeaderboardDialog';
import { ChatDialog } from '@/components/rotaturk/ChatDialog';
import { Timestamp } from 'firebase/firestore';
import { EmbeddedMap } from '@/components/map';
import { getAllPois } from '@/app/actions';
import { Button } from '@/components/ui/button';
import { Trophy } from 'lucide-react';

export default function Home() {
  const t = useTranslations('HomePage');
  const t_leaderboard = useTranslations('Leaderboard');
  const [showPreloader, setShowPreloader] = useState(true);
  
  const [selectedPoi, setSelectedPoi] = useState<POI | null>(null);
  const [selectedTraveler, setSelectedTraveler] = useState<ActiveTraveler | null>(null);
  const [allPois, setAllPois] = useState<POI[]>([]);
  const [activeResult, setActiveResult] = useState<PlannerResult | undefined>(undefined);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);

  useEffect(() => {
    // 4 resim * 1.3s = 5.2s. 6 saniye gösterip sonra uygulamayı açıyoruz.
    const timer = setTimeout(() => {
      setShowPreloader(false);
    }, 6000);

    getAllPois().then(setAllPois).catch(console.error);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const handleOpenChat = (event: Event) => {
        const customEvent = event as CustomEvent;
        const { userId, displayName } = customEvent.detail;
        
        setSelectedTraveler({
            id: userId,
            userId: userId,
            displayName: displayName,
            latitude: 0,
            longitude: 0,
            lastUpdated: Timestamp.now()
        } as ActiveTraveler);
    };

    const handleFocusPoi = (event: Event) => {
        const customEvent = event as CustomEvent;
        setSelectedPoi(customEvent.detail as POI);
    };

    window.addEventListener('open-chat', handleOpenChat);
    window.addEventListener('focus-poi', handleFocusPoi);
    return () => {
        window.removeEventListener('open-chat', handleOpenChat);
        window.removeEventListener('focus-poi', handleFocusPoi);
    };
  }, []);

  if (showPreloader) {
    return <Preloader />;
  }

  return (
    <div className="flex flex-col w-full">
      {/* Üst Harita Bölümü - Sadece arama sonucu yoksa gösterilir */}
      {!activeResult && (
          <div className="w-full h-[400px] md:h-[500px] shadow-lg border-b overflow-hidden bg-muted relative">
            <EmbeddedMap 
              pois={allPois} 
              onMarkerClick={(poi) => setSelectedPoi(poi)}
              onTravelerClick={(traveler) => setSelectedTraveler(traveler)}
            />
          </div>
      )}

      {/* Hero Bölümü */}
      <div className="container mx-auto px-4 py-12 text-center">
            <div className="animate-fade-in-up">
                <h1 className="text-4xl md:text-5xl font-extrabold font-headline tracking-tight text-foreground">
                    {t('title')}
                </h1>
                <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground font-medium">
                    {t('subtitle')}
                </p>
                <div className="mt-8 flex justify-center">
                    <Button 
                        onClick={() => setIsLeaderboardOpen(true)}
                        variant="outline"
                        className="rounded-full border-primary/40 text-primary font-black px-8 h-12 shadow-md hover:bg-primary/5 active:scale-95 transition-all"
                    >
                        <Trophy className="mr-2 h-5 w-5 text-amber-500" />
                        {t_leaderboard('button')}
                    </Button>
                </div>
            </div>
        </div>

      {/* Planlayıcı ve Sonuçlar */}
      <div className="container mx-auto px-4 py-6">
          <RoutePlanner 
            onResultChange={(result) => setActiveResult(result)}
            onMarkerClick={(poi) => setSelectedPoi(poi)}
            onTravelerClick={(traveler) => setSelectedTraveler(traveler)}
          />
      </div>

      {/* Geri Bildirim */}
      <div className="container mx-auto px-4 py-12">
          <FeedbackSection displayMode="home" />
      </div>

      {selectedPoi && (
        <PoiReviewDialog 
          poi={selectedPoi} 
          open={!!selectedPoi} 
          onOpenChange={(open) => {
            if (!open) setSelectedPoi(null);
          }} 
        />
      )}

      {isLeaderboardOpen && (
          <LeaderboardDialog 
            open={isLeaderboardOpen} 
            onOpenChange={setIsLeaderboardOpen} 
          />
      )}

      {selectedTraveler && (
        <ChatDialog 
          targetTraveler={selectedTraveler} 
          onClose={() => setSelectedTraveler(null)} 
        />
      )}
    </div>
  );
}
