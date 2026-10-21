'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import { Palette } from 'lucide-react';

const themes = [
  { name: 'jade', color: 'bg-[#0474C4]', labelKey: 'ahmet' },     // Ahmet (Yeni Mavi)
  { name: 'sapphire', color: 'bg-[#93c5fd]', labelKey: 'ali' },    // Ali
  { name: 'mina', color: 'bg-[#BC7B6F]', labelKey: 'mina' },     // Mina
  { name: 'nergiz', color: 'bg-[#AF9AC9]', labelKey: 'nergiz' }, // Nergiz
  { name: 'ilhami', color: 'bg-[#245F73]', labelKey: 'ilhami' }, // İlhami
];

export function ColorThemeSwitcher() {
  const [currentTheme, setCurrentTheme] = React.useState('jade');
  const t = useTranslations('ColorThemes');

  React.useEffect(() => {
    const savedTheme = localStorage.getItem('rota-turk-color-theme') || 'jade';
    setCurrentTheme(savedTheme);
    document.documentElement.setAttribute('data-color-theme', savedTheme);
  }, []);

  const changeTheme = (themeName: string) => {
    setCurrentTheme(themeName);
    document.documentElement.setAttribute('data-color-theme', themeName);
    localStorage.setItem('rota-turk-color-theme', themeName);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full h-9 w-9 hover:bg-primary/10">
          <Palette className="h-[1.2rem] w-[1.2rem] text-primary" />
          <span className="sr-only">Renk temasını değiştir</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="p-2 flex flex-col gap-2 min-w-[120px] bg-white/90 backdrop-blur-md border-primary/20">
        {themes.map((theme) => (
          <DropdownMenuItem
            key={theme.name}
            onClick={() => changeTheme(theme.name)}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-xl cursor-pointer transition-all hover:bg-primary/5 focus:bg-primary/10",
              currentTheme === theme.name && "bg-primary/10"
            )}
          >
            <div className={cn("h-4 w-4 rounded-full", theme.color)} />
            <span className="text-sm font-bold">{t(theme.labelKey as any)}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}