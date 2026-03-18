# Nuxt Minimal Starter

Look at the [Nuxt documentation](https://nuxt.com/docs/getting-started/introduction) to learn more.

## Setup

Make sure to install dependencies:

```bash
# npm
npm install

# pnpm
pnpm install

# yarn
yarn install

# bun
bun install
```

## Development Server

Start the development server on `http://localhost:3000`:

```bash
# npm
npm run dev

# pnpm
pnpm dev

# yarn
yarn dev

# bun
bun run dev
```

## Production

Build the application for production:

```bash
# npm
npm run build

# pnpm
pnpm build

# yarn
yarn build

# bun
bun run build
```

Locally preview production build:

```bash
# npm
npm run preview

# pnpm
pnpm preview

# yarn
yarn preview

# bun
bun run preview
```

Check out the [deployment documentation](https://nuxt.com/docs/getting-started/deployment) for more information.

## Geoapify + Leaflet setup

Per attivare la parte mappe della compravendita carte:

1. Crea un account su Geoapify.
2. Genera una nuova API key dal pannello Geoapify.
3. Inserisci la chiave in `.env.local` usando queste variabili:

```bash
GEOAPIFY_API_KEY=la_tua_chiave_geoapify
# opzionale
NUXT_PUBLIC_GEOAPIFY_API_KEY=la_tua_chiave_geoapify
NUXT_PUBLIC_GEOAPIFY_MAP_STYLE=osm-carto
```

Puoi partire anche copiando `.env.example`.

### A cosa servono le variabili

- `GEOAPIFY_API_KEY`: usata dal server Nuxt per autocomplete, reverse geocoding e tile proxy.
- `NUXT_PUBLIC_GEOAPIFY_API_KEY`: opzionale, non piu necessaria per il flusso standard.
- `NUXT_PUBLIC_GEOAPIFY_MAP_STYLE`: stile mappa Geoapify, di default `osm-carto`.

### Flusso implementato

- `/community/sell-cards/new-sell`: sezione `Luogo di vendita` con tab `Indirizzo`, `Mappa`, `Posizione`.
- `/community/buy-cards/map`: mappa fullscreen delle vendite entro 10 km dal centro utente corrente.
- dettaglio vendita: tab `Offerte` e `Mappa`.
