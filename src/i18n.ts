import {getRequestConfig} from 'next-intl/server';

/**
 * Configuration for the next-intl library to handle translations and localization.
 * This is designed to be fail-safe for production environments.
 */
export default getRequestConfig(async ({locale}) => {
  let messages = {};
  try {
    // Attempt to load the translation messages for the given locale.
    // We use a robust path resolution for production builds.
    const module = await import(`./messages/${locale}.json`);
    messages = module.default || module;
  } catch (error) {
    // If loading fails (e.g., file not found), fall back to Turkish as the default language.
    console.warn(`Locale ${locale} failed to load in production, falling back to 'tr'.`, error);
    try {
      const fallback = await import(`./messages/tr.json`);
      messages = fallback.default || fallback;
    } catch (fallbackError) {
      // In extreme cases, return an empty object to prevent a full application crash.
      messages = {};
    }
  }

  return {
    messages,
    timeZone: 'Europe/Istanbul',
    now: new Date()
  };
});
