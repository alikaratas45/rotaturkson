'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, limit } from 'firebase/firestore';
import { Trophy, Medal, Loader2, Users, AlertCircle, RefreshCw, MapPin, ArrowLeft, ChevronRight } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { getAllPois } from '@/app/actions';
import type { POI, CheckIn } from '@/lib/types';

interface LeaderboardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LeaderboardDialog({ open, onOpenChange }: LeaderboardDialogProps) {
  const t = useTranslations('Leaderboard');
  const locale = useLocale();
  const db = useFirestore();
  const { user } = useUser();
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [visitedPois, setVisitedPois] = useState<POI[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [allPois, setAllPois] = useState<POI[]>([]);

  // Tüm POI'leri ID eşleştirmesi için yükleyelim
  useEffect(() => {
    if (open) {
      getAllPois().then(setAllPois).catch(console.error);
    }
  }, [open]);

  // Tüm check-in kayıtlarını çekip isim bazlı gruplayacağız
  const checkinsQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(
      collection(db, 'checkins'),
      orderBy('timestamp', 'desc'),
      limit(1000) // Geniş bir havuz alalım
    );
  }, [db, refreshKey]);

  const { data: checkins, isLoading, error } = useCollection<CheckIn>(checkinsQuery);

  // Verileri isim bazlı birleştirip puanları hesaplayalım
  const topUsers = useMemo(() => {
    if (!checkins) return [];
    
    // userName -> Set(poiId) haritası oluştur
    const userMap: Record<string, Set<string>> = {};
    
    checkins.forEach(ci => {
      const name = ci.userName || 'Gizemli Gezgin';
      if (!userMap[name]) {
        userMap[name] = new Set();
      }
      userMap[name].add(ci.poiId);
    });

    // Gruplanmış veriyi liste formatına çevir ve puanla
    return Object.entries(userMap)
      .map(([name, pois]) => ({
        id: name, // İsmi ID olarak kullanıyoruz
        displayName: name,
        totalPoints: pois.size * 10, // Her benzersiz mekan 10 puan
        poiIds: Array.from(pois)
      }))
      .sort((a, b) => b.totalPoints - a.totalPoints)
      .slice(0, 10);
  }, [checkins]);

  const fetchUserHistory = (targetUser: any) => {
    if (!targetUser) return;
    setIsHistoryLoading(true);
    setSelectedUser(targetUser);
    
    // Zaten elimizde olan benzersiz POI ID'lerini mekan listesine çevir
    const resolvedPois = targetUser.poiIds
      .map((id: string) => allPois.find(p => p.id === id))
      .filter((p: any): p is POI => !!p);
    
    setVisitedPois(resolvedPois);
    setIsHistoryLoading(false);
  };

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0: return <Trophy className="text-amber-400 h-5 w-5" />;
      case 1: return <Medal className="text-slate-400 h-5 w-5" />;
      case 2: return <Medal className="text-amber-700 h-5 w-5" />;
      default: return <span className="text-muted-foreground font-bold">{index + 1}</span>;
    }
  };

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <Dialog open={open} onOpenChange={(val) => {
      if (!val) {
        setSelectedUser(null);
        setVisitedPois([]);
      }
      onOpenChange(val);
    }}>
      <DialogContent className="sm:max-w-[500px] h-[650px] flex flex-col p-0 overflow-hidden border-none shadow-2xl">
        <DialogHeader className="p-8 bg-primary text-primary-foreground relative shrink-0">
          <div className="absolute top-0 right-0 -mr-10 -mt-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
          <div className="relative z-10 flex flex-col items-center text-center gap-2">
            <div className="bg-white/20 p-4 rounded-full mb-2">
              <Trophy size={48} className="text-white animate-float" />
            </div>
            <DialogTitle className="text-3xl font-black font-headline tracking-tighter">
              {selectedUser ? selectedUser.displayName : t('title')}
            </DialogTitle>
            <DialogDescription className="text-primary-foreground/80 font-medium">
              {selectedUser ? 'Gezilen Benzersiz Yerler' : t('subtitle')}
            </DialogDescription>
            {!selectedUser && (
              <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleRefresh}
                  className="mt-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full h-8"
              >
                  <RefreshCw size={14} className={cn("mr-2", isLoading && "animate-spin")} />
                  Yenile
              </Button>
            )}
            {selectedUser && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setSelectedUser(null)}
                className="mt-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full h-8"
              >
                <ArrowLeft size={14} className="mr-2" />
                Sıralamaya Dön
              </Button>
            )}
          </div>
        </DialogHeader>

        <div className="flex-grow bg-background flex flex-col min-h-0 overflow-hidden">
          {selectedUser ? (
            <div className="flex flex-col h-full overflow-hidden">
               {isHistoryLoading ? (
                 <div className="flex-grow flex flex-col items-center justify-center gap-4">
                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                    <p className="text-muted-foreground font-bold uppercase text-xs tracking-widest">Geçmiş Yükleniyor...</p>
                 </div>
               ) : visitedPois.length > 0 ? (
                 <ScrollArea className="flex-grow">
                    <div className="p-6 space-y-3">
                      {visitedPois.map((poi, idx) => (
                        <div key={`${poi.id}-${idx}`} className="flex items-center gap-4 p-4 bg-muted/30 rounded-2xl border border-muted-foreground/10 animate-in slide-in-from-bottom-2 duration-300" style={{ animationDelay: `${idx * 50}ms` }}>
                           <div className="bg-primary/20 p-2 rounded-xl text-primary shrink-0">
                              <MapPin size={20} />
                           </div>
                           <div className="flex-grow min-w-0">
                              <p className="font-black text-sm truncate">
                                {(poi.name as any)[locale] || poi.name.tr}
                              </p>
                              <p className="text-[10px] uppercase font-bold text-muted-foreground">
                                {poi.location.city} {poi.location.district ? `/ ${poi.location.district}` : ''}
                              </p>
                           </div>
                           <div className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded-lg font-black text-[10px]">
                              +10 PUAN
                           </div>
                        </div>
                      ))}
                    </div>
                 </ScrollArea>
               ) : (
                 <div className="flex-grow flex flex-col items-center justify-center text-center p-10 gap-4">
                    <MapPin size={64} className="text-muted-foreground opacity-20" />
                    <p className="text-muted-foreground font-medium">Henüz kayıtlı bir ziyaret bulunamadı.</p>
                 </div>
               )}
            </div>
          ) : (
            <>
              {isLoading ? (
                <div className="flex-grow flex flex-col items-center justify-center gap-4">
                  <Loader2 className="h-10 w-10 animate-spin text-primary" />
                  <p className="text-muted-foreground font-bold uppercase text-xs tracking-widest">{t('loading')}</p>
                </div>
              ) : error ? (
                <div className="flex-grow flex flex-col items-center justify-center text-center p-10 gap-4">
                  <AlertCircle size={64} className="text-destructive opacity-20" />
                  <p className="text-destructive font-bold text-sm">Veriler alınamadı.</p>
                </div>
              ) : topUsers && topUsers.length > 0 ? (
                <div className="flex flex-col h-full">
                    <ScrollArea className="flex-grow">
                    <div className="p-6">
                        <Table>
                        <TableHeader>
                            <TableRow className="hover:bg-transparent border-b-2">
                            <TableHead className="w-[80px] font-black uppercase text-[10px] tracking-widest">{t('rank')}</TableHead>
                            <TableHead className="font-black uppercase text-[10px] tracking-widest">{t('traveler')}</TableHead>
                            <TableHead className="text-right font-black uppercase text-[10px] tracking-widest">{t('points')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {topUsers.map((u, index) => {
                              const isMe = u.displayName === user?.displayName;
                              return (
                                <TableRow 
                                    key={u.id} 
                                    onClick={() => fetchUserHistory(u)}
                                    className={cn(
                                    "transition-colors cursor-pointer group",
                                    isMe ? "bg-primary/10 hover:bg-primary/20" : "hover:bg-muted/50",
                                    index === 0 && !isMe && "bg-amber-50/30",
                                    index === 1 && !isMe && "bg-slate-50/30",
                                    index === 2 && !isMe && "bg-orange-50/30"
                                    )}
                                >
                                    <TableCell className="py-4 text-center">
                                      {getRankIcon(index)}
                                    </TableCell>
                                    <TableCell className="py-4">
                                    <div className="flex flex-col">
                                        <span className="font-black text-sm text-foreground flex items-center gap-1 group-hover:text-primary transition-colors">
                                        {u.displayName}
                                        {isMe && <span className="text-[9px] bg-primary text-primary-foreground px-1.5 py-0.5 rounded-md ml-1">SİZ</span>}
                                        <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-all -ml-1 group-hover:ml-1" />
                                        </span>
                                        {index < 3 && (
                                            <span className="text-[9px] font-bold text-primary uppercase tracking-tighter">
                                                {index === 0 ? 'Altın Gezgin' : index === 1 ? 'Gümüş Gezgin' : 'Bronz Gezgin'}
                                            </span>
                                        )}
                                    </div>
                                    </TableCell>
                                    <TableCell className="text-right py-4">
                                    <div className="inline-flex items-center gap-1 bg-primary/10 px-3 py-1 rounded-full border border-primary/20">
                                        <span className="font-black text-primary text-sm">{u.totalPoints}</span>
                                    </div>
                                    </TableCell>
                                </TableRow>
                              )
                            })}
                        </TableBody>
                        </Table>
                    </div>
                    </ScrollArea>
                </div>
              ) : (
                <div className="flex-grow flex flex-col items-center justify-center text-center p-10 gap-4">
                  <Users size={64} className="text-muted-foreground opacity-20" />
                  <p className="text-muted-foreground font-medium">{t('noData')}</p>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
