'use client';

import { FormEvent, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useAuth, useFirestore } from '@/firebase';
import {
  authenticateWithNameAndPassword,
  getNamePasswordAuthError,
  type NamePasswordMode,
} from '@/firebase/name-password-auth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface NamePasswordAuthFormProps {
  onAuthenticated?: () => void;
}

export function NamePasswordAuthForm({
  onAuthenticated,
}: NamePasswordAuthFormProps) {
  const auth = useAuth();
  const db = useFirestore();
  const { toast } = useToast();
  const [mode, setMode] = useState<NamePasswordMode>('sign-in');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
    if (fullName.length < 3) {
      toast({
        variant: 'destructive',
        title: 'Ad ve soyad gerekli',
        description: 'Lütfen adınızı ve soyadınızı girin.',
      });
      return;
    }

    if (mode === 'register' && password !== confirmPassword) {
      toast({
        variant: 'destructive',
        title: 'Şifreler eşleşmiyor',
        description: 'Lütfen iki şifre alanını da kontrol edin.',
      });
      return;
    }

    setIsLoading(true);
    try {
      await authenticateWithNameAndPassword({
        auth,
        db,
        fullName,
        password,
        mode,
      });
      toast({
        title: mode === 'register' ? 'Hesabınız oluşturuldu' : 'Giriş başarılı',
        description: 'Hoş geldiniz!',
      });
      onAuthenticated?.();
    } catch (error) {
      console.error('Ad-soyad ve şifre ile giriş yapılamadı:', error);
      toast({
        variant: 'destructive',
        title: mode === 'register' ? 'Hesap oluşturulamadı' : 'Giriş yapılamadı',
        description: getNamePasswordAuthError(error),
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 rounded-xl bg-muted p-1">
        <Button
          type="button"
          variant={mode === 'sign-in' ? 'default' : 'ghost'}
          className="rounded-lg"
          onClick={() => setMode('sign-in')}
        >
          Giriş yap
        </Button>
        <Button
          type="button"
          variant={mode === 'register' ? 'default' : 'ghost'}
          className="rounded-lg"
          onClick={() => setMode('register')}
        >
          Hesap oluştur
        </Button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="auth-first-name">Ad</Label>
            <Input
              id="auth-first-name"
              autoComplete="given-name"
              value={firstName}
              onChange={(event) => setFirstName(event.target.value)}
              required
              maxLength={60}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="auth-last-name">Soyad</Label>
            <Input
              id="auth-last-name"
              autoComplete="family-name"
              value={lastName}
              onChange={(event) => setLastName(event.target.value)}
              required
              maxLength={60}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="auth-password">Şifre</Label>
          <Input
            id="auth-password"
            type="password"
            autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            minLength={6}
            maxLength={128}
          />
        </div>
        {mode === 'register' && (
          <div className="space-y-2">
            <Label htmlFor="auth-confirm-password">Şifreyi tekrar girin</Label>
            <Input
              id="auth-confirm-password"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
              minLength={6}
              maxLength={128}
            />
          </div>
        )}
        <p className="text-xs leading-relaxed text-muted-foreground">
          E-posta istenmez. Aynı ad-soyadı kullanan kişiler aynı hesabı paylaşabilir. Şifre sıfırlama e-posta olmadan kullanılamaz.
        </p>
        <Button type="submit" className="h-12 w-full rounded-xl" disabled={isLoading}>
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {mode === 'register' ? 'Hesap oluştur' : 'Giriş yap'}
        </Button>
      </form>
    </div>
  );
}
