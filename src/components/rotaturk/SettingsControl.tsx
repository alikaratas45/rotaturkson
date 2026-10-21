'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Settings, Bell, BellOff, Volume2, VolumeX } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useTranslations } from 'next-intl';

export function SettingsControl() {
  const t = useTranslations('Settings');
  const [messageNotifications, setMessageNotifications] = useState(true);
  const [voiceAlerts, setVoiceAlerts] = useState(true);

  useEffect(() => {
    const msgNotif = localStorage.getItem('rt-message-notifications');
    const voiceAlrt = localStorage.getItem('rt-voice-alerts');
    
    if (msgNotif !== null) setMessageNotifications(msgNotif === 'true');
    if (voiceAlrt !== null) setVoiceAlerts(voiceAlrt === 'true');
  }, []);

  const toggleMessages = (val: boolean) => {
    setMessageNotifications(val);
    localStorage.setItem('rt-message-notifications', String(val));
  };

  const toggleVoice = (val: boolean) => {
    setVoiceAlerts(val);
    localStorage.setItem('rt-voice-alerts', String(val));
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button 
          size="icon" 
          variant="ghost" 
          className="rounded-full h-9 w-9 hover:bg-primary/10 text-primary"
        >
          <Settings size={20} />
          <span className="sr-only">Ayarlar</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 p-5 rounded-3xl shadow-2xl border-primary/10 bg-white/95 backdrop-blur-md">
        <h4 className="font-bold text-lg mb-4 flex items-center gap-2">
            <Settings className="h-4 w-4 text-primary" />
            {t('title')}
        </h4>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-0.5">
                <Label className="font-bold flex items-center gap-2 cursor-pointer">
                   {messageNotifications ? <Bell className="h-3.5 w-3.5 text-primary" /> : <BellOff className="h-3.5 w-3.5 text-muted-foreground" />}
                   {t('messageNotifications')}
                </Label>
                <span className="text-[10px] text-muted-foreground">Yeni mesajlarda uyarı ver</span>
            </div>
            <Switch 
                checked={messageNotifications} 
                onCheckedChange={toggleMessages} 
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-0.5">
                <Label className="font-bold flex items-center gap-2 cursor-pointer">
                   {voiceAlerts ? <Volume2 className="h-3.5 w-3.5 text-primary" /> : <VolumeX className="h-3.5 w-3.5 text-muted-foreground" />}
                   {t('voiceAlerts')}
                </Label>
                <span className="text-[10px] text-muted-foreground">Gezi noktalarını sesli oku</span>
            </div>
            <Switch 
                checked={voiceAlerts} 
                onCheckedChange={toggleVoice} 
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
