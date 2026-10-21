'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Loader2 } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';

export function Preloader() {
    const t = useTranslations('Preloader');
    const locale = useLocale();
    const [currentImageIndex, setCurrentImageIndex] = useState(0);

    const introImages = [
        "https://imgur.com/H17xof0.jpeg",
        "https://imgur.com/RKGndzF.jpeg",
        "https://imgur.com/nBNcqvg.jpeg",
        "https://imgur.com/4jOoBX2.jpeg"
    ];

    useEffect(() => {
        // Ses dosyasını oynat (tr.mp3, en.mp3, vb.)
        const audio = new Audio(`/${locale}.mp3`);
        audio.play().catch(e => console.warn("Ses otomatik oynatılamadı (Tarayıcı engeli):", e));
        
        return () => {
            audio.pause();
            audio.src = "";
        };
    }, [locale]);

    useEffect(() => {
        // Slayt geçişleri: Her görsel 1.3 saniye, döngüsüz
        if (currentImageIndex < introImages.length - 1) {
            const timer = setTimeout(() => {
                setCurrentImageIndex(prev => prev + 1);
            }, 1300);
            return () => clearTimeout(timer);
        }
    }, [currentImageIndex, introImages.length]);

    return (
        <div className="fixed inset-0 z-[999999] flex flex-col items-center justify-center bg-black overflow-hidden">
            {/* Background Slideshow */}
            <div className="absolute inset-0">
                {introImages.map((url, idx) => (
                    <div 
                        key={url}
                        className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${idx === currentImageIndex ? 'opacity-70 scale-105' : 'opacity-0 scale-100'}`}
                        style={{ transitionProperty: 'opacity, transform' }}
                    >
                        <Image 
                            src={url} 
                            alt="Background View" 
                            fill
                            sizes="100vw"
                            style={{ objectFit: 'cover' }}
                            priority
                        />
                    </div>
                ))}
                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40" />
            </div>

            {/* Content Overlay */}
            <div className="relative z-10 flex flex-col items-center text-center p-8 animate-fade-in-up">
                 <div className="relative w-24 h-24 md:w-32 md:h-32 mb-8 bg-white/10 backdrop-blur-md rounded-full border border-white/20 p-4 shadow-2xl flex items-center justify-center animate-float">
                      <Image 
                        src="/logo.png" 
                        alt="RotaTurk Logo" 
                        fill
                        style={{ objectFit: 'contain', padding: '15%' }}
                        className="drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]"
                    />
                 </div>
                
                <h1 className="text-5xl md:text-8xl font-black font-headline text-white tracking-tighter drop-shadow-2xl mb-2">
                    RotaTurk
                </h1>
                
                <div className="h-1 w-24 bg-primary rounded-full mb-6 shadow-[0_0_15px_rgba(167,243,208,0.8)]" />

                <p className="text-xl md:text-3xl font-bold text-white max-w-2xl px-4 drop-shadow-lg leading-tight">
                    {t('subtitle')}
                </p>

                <div className="mt-20 flex flex-col items-center gap-4">
                    <div className="flex items-center gap-3 text-white/90 font-bold bg-black/40 backdrop-blur-sm px-6 py-3 rounded-full border border-white/10">
                        <Loader2 className="h-5 w-5 animate-spin text-primary" />
                        <span className="tracking-widest uppercase text-xs">{t('loading')}</span>
                    </div>
                    
                    {/* Progress Indicator */}
                    <div className="flex gap-2 mt-4">
                        {introImages.map((_, idx) => (
                            <div 
                                key={idx} 
                                className={`h-1.5 transition-all duration-500 rounded-full ${idx === currentImageIndex ? 'w-8 bg-primary shadow-[0_0_8px_rgba(167,243,208,1)]' : 'w-2 bg-white/30'}`} 
                            />
                        ))}
                    </div>
                </div>
            </div>

            <style jsx global>{`
                @keyframes fade-in-up {
                    from { opacity: 0; transform: translateY(30px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in-up {
                    animation: fade-in-up 1s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
                }
            `}</style>
        </div>
    );
}
