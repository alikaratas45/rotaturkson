'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  collection,
  limit,
  query,
  Timestamp,
  where,
} from 'firebase/firestore';
import { useLocale, useTranslations } from 'next-intl';
import { useFirestore, useMemoFirebase, useUser, useCollection } from '@/firebase';
import type { ActiveTraveler } from '@/lib/types';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MessageCircle, Users, Circle } from 'lucide-react';

interface OnlineUser {
  userId: string;
  displayName: string;
  lastSeen: Timestamp;
}

interface CommunityHubProps {
  onChat: (traveler: ActiveTraveler) => void;
}

export function CommunityHub({ onChat }: CommunityHubProps) {
  const [open, setOpen] = useState(false);
  const [now, setNow] = useState(Date.now());
  const { user } = useUser();
  const db = useFirestore();
  const locale = useLocale();
  const t = useTranslations('Community');

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(interval);
  }, []);

  const onlineUsersQuery = useMemoFirebase(() => {
    if (!db) return null;
    const recentCutoff = Timestamp.fromDate(new Date(Date.now() - 2 * 60_000));
    return query(
      collection(db, 'onlineUsers'),
      where('lastSeen', '>', recentCutoff),
      limit(100)
    );
  }, [db]);
  const { data: onlineUsers, isLoading: isLoadingUsers, error: usersError } =
    useCollection<OnlineUser>(onlineUsersQuery);

  const otherOnlineUsers = useMemo(
    () =>
      (onlineUsers || []).filter(
        (onlineUser) =>
          onlineUser.userId !== user?.uid &&
          onlineUser.lastSeen instanceof Timestamp &&
          onlineUser.lastSeen.toMillis() > now - 2 * 60_000
      ),
    [onlineUsers, user, now]
  );

  const startChat = (onlineUser: OnlineUser) => {
    onChat({
      id: onlineUser.userId,
      userId: onlineUser.userId,
      displayName: onlineUser.displayName,
      latitude: 0,
      longitude: 0,
      lastUpdated: onlineUser.lastSeen,
    });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="h-12 rounded-full border-primary/40 px-6 font-bold text-primary shadow-md hover:bg-primary/5"
        >
          <Users className="mr-2 h-5 w-5" />
          {t('openHub')}
          {!!otherOnlineUsers.length && (
            <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700">
              {otherOnlineUsers.length}
            </span>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="flex h-[min(680px,90vh)] flex-col gap-0 overflow-hidden p-0 sm:max-w-xl">
        <DialogHeader className="border-b bg-gradient-to-r from-primary/10 via-background to-emerald-500/10 p-6 pr-12">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <span className="rounded-xl bg-primary p-2 text-primary-foreground">
              <Users className="h-5 w-5" />
            </span>
            {t('title')}
          </DialogTitle>
          <DialogDescription>{t('subtitle')}</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="online" className="flex min-h-0 flex-1 flex-col">
          <TabsList className="mx-6 mt-4 grid w-auto grid-cols-1">
            <TabsTrigger value="online" className="gap-2">
              <MessageCircle className="h-4 w-4" />
              {t('onlineTab')}
              <span className="rounded-full bg-emerald-100 px-1.5 text-xs text-emerald-700">
                {otherOnlineUsers.length}
              </span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="online" className="mt-0 min-h-0 flex-1 px-6 pb-6 pt-4">
            <ScrollArea className="h-full pr-3">
              {usersError ? (
                <p className="rounded-xl bg-destructive/10 p-4 text-sm text-destructive">
                  {t('loadError')}
                </p>
              ) : isLoadingUsers ? (
                <p className="py-10 text-center text-sm text-muted-foreground">{t('loading')}</p>
              ) : otherOnlineUsers.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-14 text-center">
                  <span className="rounded-full bg-muted p-4 text-muted-foreground">
                    <Users className="h-7 w-7" />
                  </span>
                  <p className="font-semibold">{t('noOnlineTitle')}</p>
                  <p className="max-w-xs text-sm text-muted-foreground">{t('noOnlineDesc')}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {otherOnlineUsers.map((onlineUser) => (
                    <button
                      key={onlineUser.userId}
                      type="button"
                      onClick={() => startChat(onlineUser)}
                      className="group flex w-full items-center gap-3 rounded-2xl border bg-card p-3 text-left transition hover:border-primary/30 hover:bg-primary/[0.03] hover:shadow-sm"
                    >
                      <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-emerald-500 font-bold text-white">
                        {onlineUser.displayName.slice(0, 1).toLocaleUpperCase(locale)}
                        <Circle className="absolute bottom-0 right-0 h-3.5 w-3.5 fill-emerald-500 text-white" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold">{onlineUser.displayName}</span>
                        <span className="text-xs text-emerald-700">{t('onlineNow')}</span>
                      </span>
                      <span className="flex items-center gap-2 rounded-full bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground opacity-90 transition group-hover:opacity-100">
                        <MessageCircle className="h-4 w-4" />
                        {t('chat')}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
