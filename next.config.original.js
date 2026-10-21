
/** @type {import('next').NextConfig} */
const withNextIntl = require('next-intl/plugin')();

const withPWA = require("@ducanh2912/next-pwa").default({
    dest: "public",
    register: true,
    skipWaiting: true,
    disable: process.env.NODE_ENV === "development",
    runtimeCaching: [
    {
      urlPattern: ({ url }) => {
        return url.origin === 'https://rotaturk.net' || url.origin === 'https://www.rotaturk.net';
      },
      handler: 'NetworkFirst',
      options: {
        cacheName: 'rotraturk-cache',
        expiration: {
          maxEntries: 60,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 Days
        },
        cacheableResponse: {
          statuses: [0, 200],
        },
      },
    },
  ],
});


const nextConfig = {
    images: {
        remotePatterns: [
          {
            protocol: 'https',
            hostname: 'picsum.photos',
          },
          {
            protocol: 'https',
            hostname: 'maps.googleapis.com',
          },
          {
            protocol: 'https',
            hostname: 'openweathermap.org',
          },
          {
            protocol: 'https',
            hostname: 'images.unsplash.com',
          }
        ],
      },
    transpilePackages: ['@vis.gl/react-google-maps'],
    env: {
        GOOGLE_MAPS_API_KEY: 'AIzaSyCQNvNepfLrxH7o-PCRGqEBJFd3ofEotUQ',
        NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: 'AIzaSyCQNvNepfLrxH7o-PCRGqEBJFd3ofEotUQ',
        OPENWEATHERMAP_API_KEY: process.env.OPENWEATHERMAP_API_KEY,
        NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
        NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
        NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
        NEXT_PUBLIC_FIREBASE_DATABASE_URL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
        NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
        NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
        NEXT_PUBLIC_ADMIN_SECRET_CODE: process.env.NEXT_PUBLIC_ADMIN_SECRET_CODE
    }
};

module.exports = withNextIntl(withPWA(nextConfig));
