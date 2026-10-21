'use client';

import { useEffect, useState } from 'react';
import { useUser, useFirestore, useAuth } from '@/firebase';
import { collectionGroup, query, where, onSnapshot, Timestamp, limit } from 'firebase/firestore';
import { useTranslations } from 'next-intl';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Mail, MessageSquare, X, BellRing } from 'lucide-react';
import { signInAnonymously } from 'firebase/auth';

/**
 * Kullanıcıya gelen yeni mesajları dinleyen ve ekranın ortasında büyük, 
 * dikkat çekici bir görsel uyarı gösteren bileşen.
 */
export function MessageNotificationListener() {
  const { user } = useUser();
  const auth = useAuth();
  const db = useFirestore();
  const t = useTranslations('Chat');
  const [incomingMessage, setIncomingMessage] = useState<any>(null);
  const [showNotification, setShowIncomingNotification] = useState(false);

  // Mesaj alabilmek için kullanıcının bir UID'si olması şart.
  // Kullanıcı henüz giriş yapmamışsa (anonim veya e-posta), otomatik anonim giriş yapılır.
  useEffect(() => {
    if (!auth || user) return;
    
    // Kısa bir gecikme ile (sayfa yüklendikten sonra) anonim girişi tetikle
    const timer = setTimeout(() => {
        signInAnonymously(auth).catch(err => console.warn("Anonim giriş hatası:", err));
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [auth, user]);

  useEffect(() => {
    if (!db || !user) return;

    // Sadece dinleyici başladığı andan itibaren gelen yeni mesajları dinle
    const startTime = Timestamp.now();

    const messagesQuery = query(
      collectionGroup(db, 'messages'),
      where('recipientId', '==', user.uid),
      where('timestamp', '>', startTime),
      limit(1)
    );

    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const msg = change.doc.data();
          
          // Ayarları kontrol et (Kullanıcı bildirimleri kapatmış mı?)
          const notificationsEnabled = localStorage.getItem('rt-message-notifications') !== 'false';
          
          if (notificationsEnabled) {
            setIncomingMessage(msg);
            setShowIncomingNotification(true);

            // Bildirim geldiğinde tarayıcı odaklı bir ses uyarısı denemesi
            try {
                const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3');
                audio.volume = 0.5;
                audio.play().catch(() => {});
            } catch (e) {}
          }
        }
      });
    }, (error) => {
      console.warn("Mesaj dinleyici hatası (Muhtemelen index eksikliği):", error.message);
    });

    return () => unsubscribe();
  }, [db, user]);

  const handleViewMessage = () => {
    if (!incomingMessage) return;
    
    // Bildirimi kapat
    setShowIncomingNotification(false);

    // Global bir event yayınlayarak page.tsx'in chat dialog'unu açmasını sağlarız
    window.dispatchEvent(new CustomEvent('open-chat', { 
        detail: { 
            userId: incomingMessage.senderId, 
            displayName: incomingMessage.senderName 
        } 
    }));
  };

  return (
    <Dialog open={showNotification} onOpenChange={setShowIncomingNotification}>
      <DialogContent className="sm:max-w-[480px] p-0 border-none bg-transparent shadow-none">
        <div className="relative bg-white dark:bg-zinc-900 rounded-[3.5rem] p-10 shadow-[0_40px_120px_-20px_rgba(0,0,0,0.4)] border-[6px] border-primary/10 overflow-visible animate-in zoom-in-95 duration-500">
          
          {/* Kapatma Butonu (Üst Köşe) */}
          <button 
            onClick={() => setShowIncomingNotification(false)}
            className="absolute -top-3 -right-3 bg-zinc-100 dark:bg-zinc-800 p-3 rounded-full shadow-lg hover:scale-110 transition-transform z-10"
          >
            <X size={20} className="text-zinc-500" />
          </button>

          <div className="flex flex-col items-center gap-10">
            {/* Animasyonlu İkon Alanı */}
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 rounded-full blur-[60px] animate-pulse scale-150" />
              <div className="relative bg-gradient-to-br from-primary via-primary to-emerald-400 text-white p-12 rounded-full shadow-[0_20px_50px_rgba(var(--primary-shadow),0.4)] animate-bounce-slow">
                <Mail size={84} strokeWidth={1} />
                <div className="absolute -top-2 -right-2 bg-rose-500 text-white p-2 rounded-full border-4 border-white animate-pulse">
                    <BellRing size={24} />
                </div>
              </div>
            </div>
            
            <div className="space-y-4 text-center">
              <h2 className="text-4xl font-black font-headline text-primary tracking-tighter leading-none">
                {t('newMessageTitle')}
              </h2>
              <div className="space-y-1">
                <p className="text-xl font-bold text-zinc-800 dark:text-zinc-100">
                   {incomingMessage?.senderName}
                </p>
                <div className="bg-zinc-50 dark:bg-zinc-800/50 p-6 rounded-3xl border border-zinc-100 dark:border-zinc-700 relative mt-4">
                    <span className="absolute -top-3 left-6 bg-white dark:bg-zinc-900 px-3 text-[10px] font-bold text-primary uppercase tracking-widest border border-zinc-100 dark:border-zinc-700 rounded-full">Mesaj</span>
                    <p className="text-zinc-600 dark:text-zinc-300 italic font-medium leading-relaxed">
                        "{incomingMessage?.text}"
                    </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
              <Button 
                variant="ghost" 
                className="rounded-full font-bold h-16 text-lg text-muted-foreground hover:bg-zinc-100 dark:hover:bg-zinc-800" 
                onClick={() => setShowIncomingNotification(false)}
              >
                  {t('close')}
              </Button>
              <Button 
                className="rounded-full font-black h-16 text-xl shadow-[0_15px_30px_-10px_rgba(var(--primary-shadow),0.6)] active:scale-95 transition-all" 
                onClick={handleViewMessage}
              >
                  <MessageSquare className="mr-3 h-6 w-6" />
                  {t('view')}
              </Button>
            </div>
          </div>
        </div>

        <style jsx global>{`
            @keyframes bounce-slow {
                0%, 100% { transform: translateY(0); }
                50% { transform: translateY(-20px); }
            }
            .animate-bounce-slow {
                animation: bounce-slow 3s ease-in-out infinite;
            }
        `}</style>
      </DialogContent>
    </Dialog>
  );
}
