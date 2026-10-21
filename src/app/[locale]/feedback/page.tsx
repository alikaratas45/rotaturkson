'use client';

import { FeedbackSection } from '@/components/feedback/FeedbackSection';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';

export default function FeedbackPage() {
  const t = useTranslations('FeedbackPage');
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <Button asChild variant="outline">
          <Link href="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('backToHome')}
          </Link>
        </Button>
      </div>
      <h1 className="text-3xl font-bold font-headline mb-2">{t('pageTitle')}</h1>
      <p className="text-muted-foreground mb-8">{t('pageSubtitle')}</p>
      <FeedbackSection displayMode="full" />
    </div>
  );
}
