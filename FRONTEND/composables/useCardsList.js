import { withStoredCardImage } from "@/utilities/cardImageStorage";
import { DEFAULT_ONE_PIECE_GAME_SLUG } from "@/utilities/tcgGameConfig";

const GAME_SLUG = DEFAULT_ONE_PIECE_GAME_SLUG;

function normalizeCardArray(raw) {
  const arr = Array.isArray(raw?.default) ? raw.default : (Array.isArray(raw) ? raw : []);
  return arr.filter((card) => card && typeof card.id === "string");
}

function normalizePriceArray(raw) {
  const arr = Array.isArray(raw?.default) ? raw.default : (Array.isArray(raw) ? raw : []);
  return arr.filter((price) => price && typeof price.id === "string");
}

async function readCachedGameAsset(asset, version = null) {
  if (!process.client) return null;

  const { getCachedGameAsset } = await import("@/utilities/gameAssetCache.client");
  const cached = await getCachedGameAsset(GAME_SLUG, asset);
  if (!cached) return null;
  if (version == null) return cached.payload;

  return String(cached.version ?? "") === String(version) ? cached.payload : null;
}

async function writeCachedGameAsset(asset, payload, version = null) {
  if (!process.client) return;

  const { setCachedGameAsset } = await import("@/utilities/gameAssetCache.client");
  await setCachedGameAsset(GAME_SLUG, asset, payload, version);
}

async function loadGameMeta() {
  try {
    return await $fetch(`/api/games/${GAME_SLUG}/meta`);
  } catch {
    return null;
  }
}

async function loadGameCatalog(meta) {
  const cachedCatalog = await readCachedGameAsset("catalog", meta?.catalogVersion ?? null);
  if (cachedCatalog) return normalizeCardArray(cachedCatalog);

  try {
    const remoteCatalog = await $fetch(`/api/games/${GAME_SLUG}/catalog`);
    await writeCachedGameAsset("catalog", remoteCatalog, meta?.catalogVersion ?? null);
    return normalizeCardArray(remoteCatalog);
  } catch {
    const staleCatalog = await readCachedGameAsset("catalog");
    return normalizeCardArray(staleCatalog);
  }
}

async function loadGamePrices(meta) {
  const cachedPrices = await readCachedGameAsset("prices", meta?.pricesVersion ?? null);
  if (cachedPrices) return normalizePriceArray(cachedPrices);

  try {
    const remotePrices = await $fetch(`/api/games/${GAME_SLUG}/prices`);
    await writeCachedGameAsset("prices", remotePrices, meta?.pricesVersion ?? null);
    return normalizePriceArray(remotePrices);
  } catch {
    const stalePrices = await readCachedGameAsset("prices");
    return normalizePriceArray(stalePrices);
  }
}

export async function useOnePieceCards() {
  const state = useState(`tcg:${GAME_SLUG}:cards`, () => null);
  if (state.value) return state.value;

  const runtimeConfig = useRuntimeConfig();
  const supabaseUrl = runtimeConfig.public?.supabaseUrl || runtimeConfig.supabaseUrl || "";
  const cardImagesBucket = runtimeConfig.public.tcgImagesBucket;
  const imagePathPrefix = GAME_SLUG;

  const meta = await loadGameMeta();
  const catalog = await loadGameCatalog(meta);
  const prices = await loadGamePrices(meta);
  const priceMap = new Map();

  for (const price of prices) {
    priceMap.set(price.id, {
      price: typeof price.price === "number" ? price.price : null,
      lastUpdate: typeof price.lastUpdate === "number" ? price.lastUpdate : null,
    });
  }

  const allCards = catalog.map((card) => {
    const price = priceMap.get(card.id);
    const cardWithStoredImage = withStoredCardImage(card, {
      supabaseUrl,
      bucketName: cardImagesBucket,
      pathPrefix: imagePathPrefix,
    });

    return {
      ...cardWithStoredImage,
      price: price && typeof price.price === "number" ? price.price / 100 : null,
      priceLastUpdate: price ? price.lastUpdate : null,
    };
  });

  const leaderCards = allCards.filter(
    (card) => card.type && card.type.toLowerCase().includes("leader"),
  );

  const setNameSet = new Set();
  const typeSet = new Set();
  const familySet = new Set();
  const raritySet = new Set();
  const colorSet = new Set();
  const expansionCodeSet = new Set();
  const abilityKwSet = new Set();
  const nameSet = new Set();
  const powerSet = new Set();
  const counterSet = new Set();
  const attributeSet = new Set();
  const illustrationSet = new Set();

  for (const card of allCards) {
    if (card.setName) setNameSet.add(card.setName);
    if (card.type) typeSet.add(card.type);
    if (card.rarity) raritySet.add(card.rarity);
    if (card.expansionCode) expansionCodeSet.add(card.expansionCode);
    if (card.name) nameSet.add(card.name);
    if (card.power) powerSet.add(card.power);
    if (card.counter) counterSet.add(card.counter);
    if (card.attribute) attributeSet.add(card.attribute);
    if (Array.isArray(card.family)) card.family.forEach((family) => family && familySet.add(family));
    if (Array.isArray(card.color)) card.color.forEach((color) => color && colorSet.add(color));
    if (Array.isArray(card.abilityKeywords)) {
      card.abilityKeywords.forEach((keyword) => keyword && abilityKwSet.add(keyword));
    }
    if (card.illustration) illustrationSet.add(card.illustration);
  }

  const payload = {
    allCards,
    leaderCards,
    setNameList: Array.from(setNameSet).sort(),
    typeList: Array.from(typeSet).sort(),
    familyList: Array.from(familySet).sort(),
    rarityList: Array.from(raritySet).sort(),
    colorList: Array.from(colorSet).sort(),
    expansionCodeList: Array.from(expansionCodeSet).sort(),
    abilityKwList: Array.from(abilityKwSet).sort(),
    nameList: Array.from(nameSet).sort((left, right) =>
      left.localeCompare(right, undefined, { sensitivity: "base" }),
    ),
    powerLimits: {
      min: 0,
      max: powerSet.size ? Math.max(...powerSet) : 0,
    },
    counterList: Array.from(counterSet).sort((left, right) => left - right),
    attributeList: Array.from(attributeSet).sort(),
    illustrationList: Array.from(illustrationSet).sort(),
    meta,
  };

  state.value = payload;
  return payload;
}
