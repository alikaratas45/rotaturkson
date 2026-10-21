'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ManualRouteResults } from '@/components/rotaturk/results/ManualRouteResults';
import { Loader2, AlertCircle, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslations } from 'next-intl';
import type { RouteResult } from '@/lib/types';
import Link from 'next/link';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';

export default function SharedRoutePage() {
  const params = useParams();
  const db = useFirestore();
  const t = useTranslations('General');
  const [route, setRoute] = useState<RouteResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const routeRef = useMemoFirebase(() => {
    if (!db || !params.routeId) return null;
    return doc(db, 'sharedRoutes', params.routeId as string);
  }, [db, params.routeId]);

  const { data: sharedDoc, isLoading: isDocLoading } = useDoc(routeRef);

  useEffect(() => {
    if (sharedDoc) {
      setRoute(sharedDoc.routeData as RouteResult);
    }
    if (!isDocLoading) {
      setIsLoading(false);
    }
  }, [sharedDoc, isDocLoading]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-muted-foreground font-medium">{t('loading')}</p>
      </div>
    );
  }

  if (!route) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <AlertCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">Rota Bulunamadı</h1>
        <p className="text-muted-foreground mb-8">Aradığınız rota silinmiş olabilir veya bağlantı hatalı.</p>
        <Button asChild>
          <Link href="/">Ana Sayfaya Dön</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex justify-between items-center">
        <Button asChild variant="outline">
          <Link href="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Ana Sayfaya Dön
          </Link>
        </Button>
      </div>
      
      <div className="bg-primary p-8 rounded-[2.5rem] text-primary-foreground shadow-2xl">
        <ManualRouteResults 
            result={route} 
            isSharedPage={true}
        />
      </div>
    </div>
  );
}
