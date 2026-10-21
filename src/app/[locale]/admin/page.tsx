'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { useAuth } from '@/firebase';
import { useRouter, useParams } from 'next/navigation';
import { Loader2, Lock } from 'lucide-react';

const LoginSchema = z.object({
  username: z.string().min(1, 'Kullanıcı adı gerekli.'),
  password: z.string().min(1, 'Şifre gerekli.'),
});

export default function AdminLoginPage() {
  const { toast } = useToast();
  const auth = useAuth();
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof LoginSchema>>({
    resolver: zodResolver(LoginSchema),
    defaultValues: {
      username: '',
      password: '',
    },
  });

  async function onSubmit(data: z.infer<typeof LoginSchema>) {
    setIsLoading(true);
    try {
      const email = `${data.username}@rotaturk.net`;
      
      try {
        // 1. Giriş yapmayı dene
        await signInWithEmailAndPassword(auth, email, data.password);
      } catch (signInError: any) {
        // 2. Eğer kullanıcı yoksa (veya bilgiler hatalıysa ama biz prototipteyiz), 
        // belirttiğiniz özel bilgilerle kayıt oluşturmayı dene (Sadece bu proje için kolaylık)
        if (data.username === 'alikaratas4564' && data.password === '758211') {
            try {
                await createUserWithEmailAndPassword(auth, email, data.password);
            } catch (createError) {
                // Eğer kayıt da başarısız olursa (örneğin kullanıcı zaten var ama şifre yanlış) asıl hatayı fırlat
                throw signInError;
            }
        } else {
            throw signInError;
        }
      }
      
      toast({ title: 'Giriş Başarılı', description: 'Yönetim paneline yönlendiriliyorsunuz.' });
      router.push(`/${locale}/admin/dashboard`);
    } catch (error: any) {
      console.error("Login Error:", error);
      toast({
        variant: 'destructive',
        title: 'Giriş Başarısız',
        description: 'Kullanıcı adı veya şifre hatalı.',
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="container mx-auto px-4 py-20 flex justify-center items-center min-h-[80vh]">
      <Card className="w-full max-w-md shadow-2xl border-primary/20">
        <CardHeader className="text-center">
          <div className="mx-auto bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mb-4 text-primary">
            <Lock size={32} />
          </div>
          <CardTitle className="text-3xl font-bold font-headline">Yönetici Girişi</CardTitle>
          <CardDescription>RotaTurk yönetim paneline erişmek için bilgilerinizi girin.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kullanıcı Adı</FormLabel>
                    <FormControl>
                      <Input placeholder="Kullanıcı adınızı girin..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Şifre</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="******" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full h-12" disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : 'Giriş Yap'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
