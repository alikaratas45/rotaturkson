'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useAuth } from '@/firebase';
import { collection, query, orderBy, addDoc, serverTimestamp, limit, doc, setDoc } from 'firebase/firestore';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Users, MessageSquare } from 'lucide-react';
import type { ActiveTraveler, ChatMessage } from '@/lib/types';
import { signInAnonymously } from 'firebase/auth';
import { useTranslations } from 'next-intl';

interface ChatDialogProps {
  targetTraveler: ActiveTraveler | null;
  onClose: () => void;
}

export function ChatDialog({ targetTraveler, onClose }: ChatDialogProps) {
  const { user } = useUser();
  const auth = useAuth();
  const db = useFirestore();
  const t = useTranslations('Chat');
  const [message, setMessage] = useState('');
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
    if (!message.trim() || !db || !targetTraveler || !roomId) return;

    let currentUser = user;
    if (!currentUser) {
      const cred = await signInAnonymously(auth);
      currentUser = cred.user;
    }

    const text = message;
    setMessage('');

    try {
      const messagesCol = collection(db, 'chats', roomId, 'messages');
      await addDoc(messagesCol, {
        senderId: currentUser.uid,
        senderName: currentUser.displayName || 'Gezgin',
        recipientId: targetTraveler.userId,
        text: text,
        timestamp: serverTimestamp(),
      });
      
      const roomRef = doc(db, 'chats', roomId);
      await setDoc(roomRef, {
        lastMessage: text,
        lastMessageAt: serverTimestamp(),
        participants: [currentUser.uid, targetTraveler.userId]
      }, { merge: true });

    } catch (err) {
      console.error("Message send error:", err);
    }
  };

  return (
    <Dialog open={!!targetTraveler} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px] h-[500px] flex flex-col p-0">
        <DialogHeader className="p-6 border-b">
          <DialogTitle className="flex items-center gap-2">
            <div className="bg-blue-100 p-2 rounded-full text-blue-600">
               <Users size={18} />
            </div>
            <span>{t('chatWith', { name: targetTraveler?.displayName })}</span>
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="flex-grow p-4">
          <div className="space-y-4">
            {messages?.length === 0 && (
              <div className="text-center py-10 text-muted-foreground">
                <MessageSquare className="mx-auto mb-2 opacity-20" size={48} />
                <p className="text-sm">{t('noMessages')}</p>
              </div>
            )}
            {messages?.map((msg) => (
              <div 
                key={msg.id} 
                className={`flex flex-col ${msg.senderId === user?.uid ? 'items-end' : 'items-start'}`}
              >
                <div className={`px-4 py-2 rounded-2xl max-w-[80%] text-sm ${
                  msg.senderId === user?.uid 
                    ? 'bg-primary text-primary-foreground rounded-tr-none' 
                    : 'bg-muted text-foreground rounded-tl-none'
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

        <form onSubmit={handleSendMessage} className="p-4 border-t flex gap-2">
          <Input 
            placeholder={t('placeholder')}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="flex-grow"
          />
          <Button type="submit" size="icon" disabled={!message.trim()}>
            <Send size={18} />
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}