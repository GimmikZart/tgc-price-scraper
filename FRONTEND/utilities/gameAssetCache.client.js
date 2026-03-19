import { useNuxtApp } from "#app";

function buildCacheKey(game, asset) {
  return `${game}:${asset}`;
}

export async function getCachedGameAsset(game, asset) {
  const nuxtApp = useNuxtApp();
  const db = nuxtApp.$deckLocalDb;
  if (!db) return null;

  return db.get("gameAssets", buildCacheKey(game, asset));
}

export async function setCachedGameAsset(game, asset, payload, version) {
  const nuxtApp = useNuxtApp();
  const db = nuxtApp.$deckLocalDb;
  if (!db) return null;

  const record = {
    key: buildCacheKey(game, asset),
    game,
    asset,
    payload,
    version: version ?? null,
    updatedAt: Date.now(),
  };

  await db.put("gameAssets", record);
  return record;
}

export async function clearCachedGameAsset(game, asset) {
  const nuxtApp = useNuxtApp();
  const db = nuxtApp.$deckLocalDb;
  if (!db) return;

  await db.delete("gameAssets", buildCacheKey(game, asset));
}
