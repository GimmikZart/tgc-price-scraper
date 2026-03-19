export const DEFAULT_TCG_DATA_BUCKET = "tcg-data";
export const DEFAULT_TCG_IMAGES_BUCKET = "tcg-images";
export const DEFAULT_ONE_PIECE_GAME_SLUG = "one-piece";

const GAME_CONFIGS = {
  [DEFAULT_ONE_PIECE_GAME_SLUG]: {
    slug: DEFAULT_ONE_PIECE_GAME_SLUG,
    label: "One Piece",
    storagePrefix: DEFAULT_ONE_PIECE_GAME_SLUG,
    imagePathPrefix: DEFAULT_ONE_PIECE_GAME_SLUG,
    localCardsDirSegments: [".cache", "tcg-workspace", DEFAULT_ONE_PIECE_GAME_SLUG, "sets"],
    localPricesFileSegments: [".cache", "tcg-workspace", DEFAULT_ONE_PIECE_GAME_SLUG, "prices.min.json"],
    localImagesDirSegments: [".cache", "tcg-images"],
    catalogObjectName: "catalog.min.json",
    pricesObjectName: "prices.min.json",
    metaObjectName: "meta.json",
    rawSetsFolderName: "sets",
  },
};

export function listSupportedGameSlugs() {
  return Object.keys(GAME_CONFIGS);
}

export function getSupportedGameConfig(gameSlug) {
  const normalizedSlug = normalizeGameSlug(gameSlug);
  const config = GAME_CONFIGS[normalizedSlug];

  if (!config) {
    throw new Error(`Gioco non supportato: ${gameSlug}`);
  }

  return config;
}

export function normalizeGameSlug(gameSlug) {
  return String(gameSlug ?? "")
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, "-");
}
