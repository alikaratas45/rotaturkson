'use client';

import { useEffect } from 'react';
import { deleteDoc, doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { useFirestore, useUser } from '@/firebase';

export function OnlinePresence() {
  const { user } = useUser();
  const db = useFirestore();

  useEffect(() => {
    if (!user || !db) return;

    const presenceRef = doc(db, 'onlineUsers', user.uid);
    const displayName =
      user.displayName || `Gezgin ${user.uid.slice(-4).toUpperCase()}`;

    const updatePresence = () => {
      setDoc(
        presenceRef,
        {
          userId: user.uid,
          displayName,
          lastSeen: serverTimestamp(),
        },
        { merge: true }
      ).catch((error) => {
        console.error('Online presence update failed:', error);
      });
    };

    updatePresence();
    const interval = window.setInterval(updatePresence, 60_000);

    return () => {
      window.clearInterval(interval);
      deleteDoc(presenceRef).catch((error) => {
        console.error('Online presence cleanup failed:', error);
      });
    };
  }, [db, user]);

  return null;
}
