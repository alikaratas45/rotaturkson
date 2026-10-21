
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useTranslations, useLocale } from 'next-intl';
import { Cookie, ShieldCheck, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

/**
 * KVKK/GDPR uyumlu çerez onay bandı.
 * Kullanıcı kabul ettiğinde tarayıcıya kaydeder ve bir daha göstermez.
 */
export function CookieConsent() {
  const [isVisible, setIsVisible] = useState(false);
  const t = useTranslations('CookieConsent');
  const locale = useLocale();

  useEffect(() => {
    // Daha önce onay verilmiş mi kontrol et
    const consent = localStorage.getItem('rt-cookie-consent');
    if (!consent) {
      // Küçük bir gecikmeyle göster (daha yumuşak bir giriş için)
      const timer = setTimeout(() => setIsVisible(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('rt-cookie-consent', 'true');
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[2000000] w-[95%] max-w-4xl animate-in fade-in slide-in-from-bottom-10 duration-1000">
      <Card className="bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl border-primary/20 shadow-[0_20px_50px_-10px_rgba(0,0,0,0.3)] rounded-[2.5rem] overflow-hidden">
        <CardContent className="p-6 md:p-8">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="bg-primary/10 p-4 rounded-3xl text-primary animate-pulse">
              <Cookie size={40} />
            </div>
            
            <div className="flex-grow space-y-2 text-center md:text-left">
              <h4 className="text-xl font-black font-headline text-foreground flex items-center justify-center md:justify-start gap-2">
                <ShieldCheck size={20} className="text-primary" />
                Gizliliğiniz Bizim İçin Önemli
              </h4>
              <p className="text-sm text-muted-foreground leading-relaxed font-medium">
                {t('message')}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
              <Button 
                variant="ghost" 
                asChild
                className="rounded-full font-bold h-12 px-6 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-sm whitespace-nowrap"
              >
                <Link href={`/${locale}/privacy`}>
                  {t('details')}
                  <ArrowRight size={14} className="ml-2" />
                </Link>
              </Button>
              <Button 
                onClick={handleAccept}
                className="rounded-full font-black h-14 px-10 text-base shadow-xl active:scale-95 transition-all w-full sm:w-auto"
              >
                {t('accept')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
