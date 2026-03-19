// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2025-11-01",
  devtools: { enabled: true },
  css: ["leaflet/dist/leaflet.css"],
  app: {
    head: {
      link: [
        { rel: "icon", type: "image/x-icon", href: "/assets/icons/favicon.ico" },
        { rel: "icon", type: "image/svg+xml", href: "/assets/icons/favicon.svg" },
        { rel: "apple-touch-icon", sizes: "180x180", href: "/assets/icons/apple-touch-icon.png" },
      ],
    },
  },
  runtimeConfig: {
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    tcgDataBucket: process.env.TCG_DATA_BUCKET || 'tcg-data',
    tcgImagesBucket: process.env.TCG_IMAGES_BUCKET || 'tcg-images',
    geoapifyApiKey: process.env.GEOAPIFY_API_KEY,
    public: {
      supabaseUrl: process.env.SUPABASE_URL || "",
      tcgImagesBucket: process.env.TCG_IMAGES_BUCKET || "tcg-images",
      geoapifyEnabled: Boolean(process.env.GEOAPIFY_API_KEY || process.env.NUXT_PUBLIC_GEOAPIFY_API_KEY),
      geoapifyApiKey: process.env.NUXT_PUBLIC_GEOAPIFY_API_KEY || process.env.GEOAPIFY_API_KEY || "",
      geoapifyMapStyle: process.env.NUXT_PUBLIC_GEOAPIFY_MAP_STYLE || "osm-carto",
    },
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
          src: "/assets/icons/dkp-192x192.png",
          sizes: "192x192",
          type: "image/png",
        },
        {
          src: "/assets/icons/dkp-512x512.png",
          sizes: "512x512",
          type: "image/png",
        },
        {
          src: "/assets/icons/apple-touch-icon.png",
          sizes: "180x180",
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
