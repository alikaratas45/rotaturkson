'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Loader2, RefreshCw, Users } from 'lucide-react';
import { useFirestore, useUser } from '@/firebase';
import { ADMIN_EMAIL } from '@/lib/admin';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { collection, getDocs } from 'firebase/firestore';

interface RegisteredUser {
  id: string;
  displayName: string;
  firstName?: string;
  lastName?: string;
}

export default function AdminUsersPage() {
  const db = useFirestore();
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const locale = useLocale();
  const { toast } = useToast();
  const [users, setUsers] = useState<RegisteredUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const snapshot = await getDocs(collection(db, 'users'));
      const registeredUsers = snapshot.docs
        .map((userDoc) => {
          const data = userDoc.data();
          const fullName =
            typeof data.displayName === 'string' ? data.displayName.trim() : '';
          const firstName =
            typeof data.firstName === 'string' ? data.firstName.trim() : '';
          const lastName =
            typeof data.lastName === 'string' ? data.lastName.trim() : '';

          return {
            id: userDoc.id,
            displayName: fullName || `${firstName} ${lastName}`.trim(),
            firstName,
            lastName,
          };
        })
        .filter((registeredUser) => registeredUser.displayName.length > 0)
        .sort((a, b) => a.displayName.localeCompare(b.displayName, 'tr'));

      setUsers(registeredUsers);
    } catch (error) {
      console.error('Kullanıcı isim listesi yüklenemedi:', error);
      toast({
        variant: 'destructive',
        title: 'Kullanıcılar yüklenemedi',
        description: 'Firestore erişimini kontrol edip tekrar deneyin.',
      });
    } finally {
      setIsLoading(false);
    }
  }, [db, toast]);

  useEffect(() => {
    if (isUserLoading) return;
    if (!user || user.email !== ADMIN_EMAIL) {
      router.replace(`/${locale}/admin`);
      return;
    }
    void loadUsers();
  }, [user, isUserLoading, locale, router, loadUsers]);

  if (isUserLoading || !user || user.email !== ADMIN_EMAIL) {
    return (
      <div className="container flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" aria-label="Yükleniyor" />
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-10 md:py-14">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-primary">
            <Users className="h-4 w-4" /> Yönetici paneli
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">Kullanıcı isimleri</h1>
          <p className="mt-2 text-muted-foreground">
            Giriş yapmış kullanıcılar: {users.length}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => void loadUsers()} disabled={isLoading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Yenile
          </Button>
          <Button variant="outline" asChild>
            <Link href={`/${locale}/admin/dashboard`}>Yönetim paneline dön</Link>
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden rounded-2xl">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex min-h-48 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : users.length === 0 ? (
            <p className="py-16 text-center text-muted-foreground">
              Henüz isim bilgisi olan kullanıcı bulunmuyor.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-20">#</TableHead>
                  <TableHead>Ad Soyad</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((registeredUser, index) => (
                  <TableRow key={registeredUser.id}>
                    <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                    <TableCell className="font-medium">{registeredUser.displayName}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
