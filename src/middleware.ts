
import createMiddleware from 'next-intl/middleware';
 
export default createMiddleware({
  // Desteklenen diller
  locales: ['en', 'tr', 'fr', 'de'],
 
  // Varsayılan dil
  defaultLocale: 'tr',

  // Yerel ayar bilgisini her zaman URL'de tut
  localePrefix: 'always'
});
 
export const config = {
  // Internationalization dışı bırakılacak yollar
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)']
};
