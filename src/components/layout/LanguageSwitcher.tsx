'use client';

import { useLocale } from 'next-intl';
import { usePathname, useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const TRFlag = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 600" width="24" height="16" className="rounded-sm">
        <rect width="900" height="600" fill="#E30A17"/>
        <circle cx="300" cy="300" r="150" fill="#FFF"/>
        <circle cx="337.5" cy="300" r="120" fill="#E30A17"/>
        <path d="M425.925 300l86.205-27.952-53.28 73.137V254.815l53.28 73.137z" fill="#FFF"/>
    </svg>
);

const GBFlag = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 30" width="24" height="12" className="rounded-sm">
        <clipPath id="a">
            <path d="M0 0h60v30H0z"/>
        </clipPath>
        <clipPath id="b">
            <path d="M30 15h30v15H30zm-30 0h30v15H0zm30-15h30v15H30zM0 0h30v15H0z"/>
        </clipPath>
        <g clipPath="url(#a)">
            <path d="M0 0v30h60V0z" fill="#012169"/>
            <path d="M0 0L60 30m0-30L0 30" stroke="#fff" strokeWidth="6"/>
            <path d="M0 0L60 30m0-30L0 30" clipPath="url(#b)" stroke="#C8102E" strokeWidth="4"/>
            <path d="M30 0v30M0 15h60" stroke="#fff" strokeWidth="10"/>
            <path d="M30 0v30M0 15h60" stroke="#C8102E" strokeWidth="6"/>
        </g>
    </svg>
);

const FRFlag = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 3 2" width="24" height="16" className="rounded-sm">
        <rect width="1" height="2" fill="#002395"/>
        <rect width="1" height="2" x="1" fill="#fff"/>
        <rect width="1" height="2" x="2" fill="#ED2939"/>
    </svg>
);

const DEFlag = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 5 3" width="24" height="16" className="rounded-sm">
        <rect width="5" height="1" fill="#000"/>
        <rect width="5" height="1" y="1" fill="#D00"/>
        <rect width="5" height="1" y="2" fill="#FFCE00"/>
    </svg>
);

export function LanguageSwitcher() {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const pathname = usePathname();
  const locale = useLocale();

  const onSelectChange = (nextLocale: string) => {
    // Remove the current locale prefix from the pathname
    const newPath = pathname.startsWith(`/${locale}`)
      ? pathname.substring(`/${locale}`.length) || '/'
      : pathname;
      
    startTransition(() => {
      // Use a relative path to maintain the current domain and protocol
      router.replace(`/${nextLocale}${newPath}`);
    });
  };

  const getFlag = (loc: string) => {
      switch(loc) {
          case 'tr': return <TRFlag />;
          case 'en': return <GBFlag />;
          case 'fr': return <FRFlag />;
          case 'de': return <DEFlag />;
          default: return <GBFlag />;
      }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" disabled={isPending}>
          {getFlag(locale)}
          <span className="sr-only">Change language</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() => onSelectChange('tr')}
          disabled={locale === 'tr'}
          className="gap-2"
        >
          <TRFlag />
          <span>Türkçe</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => onSelectChange('en')}
          disabled={locale === 'en'}
          className="gap-2"
        >
          <GBFlag />
          <span>English</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => onSelectChange('fr')}
          disabled={locale === 'fr'}
          className="gap-2"
        >
          <FRFlag />
          <span>Français</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => onSelectChange('de')}
          disabled={locale === 'de'}
          className="gap-2"
        >
          <DEFlag />
          <span>Deutsch</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
