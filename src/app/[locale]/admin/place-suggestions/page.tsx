'use client';

import { useCallback, useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Check, ImageOff, Loader2, MapPin, RefreshCw, X } from 'lucide-react';
import { useFirestore, useUser } from '@/firebase';
import {
  approvePlaceSuggestion,
  getPendingPlaceSuggestions,
  PlaceSuggestion,
  rejectPlaceSuggestion,
} from '@/firebase/place-suggestions';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ADMIN_EMAIL } from '@/lib/admin';

export default function AdminPlaceSuggestionsPage() {
  const db = useFirestore();
  const { user, isUserLoading } = useUser();
  const locale = useLocale();
  const router = useRouter();
  const { toast } = useToast();
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);

  const loadSuggestions = useCallback(async () => {
    setIsLoading(true);
    try {
      setSuggestions(await getPendingPlaceSuggestions(db));
    } catch (error) {
      console.error('Bekleyen yer önerileri yüklenemedi:', error);
      toast({
        variant: 'destructive',
        title: 'Öneriler yüklenemedi',
        description: 'Yönetici erişiminizi ve Firestore kurallarını kontrol edin.',
      });
    } finally {
      setIsLoading(false);
    }
  }, [db, toast]);

  useEffect(() => {
    if (isUserLoading) return;
    if (!user || user.email !== ADMIN_EMAIL) {
      router.replace(`/${locale}/admin`);
      return;
    }
    void loadSuggestions();
  }, [user, isUserLoading, locale, router, loadSuggestions]);

  const decideSuggestion = async (
    suggestion: PlaceSuggestion,
    decision: 'approve' | 'reject',
  ) => {
    setActiveId(suggestion.id);
    try {
      if (decision === 'approve') {
        await approvePlaceSuggestion(db, suggestion.id);
      } else {
        await rejectPlaceSuggestion(db, suggestion.id);
      }
      setSuggestions((current) => current.filter((item) => item.id !== suggestion.id));
      toast({
        title: decision === 'approve' ? 'Öneri onaylandı' : 'Öneri reddedildi',
        description:
          decision === 'approve'
            ? 'Yer uygulamanın yer kataloğuna eklendi.'
            : 'Önerinin durumu reddedildi olarak güncellendi.',
      });
    } catch (error) {
      console.error('Yer önerisi değerlendirilemedi:', error);
      toast({
        variant: 'destructive',
        title: 'İşlem tamamlanamadı',
        description: error instanceof Error ? error.message : 'Lütfen tekrar deneyin.',
      });
    } finally {
      setActiveId(null);
    }
  };

  if (isUserLoading || !user || user.email !== ADMIN_EMAIL) {
    return (
      <div className="container flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" aria-label="Yükleniyor" />
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-6xl px-4 py-10 md:py-14">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="mb-2 inline-flex items-center gap-2 text-sm font-semibold text-primary">
            <MapPin className="h-4 w-4" /> Yönetim paneli
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">Yer önerileri</h1>
          <p className="mt-2 text-muted-foreground">Yayınlanmadan önce topluluk önerilerini inceleyin.</p>
        </div>
        <Button variant="outline" onClick={() => void loadSuggestions()} disabled={isLoading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          Yenile
        </Button>
      </div>

      {isLoading ? (
        <div className="flex min-h-48 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : suggestions.length === 0 ? (
        <Card className="rounded-3xl border-dashed shadow-none">
          <CardContent className="flex flex-col items-center py-16 text-center">
            <div className="rounded-full bg-primary/10 p-4 text-primary"><Check className="h-7 w-7" /></div>
            <h2 className="mt-4 text-xl font-bold">Bekleyen öneri yok</h2>
            <p className="mt-2 text-sm text-muted-foreground">Yeni öneriler geldiğinde burada görüntülenecek.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {suggestions.map((suggestion) => (
            <Card key={suggestion.id} className="overflow-hidden rounded-3xl border-primary/10 shadow-md">
              {suggestion.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={suggestion.imageUrl} alt={`${suggestion.name} fotoğrafı`} className="h-56 w-full object-cover" />
              ) : (
                <div className="flex h-40 items-center justify-center bg-muted text-muted-foreground">
                  <ImageOff className="mr-2 h-5 w-5" /> Fotoğraf eklenmemiş
                </div>
              )}
              <CardContent className="space-y-5 p-5 md:p-6">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-bold">{suggestion.name}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {suggestion.district}, {suggestion.city} · {suggestion.category}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">Bekliyor</span>
                </div>
                <p className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{suggestion.description}</p>
                <div className="grid grid-cols-2 gap-3 rounded-xl bg-muted/50 p-3 text-xs">
                  <div><span className="text-muted-foreground">Koordinatlar</span><p className="mt-1 font-medium">{suggestion.latitude}, {suggestion.longitude}</p></div>
                  <div><span className="text-muted-foreground">Öneren</span><p className="mt-1 font-medium">{suggestion.userName}</p></div>
                </div>
                <div className="flex gap-3">
                  <Button className="flex-1" onClick={() => void decideSuggestion(suggestion, 'approve')} disabled={activeId !== null}>
                    {activeId === suggestion.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                    Onayla
                  </Button>
                  <Button variant="destructive" className="flex-1" onClick={() => void decideSuggestion(suggestion, 'reject')} disabled={activeId !== null}>
                    <X className="mr-2 h-4 w-4" /> Reddet
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
