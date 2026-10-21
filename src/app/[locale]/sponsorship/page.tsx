'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { useTranslations } from 'next-intl';
import { ArrowLeft, Building, Download, Mail, Phone, Target } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

export default function SponsorshipPage() {
    const bannerImage = PlaceHolderImages.find((img) => img.id === 'sponsorship-banner');
    const t = useTranslations('SponsorshipPage');
    
    const handleDownload = () => {
        const link = document.createElement('a');
        link.href = '/Sponsorluk-Teklifi.pdf';
        link.download = 'Sponsorluk-Teklifi.pdf';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <Button asChild variant="outline" className="mb-6">
                <Link href="/">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    {t('backToMenu')}
                </Link>
            </Button>
            <div className="relative text-left rounded-xl overflow-hidden mb-8 shadow-lg">
                {bannerImage && (
                <Image
                    src={bannerImage.imageUrl}
                    alt={bannerImage.description}
                    width={1200}
                    height={300}
                    className="w-full h-48 object-cover"
                    data-ai-hint={bannerImage.imageHint}
                />
                )}
                <div className="absolute inset-0 bg-black/50 flex flex-col items-start justify-center p-8">
                    <h1 className="text-3xl md:text-4xl font-bold text-white font-headline">{t('title')}</h1>
                    <p className="mt-2 text-lg text-gray-200">{t('subtitle')}</p>
                </div>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-6">
                    <h2 className="text-2xl md:text-3xl font-bold">{t('whyUsTitle')}</h2>
                    <p className="text-muted-foreground leading-relaxed">
                    {t('whyUsDescription')}
                    </p>

                    <div className="space-y-4">
                        <div className="flex items-start gap-4">
                            <div className="bg-primary/10 text-primary p-2 rounded-lg">
                                <Target className="h-6 w-6" />
                            </div>
                            <div>
                                <h3 className="font-semibold">{t('rightAudienceTitle')}</h3>
                                <p className="text-sm text-muted-foreground">{t('rightAudienceDescription')}</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-4">
                            <div className="bg-primary/10 text-primary p-2 rounded-lg">
                                <Building className="h-6 w-6" />
                            </div>
                            <div>
                                <h3 className="font-semibold">{t('localPromotionTitle')}</h3>
                                <p className="text-sm text-muted-foreground">{t('localPromotionDescription')}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <Card className="shadow-xl">
                    <CardHeader>
                        <CardTitle>{t('contactTitle')}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p>{t('contactDescription')}</p>
                        
                        <Button className="w-full" onClick={handleDownload}>
                            <Download className="mr-2 h-4 w-4" />
                            {t('downloadButton')}
                        </Button>
                        
                        <div className="text-sm space-y-3 pt-4">
                            <div className="flex items-center gap-2">
                                <Mail className="h-4 w-4 text-muted-foreground" />
                                <span>rotaturktr@gmail.com</span>
                            </div>
                            <a 
                                href="https://wa.me/905432177581" 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 hover:text-primary transition-colors group"
                            >
                                <Phone className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                                <span className="font-bold">+90 (543) 217 75 81</span>
                            </a>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
