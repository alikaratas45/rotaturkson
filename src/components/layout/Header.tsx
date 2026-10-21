
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Download, Route, Phone, Trophy, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslations, useLocale } from 'next-intl';
import { LanguageSwitcher } from './LanguageSwitcher';
import { ColorThemeSwitcher } from './ColorThemeSwitcher';
import { SettingsControl } from '../rotaturk/SettingsControl';
import { usePWAInstall } from '@/hooks/use-pwa-install';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';

export function Header() {
  const t = useTranslations('Header');
  const locale = useLocale();
  const { isInstallable, handleInstallClick } = usePWAInstall();
  const [isMounted, setIsMounted] = useState(false);
  
  const { user } = useUser();
  const db = useFirestore();

  // Kullanıcı puanını canlı gösterelim
  const userRef = useMemoFirebase(() => (db && user ? doc(db, 'users', user.uid) : null), [db, user]);
  const { data: userProfile } = useDoc(userRef);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const myRoutesHref = `/${locale}/my-routes`;
  
  return (
    <header className="sticky top-0 z-50 w-full glass-morphism border-b shadow-sm overflow-x-hidden">
      <div className="container flex h-16 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 cursor-pointer group transition-transform active:scale-95 shrink-0">
          <div className="relative w-8 h-8 group-hover:rotate-12 transition-transform">
             <Image 
                src="/logo.png" 
                alt="RotaTurk Logo" 
                fill 
                style={{ objectFit: 'contain' }}
                className="drop-shadow-sm"
              />
          </div>
          <div className="flex flex-col">
            <span className="font-extrabold text-xl font-headline tracking-tighter text-primary leading-none">{t('title')}</span>
            <span className="text-[8px] uppercase tracking-widest font-bold opacity-60">Tourism Navigator</span>
          </div>
        </Link>
        
        <div className="flex items-center gap-1">
          <div className={cn("flex items-center gap-1 transition-opacity duration-300", isMounted ? "opacity-100" : "opacity-0")}>
            
            {userProfile?.totalPoints != null && (
               <div className="hidden md:flex items-center gap-2 bg-amber-50 text-amber-700 px-3 py-1.5 rounded-full border border-amber-100 mr-2">
                  <Trophy size={14} className="fill-amber-500" />
                  <span className="text-xs font-black">{userProfile.totalPoints} <span className='hidden lg:inline'>Gezgin Puanı</span></span>
               </div>
            )}

            <Button variant="ghost" size="sm" asChild className="rounded-full hover:bg-emerald-50 text-emerald-600 h-9 px-2 md:px-3 hidden sm:flex">
              <a href="https://wa.me/905432177581" target="_blank" rel="noopener noreferrer">
                <Phone className="h-4 w-4 md:mr-2" />
                <span className='font-bold'>WhatsApp</span>
              </a>
            </Button>
            
            {isMounted && isInstallable && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleInstallClick}
                className="rounded-full border-primary/30 text-primary hover:bg-primary/10 h-9 px-2 md:px-3 shadow-none"
              >
                <Download className="h-4 w-4 md:mr-2" />
                <span className='hidden sm:inline font-bold'>{t('installApp')}</span>
              </Button>
            )}
            <Button variant="ghost" size="sm" asChild className="rounded-full hover:bg-primary/10 hover:text-primary h-9 px-2 md:px-3">
              <Link href={myRoutesHref}>
                <Route className="h-4 w-4 md:mr-2" />
                <span className='hidden sm:inline font-bold'>{t('myRoutes')}</span>
              </Link>
            </Button>
            <div className="flex items-center gap-0.5 pl-1 border-l ml-1">
              <SettingsControl />
              <ColorThemeSwitcher />
              <LanguageSwitcher />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
