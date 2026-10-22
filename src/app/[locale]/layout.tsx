'use client';

import { Inter, Poppins } from "next/font/google";
import "../globals.css";
import { cn } from "@/lib/utils";
import { ThemeProvider } from "@/components/layout/ThemeProvider";
import { FirebaseClientProvider } from "@/firebase/client-provider";
import { ReactQueryProvider } from "../react-query-provider";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { NextIntlClientProvider } from 'next-intl';
import { Toaster } from '@/components/ui/toaster';
import { Suspense, useState, useEffect, use } from 'react';
import { AdminViewActivator } from "@/components/layout/AdminViewActivator";
import { ProximityAlertManager } from "@/components/rotaturk/ProximityAlertManager";
import { MessageNotificationListener } from "@/components/rotaturk/MessageNotificationListener";
import { OnlinePresence } from "@/components/rotaturk/OnlinePresence";
import { CookieConsent } from "@/components/layout/CookieConsent";
import { NavigationGuard } from "@/components/layout/NavigationGuard";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-poppins",
});

export default function LocaleLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = use(params);
  const [messages, setMessages] = useState<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    async function loadMessages() {
      try {
        const msg = (await import(`../../messages/${locale}.json`)).default;
        setMessages(msg);
      } catch (e) {
        try {
           const fallback = (await import(`../../messages/tr.json`)).default;
           setMessages(fallback);
        } catch (f) {
           setMessages({});
        }
      } finally {
        setIsLoaded(true);
      }
    }
    loadMessages();
  }, [locale]);

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>RotaTurk - Türkiye Turizm Navigatörü</title>
        <meta name="description" content="RotaTurk - Akıllı Rota Planlayıcı ile Türkiye'yi Keşfet" />
        <link rel="icon" href="/logo.png?v=4" />
        <link rel="shortcut icon" href="/logo.png?v=4" />
        <link rel="apple-touch-icon" href="/logo.png?v=4" />
        <link rel="manifest" href="/manifest.json?v=4" />
        <meta name="theme-color" content="#244855" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="RotaTurk" />
        <meta name="application-name" content="RotaTurk" />
      </head>
      <body className={cn(inter.variable, poppins.variable, "min-h-screen bg-background font-sans antialiased")}>
        {isLoaded && messages ? (
          <NextIntlClientProvider locale={locale} messages={messages}>
            <FirebaseClientProvider>
              <ReactQueryProvider>
                <ThemeProvider
                  attribute="class"
                  defaultTheme="light"
                  forcedTheme="light"
                  disableTransitionOnChange
                >
                  <NavigationGuard />
                  <Suspense fallback={null}>
                    <AdminViewActivator />
                  </Suspense>
                  <ProximityAlertManager />
                  <MessageNotificationListener />
                  <OnlinePresence />
                  <CookieConsent />
                  <div className="flex flex-col min-h-screen">
                    <Header />
                    <main className="flex-grow">
                      <Suspense fallback={
                        <div className="flex items-center justify-center min-h-[60vh]">
                          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                        </div>
                      }>
                        {children}
                      </Suspense>
                    </main>
                    <Footer />
                    <Toaster />
                  </div>
                </ThemeProvider>
              </ReactQueryProvider>
            </FirebaseClientProvider>
          </NextIntlClientProvider>
        ) : (
          <div className="min-h-screen bg-background flex items-center justify-center">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
      </body>
    </html>
  );
}
