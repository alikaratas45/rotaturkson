
'use client';

import { Button } from '@/components/ui/button';
import { useTranslations, useLocale } from 'next-intl';
import { ArrowLeft, Shield, MapPin, Cookie, Scale, Mail } from 'lucide-react';
import Link from 'next/link';

/**
 * Gizlilik Politikası ve Kullanım Şartları sayfası.
 * Kullanıcıların konum ve çerez verileri hakkında yasal olarak bilgilendirilmesini sağlar.
 */
export default function PrivacyPage() {
  const t = useTranslations('PrivacyPage');
  const locale = useLocale();

  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <Button asChild variant="outline" className="mb-8 rounded-full">
        <Link href="/">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Ana Sayfaya Dön
        </Link>
      </Button>

      <div className="space-y-12 animate-in fade-in slide-in-from-top-4 duration-700">
        <header className="text-center space-y-4">
          <div className="mx-auto bg-primary/10 w-20 h-20 rounded-full flex items-center justify-center text-primary mb-6">
            <Shield size={40} />
          </div>
          <h1 className="text-4xl md:text-5xl font-black font-headline text-foreground tracking-tighter">
            {t('title')}
          </h1>
          <p className="text-xl text-muted-foreground font-medium max-w-2xl mx-auto">
            {t('subtitle')}
          </p>
        </header>

        <div className="bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm p-8 md:p-12 rounded-[3rem] border border-primary/10 shadow-inner space-y-10">
          <p className="text-lg leading-relaxed text-muted-foreground">
            {t('intro')}
          </p>

          <section className="space-y-4">
            <div className="flex items-center gap-3 text-primary">
              <MapPin size={24} />
              <h2 className="text-2xl font-bold font-headline">{t('locationTitle')}</h2>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              {t('locationDesc')}
            </p>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-3 text-primary">
              <Cookie size={24} />
              <h2 className="text-2xl font-bold font-headline">{t('cookiesTitle')}</h2>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              {t('cookiesDesc')}
            </p>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-3 text-primary">
              <Shield size={24} />
              <h2 className="text-2xl font-bold font-headline">{t('kvkkTitle')}</h2>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              {t('kvkkDesc')}
            </p>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-3 text-primary">
              <Scale size={24} />
              <h2 className="text-2xl font-bold font-headline">{t('termsTitle')}</h2>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              {t('termsDesc')}
            </p>
          </section>

          <footer className="pt-8 border-t border-dashed border-primary/20 flex flex-col items-center gap-4 text-center">
            <div className="flex items-center gap-2 text-primary font-bold">
              <Mail size={18} />
              <span>rotaturktr@gmail.com</span>
            </div>
            <p className="text-sm text-muted-foreground italic">
              {t('contact')}
            </p>
          </footer>
        </div>
      </div>
    </div>
  );
}
