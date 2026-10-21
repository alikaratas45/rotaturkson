'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { z } from 'zod';
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
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import {
  collection,
  serverTimestamp,
  addDoc
} from 'firebase/firestore';
import { useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { useState } from 'react';

const FeedbackFormSchema = z.object({
  name: z.string().min(2, 'İsim en az 2 karakter olmalıdır.'),
  message: z.string().min(10, 'Mesajınız en az 10 karakter olmalıdır.').max(500, 'Mesajınız en fazla 500 karakter olabilir.'),
});

type FeedbackFormValues = z.infer<typeof FeedbackFormSchema>;

interface FeedbackFormProps {
  onFeedbackSubmitted: () => void;
}

export function FeedbackForm({ onFeedbackSubmitted }: FeedbackFormProps) {
  const { toast } = useToast();
  const t = useTranslations('FeedbackSection');
  const t_general = useTranslations('General');
  const firestore = useFirestore();
  const { user } = useUser();
  const feedbackColRef = useMemoFirebase(
    () => (firestore ? collection(firestore, 'feedback') : null),
    [firestore]
  );
  
  const form = useForm<FeedbackFormValues>({
    resolver: zodResolver(FeedbackFormSchema),
    defaultValues: {
      name: '',
      message: '',
    },
  });

  const { isSubmitting } = form.formState;

  const onSubmit: SubmitHandler<FeedbackFormValues> = async (data) => {
    if (!feedbackColRef) return;
    
    try {
      await addDoc(feedbackColRef, {
        ...data,
        userId: user ? user.uid : null, // Add userId to the document
        createdAt: serverTimestamp(),
      });
      toast({
        title: t('feedbackSuccessTitle'),
        description: t('feedbackSuccessDesc'),
      });
      form.reset();
      onFeedbackSubmitted();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: t_general('error'),
        description: error.message || t('feedbackErrorDesc'),
      });
    }
  };

  return (
    <div className="w-full">
      <h3 className="text-2xl font-bold font-headline">{t('formTitle')}</h3>
      <p className="text-muted-foreground mb-6">{t('formSubtitle')}</p>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('nameLabel')}</FormLabel>
                <FormControl>
                  <Input placeholder={t('namePlaceholder')} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="message"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('messageLabel')}</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder={t('messagePlaceholder')}
                    className="resize-none"
                    rows={4}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('submitButton')}
          </Button>
        </form>
      </Form>
    </div>
  );
}