'use client';

import { useEffect } from 'react';
import { usePathname, useRouter, useParams } from 'next/navigation';

/**
 * Kullanıcının siteden yanlışlıkla çıkmasını önleyen ve 
 * geri tuşunu ana sayfaya yönlendiren navigasyon koruyucu.
 */
export function NavigationGuard() {
  const pathname = usePathname();
  const router = useRouter();
  const params = useParams();
  const locale = (params?.locale as string) || 'tr';

  useEffect(() => {
    // 1. Siteden ayrılma onayı (BeforeUnload)
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Modern tarayıcılar güvenlik nedeniyle özel metni göstermeyebilir 
      // ama diyaloğu tetikler.
      const message = "Rotaturk.net sitesinden ayrılmak istediğinize emin misiniz?";
      e.preventDefault();
      e.returnValue = message;
      return message;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    // 2. Geri butonu yönetimi
    // Tarayıcı geçmişine sahte bir giriş ekleyerek ilk geri basışta siteden çıkılmasını engelliyoruz.
    if (typeof window !== 'undefined') {
       window.history.pushState({ entry: true }, '');
    }

    const handlePopState = (event: PopStateEvent) => {
      const isHome = pathname === `/${locale}` || pathname === `/${locale}/`;
      
      if (!isHome) {
        // Eğer kullanıcı herhangi bir alt sayfadaysa, geri tuşu onu ana sayfaya atsın
        router.push(`/${locale}`);
        // Geçmişteki koruma durumunu yenile
        window.history.pushState({ entry: true }, '');
      } else {
        // Zaten ana sayfadaysa, siteden çıkışı önlemek için state'i geri yükle
        window.history.pushState({ entry: true }, '');
        // Kullanıcıya çıkmak isteyip istemediğini soran bir toast veya uyarı da eklenebilir
        // Ancak popstate içinde alert kullanmak bazı tarayıcılarda engellenebilir.
      }
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [pathname, locale, router]);

  return null;
}
