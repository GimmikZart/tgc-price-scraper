// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2025-11-01",
  devtools: { enabled: true },
  runtimeConfig: {
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    pricesBucket: process.env.PRICES_BUCKET || 'prices',
    pricesObject: process.env.PRICES_OBJECT || 'one-piece.min.json',
  },
  modules: [
    "@nuxtjs/tailwindcss",
    "@nuxtjs/supabase",
    "vuetify-nuxt-module",
    "@pinia/nuxt",
    "pinia-plugin-persistedstate/nuxt",
    "@vite-pwa/nuxt",
    "@nuxt/image",
    "nuxt-charts"
  ],
  plugins: ["~/plugins/indexeddb.client.ts"],
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
      short_name: "Deckspedia",
      description: "La migliore piattaforma per collezionisti di carte TCG",
      theme_color: "#000000",
      background_color: "#000000",
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

    client: {
      installPrompt: true,
      registerPlugin: true,
    },
    periodicSyncForUpdates: 86400,
  },
});
