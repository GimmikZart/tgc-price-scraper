import {
  DEFAULT_TCG_DATA_BUCKET,
  getSupportedGameConfig,
} from "@/utilities/tcgGameConfig.js";
import {
  createSupabaseServiceClientFromEnv,
  downloadJsonObject,
} from "@/utilities/gameStorageSync.js";
import {
  getGameCatalogObjectPath,
  getGameMetaObjectPath,
  getGamePricesObjectPath,
} from "@/utilities/tcgStorage.js";

export async function loadGameCatalogAsset(gameSlug) {
  const fromStorage = await loadJsonAssetFromStorage(gameSlug, "catalog");
  return Array.isArray(fromStorage) ? fromStorage : [];
}

export async function loadGamePricesAsset(gameSlug) {
  const fromStorage = await loadJsonAssetFromStorage(gameSlug, "prices");
  return Array.isArray(fromStorage) ? fromStorage : [];
}

export async function loadGameMetaAsset(gameSlug) {
  const fromStorage = await loadJsonAssetFromStorage(gameSlug, "meta");
  return fromStorage && typeof fromStorage === "object"
    ? fromStorage
    : { game: gameSlug };
}

async function loadJsonAssetFromStorage(gameSlug, assetType) {
  try {
    getSupportedGameConfig(gameSlug);
    const client = createSupabaseServiceClientFromEnv();
    const bucketName = process.env.TCG_DATA_BUCKET || DEFAULT_TCG_DATA_BUCKET;
    const objectPath = resolveAssetObjectPath(gameSlug, assetType);
    return downloadJsonObject(client, bucketName, objectPath);
  } catch {
    return null;
  }
}

function resolveAssetObjectPath(gameSlug, assetType) {
  switch (assetType) {
    case "catalog":
      return getGameCatalogObjectPath(gameSlug);
    case "prices":
      return getGamePricesObjectPath(gameSlug);
    case "meta":
      return getGameMetaObjectPath(gameSlug);
    default:
      throw new Error(`Asset non supportato: ${assetType}`);
  }
}
