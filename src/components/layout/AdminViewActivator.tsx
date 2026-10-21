'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

/**
 * URL'deki admin parametresini kontrol eden ve local storage'ı güncelleyen istemci bileşeni.
 * layout.tsx'i sunucu bileşeni yapabilmek için dışarı aktarılmıştır.
 */
export function AdminViewActivator() {
  const searchParams = useSearchParams();
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const adminParam = searchParams.get('admin');
      if (adminParam === process.env.NEXT_PUBLIC_ADMIN_SECRET_CODE) {
          window.localStorage.setItem('isAdminView', 'true');
          window.dispatchEvent(new Event('storage'));
      }
    }
  }, [searchParams]);

  return null;
}
