// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2024-11-01",
  devtools: { enabled: true },
  modules: [
    "@nuxtjs/tailwindcss",
    "@nuxtjs/supabase",
    "vuetify-nuxt-module",
    "@pinia/nuxt",
    "pinia-plugin-persistedstate/nuxt",
    "@vite-pwa/nuxt",
  ],
  supabase: {
    redirect: false,
  },
  server: {
    host: "0.0.0.0",
    port: 3000,
  },
  pwa: {
    manifest: {
      name: "Deckspedia",
      short_name: "DKP",
      description: "La migliore piattaforma per collezionisti di carte TCG",
      theme_color: "#4A90E2",
      background_color: "#ffffff",
      display: "standalone",
      start_url: "/",
      icons: [
        {
          src: "assets/icons/dkp-192x192.png",
          sizes: "192x192",
          type: "image/png",
        },
        {
          src: "assets/icons/dkp-512x512.png",
          sizes: "512x512",
          type: "image/png",
        },
        {
          src: "assets/icons/dkp-1024x1024.png",
          sizes: "1024x1024",
          type: "image/png",
        },
      ],
    },

    /* workbox: {
      runtimeCaching: [
        {
          urlPattern: "^/.*\\.(js|css|png|jpg|svg)$",
          handler: "CacheFirst",
          options: {
            cacheName: "static-assets",
            expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 7 }, // 7 gg
          },
        },
        {
          urlPattern: "^https://api\\.miodominio\\.com/.*",
          handler: "NetworkFirst",
          options: {
            cacheName: "api-cache",
            expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 }, // 1 gg
          },
        },
      ],
    }, */

    client: {
      installPrompt: true,
      registerPlugin: true,
    },
    periodicSyncForUpdates: 86400,
  },
});
