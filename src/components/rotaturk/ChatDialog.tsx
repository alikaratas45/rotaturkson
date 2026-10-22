'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useAuth } from '@/firebase';
import { collection, query, orderBy, addDoc, serverTimestamp, limit, doc, setDoc } from 'firebase/firestore';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Users, MessageSquare, Circle } from 'lucide-react';
import type { ActiveTraveler, ChatMessage } from '@/lib/types';
import { signInAnonymously } from 'firebase/auth';
import { useTranslations } from 'next-intl';
import { useToast } from '@/hooks/use-toast';

interface ChatDialogProps {
  targetTraveler: ActiveTraveler | null;
  onClose: () => void;
}

export function ChatDialog({ targetTraveler, onClose }: ChatDialogProps) {
  const { user } = useUser();
  const auth = useAuth();
  const db = useFirestore();
  const t = useTranslations('Chat');
  const { toast } = useToast();
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Oda ID'sini her iki kullanıcı ID'sine göre sıralayıp oluşturuyoruz
  const roomId = useMemo(() => {
    if (!user || !targetTraveler) return null;
    const ids = [user.uid, targetTraveler.userId].sort();
    return `${ids[0]}_${ids[1]}`;
  }, [user, targetTraveler]);

  const messagesQuery = useMemoFirebase(() => {
    if (!db || !roomId) return null;
    return query(
      collection(db, 'chats', roomId, 'messages'),
      orderBy('timestamp', 'asc'),
      limit(100)
    );
  }, [db, roomId]);

  const { data: messages } = useCollection<ChatMessage>(messagesQuery);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = message.trim();
    if (!text || !db || !targetTraveler || isSending) return;

    setIsSending(true);
    try {
      let currentUser = user;
      if (!currentUser) {
        const cred = await signInAnonymously(auth);
        currentUser = cred.user;
      }
      if (currentUser.uid === targetTraveler.userId) return;

      const participants = [currentUser.uid, targetTraveler.userId].sort();
      const currentRoomId = `${participants[0]}_${participants[1]}`;
      const roomRef = doc(db, 'chats', currentRoomId);
      await setDoc(
        roomRef,
        {
          participants,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      const messagesCol = collection(db, 'chats', currentRoomId, 'messages');
      await addDoc(messagesCol, {
        senderId: currentUser.uid,
        senderName: currentUser.displayName || `Gezgin ${currentUser.uid.slice(-4).toUpperCase()}`,
        recipientId: targetTraveler.userId,
        text: text,
        timestamp: serverTimestamp(),
      });
      
      await setDoc(roomRef, {
        lastMessage: text,
        lastMessageAt: serverTimestamp(),
      }, { merge: true });
      setMessage('');
    } catch (err) {
      console.error('Message send error:', err);
      toast({ variant: 'destructive', title: t('sendError') });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={!!targetTraveler} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex h-[min(620px,90vh)] flex-col gap-0 overflow-hidden border-0 p-0 shadow-2xl sm:max-w-[440px] sm:rounded-3xl">
        <DialogHeader className="border-b bg-gradient-to-r from-primary/10 via-background to-emerald-500/10 p-5 pr-12">
          <DialogTitle className="flex items-center gap-2">
            <div className="relative rounded-full bg-gradient-to-br from-primary to-emerald-500 p-2.5 text-white shadow-md">
               <Users size={19} />
               <Circle className="absolute bottom-0 right-0 h-3 w-3 fill-emerald-500 text-white" />
            </div>
            <span>{t('chatWith', { name: targetTraveler?.displayName })}</span>
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="min-h-0 flex-grow bg-gradient-to-b from-background to-muted/30 p-4">
          <div className="space-y-4 py-2">
            {messages?.length === 0 && (
              <div className="py-14 text-center text-muted-foreground">
                <span className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <MessageSquare size={26} />
                </span>
                <p className="text-sm">{t('noMessages')}</p>
              </div>
            )}
            {messages?.map((msg) => (
              <div 
                key={msg.id} 
                className={`flex flex-col ${msg.senderId === user?.uid ? 'items-end' : 'items-start'}`}
              >
                <div className={`max-w-[82%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                  msg.senderId === user?.uid 
                    ? 'rounded-tr-md bg-primary text-primary-foreground'
                    : 'rounded-tl-md border bg-card text-foreground'
                }`}>
                  {msg.text}
                </div>
                <span className="text-[10px] text-muted-foreground mt-1 px-1">
                   {msg.senderName}
                </span>
              </div>
            ))}
            <div ref={scrollRef} />
          </div>
        </ScrollArea>

        <form onSubmit={handleSendMessage} className="flex gap-2 border-t bg-background p-4">
          <Input 
            placeholder={t('placeholder')}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={1000}
            className="h-11 flex-grow rounded-full bg-muted/50 px-4"
          />
          <Button type="submit" size="icon" className="h-11 w-11 rounded-full shadow-md" disabled={!message.trim() || isSending}>
            <Send size={18} />
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}