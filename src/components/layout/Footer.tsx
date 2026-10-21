'use client';

import { useTranslations, useLocale } from 'next-intl';
import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Users, Shield, User, Phone } from 'lucide-react';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, updateDoc, increment, getDoc, setDoc } from 'firebase/firestore';
import Link from 'next/link';

export function Footer() {
  const [isMounted, setIsMounted] = useState(false);
  const [currentYear, setCurrentYear] = useState<number>(new Date().getFullYear());
  const t = useTranslations('Footer');
  const locale = useLocale();
  const db = useFirestore();
  const incrementedRef = useRef(false);

  const statsRef = useMemoFirebase(() => {
    if (!db) return null;
    return doc(db, 'metadata', 'visitors');
  }, [db]);

  const { data: stats } = useDoc(statsRef);
  
  const visitorCount = stats?.count || 1855;
  
  useEffect(() => {
    setIsMounted(true);

    if (db && !incrementedRef.current) {
      incrementedRef.current = true;
      const hasVisited = localStorage.getItem('rt_visited');
      
      if (!hasVisited) {
        const vRef = doc(db, 'metadata', 'visitors');
        getDoc(vRef).then((snap) => {
          if (!snap.exists()) {
            setDoc(vRef, { count: 1856 }).then(() => {
              localStorage.setItem('rt_visited', 'true');
            }).catch(() => {});
          } else {
            updateDoc(vRef, { count: increment(1) }).then(() => {
              localStorage.setItem('rt_visited', 'true');
            }).catch(() => {});
          }
        }).catch(() => {});
      }
    }
  }, [db]);
  
  return (
    <footer className="border-t bg-background mt-auto">
      <div className="container mx-auto px-4 py-16 flex flex-col items-center text-center text-muted-foreground text-sm gap-10">
        
        {isMounted && (
            <div className="bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl px-12 py-8 rounded-[3rem] border-4 border-primary/30 flex flex-col sm:flex-row items-center gap-8 animate-in fade-in zoom-in-95 duration-1000 shadow-[0_20px_80px_-15px_rgba(var(--primary-shadow),0.3)] group hover:border-primary/50 transition-all">
                <div className="bg-primary text-white p-6 rounded-[2rem] shadow-xl group-hover:rotate-6 group-hover:scale-110 transition-all duration-500 ring-4 ring-primary/20">
                    <Users size={48} />
                </div>
                <div className="flex flex-col items-center sm:items-start leading-none text-center sm:text-left space-y-2">
                    <span className="text-[12px] uppercase font-black tracking-[0.3em] text-primary mb-1">{t('visitorCountTitle')}</span>
                    <span className="text-5xl md:text-7xl font-black text-primary font-mono tracking-tighter drop-shadow-[0_2px_10px_rgba(var(--primary-shadow),0.4)] animate-pulse-slow">
                        {visitorCount.toLocaleString()}
                    </span>
                    <div className="h-1 w-full bg-primary/20 rounded-full overflow-hidden">
                        <div className="h-full bg-primary w-2/3 animate-progress-slow" />
                    </div>
                </div>
            </div>
        )}

        <div className={cn("space-y-4 max-w-2xl transition-opacity duration-300", isMounted ? "opacity-100" : "opacity-0")}>
            <p className="font-bold text-foreground/90 text-base">
              {t('copyright', { year: currentYear })}
            </p>
            
            <div className="bg-primary/5 p-6 rounded-3xl border border-primary/10 shadow-inner space-y-2">
              <div className="flex items-center justify-center gap-2 text-primary font-black uppercase text-xs tracking-widest mb-1">
                <User size={16} />
                {t('developerInfoTitle')}
              </div>
              <p className="font-medium text-foreground leading-relaxed">
                {t('developedBy')}{' '}
                <a 
                  href="https://wa.me/905432177581" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-primary font-bold hover:underline whitespace-nowrap inline-flex items-center gap-1"
                >
                  <Phone size={14} className="fill-primary/10" />
                  0543 217 75 81
                </a>
              </p>
            </div>

            <p className="font-medium text-xs">
              {t('contact')}
            </p>
            <div className="pt-2">
              <Link href={`/${locale}/privacy`} className="flex items-center justify-center gap-2 text-primary hover:underline font-bold">
                <Shield size={16} />
                {t('privacyPolicy')}
              </Link>
            </div>
        </div>
        
        <button 
          onClick={() => window.location.href = `/${locale}/admin`} 
          className="text-primary font-black uppercase text-[10px] tracking-[0.2em] hover:underline underline-offset-8 transition-all hover:scale-110 active:scale-95 bg-primary/5 px-6 py-2 rounded-full border border-primary/10"
        >
            {t('adminLogin')}
        </button>
      </div>

      <style jsx>{`
        @keyframes pulse-slow {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.85; }
        }
        @keyframes progress-slow {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-pulse-slow {
          animation: pulse-slow 3s ease-in-out infinite;
        }
        .animate-progress-slow {
          animation: progress-slow 4s linear infinite;
        }
      `}</style>
    </footer>
  );
}
