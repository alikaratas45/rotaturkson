
'use client';

import { useMemo, useState, useEffect } from 'react';
import { AlertTriangle, Pin, Trash2, MessageSquare, Reply, Send, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { formatDistanceToNow } from 'date-fns';
import { tr, enUS, fr, de } from 'date-fns/locale';
import { useLocale, useTranslations } from 'next-intl';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { useToast } from '@/hooks/use-toast';
import type { Feedback } from '@/lib/types';
import {
  collection,
  query,
  orderBy,
  doc,
  deleteDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { cn } from '@/lib/utils';
import Link from 'next/link';

const FeedbackItemSkeleton = () => (
  <Card className="p-4">
    <div className="flex justify-between items-start">
      <div className="flex-1 min-w-0">
          <Skeleton className="h-4 w-24 mb-2" />
          <Skeleton className="h-4 w-full" />
      </div>
      <Skeleton className="h-4 w-16" />
    </div>
  </Card>
);

interface FeedbackListProps {
  onFeedbackDeleted: () => void;
  displayMode: 'home' | 'full';
}

const ITEMS_PER_PAGE = 10;

const getLocale = (loc: string) => {
    switch (loc) {
        case 'tr': return tr;
        case 'fr': return fr;
        case 'de': return de;
        default: return enUS;
    }
}

export function FeedbackList({ onFeedbackDeleted, displayMode }: FeedbackListProps) {
  const { user } = useUser();
  const firestore = useFirestore();
  const locale = useLocale();
  const t = useTranslations('FeedbackSection');
  const { toast } = useToast();
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);

  const feedbackQuery = useMemoFirebase(
    () => {
      if (!firestore) return null;
      return query(collection(firestore, 'feedback'), orderBy('createdAt', 'desc'));
    },
    [firestore]
  );
  
  const { data: allFeedback, isLoading, error } = useCollection<Feedback>(feedbackQuery);

  useEffect(() => {
    if (user?.email === 'alikaratas4564@rotaturk.net') {
      setIsAdmin(true);
    } else {
      setIsAdmin(false);
    }
  }, [user]);
  
  const handleDelete = async (id: string) => {
    if (!firestore) return;
    try {
        const feedbackRef = doc(firestore, 'feedback', id);
        await deleteDoc(feedbackRef);
        toast({ title: t('deleteSuccess') });
        onFeedbackDeleted();
    } catch (error: any) {
        toast({ variant: 'destructive', title: t('deleteError'), description: error.message });
    }
  };

  const handleReplySubmit = async (feedbackId: string) => {
    if (!firestore || !replyText.trim()) return;
    setIsSubmittingReply(true);
    try {
        const feedbackRef = doc(firestore, 'feedback', feedbackId);
        await updateDoc(feedbackRef, {
            reply: replyText.trim(),
            repliedAt: serverTimestamp(),
        });
        toast({ title: t('replySuccess') });
        setReplyingTo(null);
        setReplyText('');
    } catch (error: any) {
        toast({ variant: 'destructive', title: t('replyError'), description: error.message });
    } finally {
        setIsSubmittingReply(false);
    }
  };
  
  const canDelete = (feedback: Feedback) => {
    if (isAdmin) return true;
    if (user && feedback.userId === user.uid) return true;
    return false;
  }

  const { pinnedFeedback, paginatedFeedback, totalPages } = useMemo(() => {
    if (!allFeedback || allFeedback.length === 0) {
      return { pinnedFeedback: null, paginatedFeedback: [], totalPages: 0 };
    }
    
    // Find the comment with id "commentToPin" or just pin the last one as a fallback
    const commentToPin = allFeedback[allFeedback.length - 1];
    const otherFeedback = allFeedback.filter(f => f.id !== commentToPin.id);
    
    if (displayMode === 'home') {
      return { pinnedFeedback: commentToPin, paginatedFeedback: otherFeedback.slice(0, 4), totalPages: 1 };
    }
    
    const total = Math.ceil(allFeedback.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const paginated = allFeedback.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    return { pinnedFeedback: null, paginatedFeedback: paginated, totalPages: total };

  }, [allFeedback, currentPage, displayMode]);

  if (isLoading) {
    return (
      <div className="space-y-4 mt-8">
        {[...Array(5)].map((_, i) => <FeedbackItemSkeleton key={i} />)}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-8 border-dashed border-2 border-destructive/50 rounded-xl mt-8">
        <AlertTriangle className="h-8 w-8 text-destructive mx-auto mb-2" />
        <h3 className="text-lg font-semibold text-destructive">{t('loadErrorTitle')}</h3>
        <p className="text-muted-foreground">{error.message || t('loadErrorDesc')}</p>
      </div>
    );
  }

  const renderFeedbackItem = (feedback: Feedback, isPinned = false) => {
    const dateLocale = getLocale(locale);
    const isReplying = replyingTo === feedback.id;

    return (
      <Card key={feedback.id} className={cn("p-6 transition-all border-white/40", isPinned && "border-primary/40 bg-primary/5 shadow-inner")}>
        <div className="flex flex-col">
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="bg-primary/10 p-2 rounded-full text-primary">
                 <MessageSquare className="h-5 w-5" />
              </div>
              <div>
                <p className="font-bold text-lg text-foreground">{feedback.name}</p>
                <p className="text-xs text-muted-foreground">
                    {feedback.createdAt?.seconds ? formatDistanceToNow(new Date(feedback.createdAt.seconds * 1000), { addSuffix: true, locale: dateLocale }) : ''}
                </p>
              </div>
              {isPinned && (
                <div className="flex items-center gap-1 text-[10px] text-primary font-bold bg-primary/10 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  <Pin className="h-3 w-3" /> <span>{t('pinnedComment')}</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-1">
              {isAdmin && (
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-primary hover:bg-primary/10"
                    onClick={() => {
                        setReplyingTo(isReplying ? null : feedback.id);
                        setReplyText(feedback.reply || '');
                    }}
                >
                    <Reply className="h-4 w-4" />
                </Button>
              )}
              {canDelete(feedback) && <DeleteButton feedbackId={feedback.id} onDelete={handleDelete} />}
            </div>
          </div>
          
          <p className="text-sm leading-relaxed text-muted-foreground mb-4 pl-12 italic">"{feedback.message}"</p>

          {feedback.reply && (
              <div className="mt-2 ml-12 p-4 bg-muted/30 rounded-xl border-l-4 border-primary/40 relative">
                  <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-bold text-primary uppercase tracking-tighter bg-primary/10 px-2 py-0.5 rounded-full">
                          {t('adminReplyLabel')}
                      </span>
                      {feedback.repliedAt && (
                          <span className="text-[9px] text-muted-foreground">
                             {formatDistanceToNow(new Date(feedback.repliedAt.seconds * 1000), { addSuffix: true, locale: dateLocale })}
                          </span>
                      )}
                  </div>
                  <p className="text-xs font-medium text-foreground">{feedback.reply}</p>
              </div>
          )}

          {isReplying && (
              <div className="mt-4 ml-12 space-y-3 animate-in fade-in slide-in-from-top-2">
                  <Input 
                    placeholder={t('replyPlaceholder')}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    className="text-sm"
                  />
                  <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        onClick={() => handleReplySubmit(feedback.id)} 
                        disabled={isSubmittingReply || !replyText.trim()}
                      >
                          {isSubmittingReply ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : <Send className="h-3 w-3 mr-2" />}
                          {t('saveReply')}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setReplyingTo(null)}>
                          {t('cancel')}
                      </Button>
                  </div>
              </div>
          )}
        </div>
      </Card>
    );
  }

  return (
    <div className="animate-in fade-in duration-700">
      <div className="space-y-6 mt-4">
        {displayMode === 'home' && pinnedFeedback && renderFeedbackItem(pinnedFeedback, true)}
        {paginatedFeedback.length > 0 ? (
          paginatedFeedback.map((feedback) => renderFeedbackItem(feedback))
        ) : ( displayMode === 'full' &&
          <p className="text-center text-muted-foreground py-12">{t('noComments')}</p>
        )}
      </div>

      {displayMode === 'home' && allFeedback && allFeedback.length > 5 && (
        <div className="mt-8 text-center">
            <Button asChild variant="outline" className="rounded-full shadow-sm hover:shadow-md transition-all">
                <Link href={`/${locale}/feedback`}>{t('seeMoreComments')}</Link>
            </Button>
        </div>
      )}

      {displayMode === 'full' && totalPages > 1 && (
        <div className="mt-8 flex justify-center items-center gap-4">
          <Button variant="ghost" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
            {t('previousPage')}
          </Button>
          <span className="text-sm font-bold text-primary bg-primary/10 px-4 py-2 rounded-full">
            {currentPage} / {totalPages}
          </span>
          <Button variant="ghost" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
            {t('nextPage')}
          </Button>
        </div>
      )}
    </div>
  );
}

const DeleteButton = ({ feedbackId, onDelete }: { feedbackId: string, onDelete: (id: string) => void }) => {
    const t = useTranslations('FeedbackSection');
    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10">
                <Trash2 className="h-4 w-4" />
            </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="rounded-2xl">
            <AlertDialogHeader>
                <AlertDialogTitle>{t('deleteConfirmTitle')}</AlertDialogTitle>
                <AlertDialogDescription>{t('deleteConfirmDesc')}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel className="rounded-xl">{t('cancel')}</AlertDialogCancel>
                <AlertDialogAction onClick={() => onDelete(feedbackId)} className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90">{t('delete')}</AlertDialogAction>
            </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}
