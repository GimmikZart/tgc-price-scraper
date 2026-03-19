import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import {
  getCardImageObjectPath,
  getLegacyCardImageObjectPath,
} from "./cardImageStorage.js";
import {
  DEFAULT_TCG_DATA_BUCKET,
  DEFAULT_TCG_IMAGES_BUCKET,
  getSupportedGameConfig,
} from "./tcgGameConfig.js";
import {
  getGameCardImageObjectPath,
  getGameCatalogObjectPath,
  getGameMetaObjectPath,
  getGamePricesObjectPath,
  getGameRawSetObjectPath,
  joinStoragePath,
} from "./tcgStorage.js";

export function resolveGameLocalPaths(gameSlug) {
  const config = getSupportedGameConfig(gameSlug);

  return {
    cardsDir: path.resolve(process.cwd(), ...config.localCardsDirSegments),
    pricesFile: path.resolve(process.cwd(), ...config.localPricesFileSegments),
    imagesDir: path.resolve(process.cwd(), ...config.localImagesDirSegments),
  };
}

export function createSupabaseServiceClientFromEnv() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error("SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY mancanti.");
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export function normalizeCardsArray(raw) {
  const cards = Array.isArray(raw) ? raw : (Array.isArray(raw?.cards) ? raw.cards : []);
  return cards.filter(Boolean);
}

export function sortCardsById(cards) {
  return [...normalizeCardsArray(cards)].sort((left, right) =>
    String(left?.id ?? "").localeCompare(String(right?.id ?? ""))
  );
}

export function serializeCardSet(cards) {
  return JSON.stringify(normalizeCardsArray(cards), null, 2);
}

export function mergeCardsById(existingCards, nextCards) {
  const normalizedNextCards = normalizeCardsArray(nextCards);
  const existingById = new Map(
    normalizeCardsArray(existingCards)
      .filter((card) => typeof card?.id === "string" && card.id.trim())
      .map((card) => [card.id, card]),
  );

  return normalizedNextCards.map((card) => {
    const existingCard = existingById.get(card?.id);
    if (!existingCard) return card;

    return {
      ...existingCard,
      ...card,
    };
  });
}

export function createSetFileEntry(fileName, cards, raw = null) {
  const normalizedFileName = String(fileName ?? "").trim();
  const normalizedCards = sortCardsById(cards);
  const normalizedRaw = typeof raw === "string" ? raw : serializeCardSet(normalizedCards);

  return {
    fileName: normalizedFileName,
    filePath: null,
    raw: normalizedRaw,
    cards: normalizedCards,
  };
}

export function upsertSetFileEntry(setFiles, nextEntry) {
  const normalizedEntry = createSetFileEntry(
    nextEntry?.fileName,
    nextEntry?.cards,
    nextEntry?.raw,
  );

  const filteredEntries = (Array.isArray(setFiles) ? setFiles : []).filter(
    (entry) => String(entry?.fileName ?? "").trim() !== normalizedEntry.fileName,
  );

  filteredEntries.push(normalizedEntry);
  filteredEntries.sort((left, right) =>
    String(left?.fileName ?? "").localeCompare(
      String(right?.fileName ?? ""),
      undefined,
      { numeric: true, sensitivity: "base" },
    )
  );

  return filteredEntries;
}

export function buildGameCatalogFromSetFiles(setFiles) {
  const cards = [];

  for (const entry of Array.isArray(setFiles) ? setFiles : []) {
    cards.push(...normalizeCardsArray(entry?.cards));
  }

  return sortCardsById(cards);
}

export async function readGameCardsFromLocalFiles(gameSlug) {
  const { cardsDir } = resolveGameLocalPaths(gameSlug);

  let fileNames = [];
  try {
    fileNames = await fs.readdir(cardsDir);
  } catch (error) {
    if (error?.code === "ENOENT") {
      return {
        cards: [],
        setFiles: [],
        cardsDir,
      };
    }
    throw error;
  }

  const setFiles = [];

  for (const fileName of fileNames
    .filter((entry) => entry.endsWith(".json"))
    .sort((left, right) => left.localeCompare(right, undefined, { numeric: true }))) {
    const filePath = path.join(cardsDir, fileName);
    const raw = await fs.readFile(filePath, "utf8");
    const parsed = JSON.parse(raw);

    setFiles.push({
      fileName,
      filePath,
      raw,
      cards: sortCardsById(parsed),
    });
  }

  return {
    cards: buildGameCatalogFromSetFiles(setFiles),
    setFiles,
    cardsDir,
  };
}

export async function readGamePricesFromLocalFile(gameSlug) {
  const { pricesFile } = resolveGameLocalPaths(gameSlug);

  try {
    const raw = await fs.readFile(pricesFile, "utf8");
    const parsed = JSON.parse(raw);
    return normalizePriceRows(parsed?.default ?? parsed);
  } catch (error) {
    if (error?.code === "ENOENT") return [];
    throw error;
  }
}

export async function writeGamePricesToLocalFile(gameSlug, rows) {
  const { pricesFile } = resolveGameLocalPaths(gameSlug);
  const normalizedRows = normalizePriceRows(rows);

  await fs.mkdir(path.dirname(pricesFile), { recursive: true });
  await fs.writeFile(pricesFile, JSON.stringify(normalizedRows, null, 2), "utf8");

  return {
    pricesFile,
    count: normalizedRows.length,
  };
}

export async function downloadTextObject(client, bucketName, objectPath) {
  const { data, error } = await client.storage.from(bucketName).download(objectPath);
  if (error || !data) return null;
  return data.text();
}

export async function downloadJsonObject(client, bucketName, objectPath) {
  const text = await downloadTextObject(client, bucketName, objectPath);
  if (text == null) return null;
  return JSON.parse(text);
}

async function listStorageObjects(client, bucketName, prefix) {
  const entries = [];
  let offset = 0;
  const limit = 1000;

  while (true) {
    const { data, error } = await client.storage.from(bucketName).list(prefix, {
      limit,
      offset,
      sortBy: { column: "name", order: "asc" },
    });

    if (error) throw error;

    const batch = Array.isArray(data) ? data : [];
    entries.push(...batch);

    if (batch.length < limit) break;
    offset += batch.length;
  }

  return entries;
}

export async function listGameRawSetFileNamesFromStorage(gameSlug, options = {}) {
  const client = options.client || createSupabaseServiceClientFromEnv();
  const dataBucket = options.dataBucket || process.env.TCG_DATA_BUCKET || DEFAULT_TCG_DATA_BUCKET;
  const config = getSupportedGameConfig(gameSlug);
  const prefix = joinStoragePath(config.storagePrefix, config.rawSetsFolderName);
  const entries = await listStorageObjects(client, dataBucket, prefix);

  return entries
    .map((entry) => String(entry?.name ?? "").trim())
    .filter((fileName) => fileName.endsWith(".json"))
    .sort((left, right) => left.localeCompare(right, undefined, { numeric: true, sensitivity: "base" }));
}

export async function readGameRawSetFromStorage(gameSlug, fileName, options = {}) {
  const client = options.client || createSupabaseServiceClientFromEnv();
  const dataBucket = options.dataBucket || process.env.TCG_DATA_BUCKET || DEFAULT_TCG_DATA_BUCKET;
  const rawSet = await downloadJsonObject(
    client,
    dataBucket,
    getGameRawSetObjectPath(gameSlug, fileName),
  );

  if (rawSet == null) return null;
  return sortCardsById(rawSet);
}

export async function readGameCardsFromStorage(gameSlug, options = {}) {
  const client = options.client || createSupabaseServiceClientFromEnv();
  const dataBucket = options.dataBucket || process.env.TCG_DATA_BUCKET || DEFAULT_TCG_DATA_BUCKET;
  const fileNames = await listGameRawSetFileNamesFromStorage(gameSlug, {
    client,
    dataBucket,
  });
  const setFiles = [];

  for (const fileName of fileNames) {
    const objectPath = getGameRawSetObjectPath(gameSlug, fileName);
    const raw = await downloadTextObject(client, dataBucket, objectPath);
    if (raw == null) continue;

    setFiles.push({
      fileName,
      filePath: objectPath,
      raw,
      cards: sortCardsById(JSON.parse(raw)),
    });
  }

  return {
    cards: buildGameCatalogFromSetFiles(setFiles),
    setFiles,
    cardsDir: null,
  };
}

export async function readGamePricesFromStorage(gameSlug, options = {}) {
  const client = options.client || createSupabaseServiceClientFromEnv();
  const dataBucket = options.dataBucket || process.env.TCG_DATA_BUCKET || DEFAULT_TCG_DATA_BUCKET;
  const parsed = await downloadJsonObject(client, dataBucket, getGamePricesObjectPath(gameSlug));
  return normalizePriceRows(parsed);
}

export async function ensureStorageBucket(client, bucketName, options = {}) {
  const normalizedBucketName = String(bucketName ?? "").trim();
  const effectiveFileSizeLimit =
    options.fileSizeLimit ||
    process.env.TCG_STORAGE_FILE_SIZE_LIMIT ||
    "50MB";

  const { data: buckets, error: listError } = await client.storage.listBuckets();
  if (!listError && Array.isArray(buckets)) {
    const existingBucket = buckets.find((bucket) =>
      bucket?.id === normalizedBucketName || bucket?.name === normalizedBucketName
    );

    if (existingBucket) return existingBucket;
  }

  const { data: created, error: createError } = await client.storage.createBucket(normalizedBucketName, {
    public: Boolean(options.public),
    fileSizeLimit: effectiveFileSizeLimit,
  });

  if (createError) {
    throw createError;
  }

  return created;
}

export async function uploadJsonObject(client, bucketName, objectPath, value, options = {}) {
  const payload = typeof value === "string" ? value : JSON.stringify(value);
  const buffer = Buffer.from(payload, "utf8");
  const contentType = "application/json; charset=utf-8";

  try {
    const { error } = await client.storage.from(bucketName).upload(objectPath, buffer, {
      upsert: true,
      contentType,
      cacheControl: String(options.cacheControl ?? 60),
    });

    if (error) throw error;
  } catch (error) {
    throw new Error(
      `Upload fallito: bucket=${bucketName} object=${objectPath} size=${buffer.byteLength}B contentType=${contentType} :: ${error?.message || String(error)}`
    );
  }

  return {
    objectPath,
    size: buffer.byteLength,
  };
}

export async function uploadFileObject(client, bucketName, objectPath, filePath, options = {}) {
  const buffer = await fs.readFile(filePath);
  const contentType = options.contentType || "application/octet-stream";

  try {
    const { error } = await client.storage.from(bucketName).upload(objectPath, buffer, {
      upsert: true,
      contentType,
      cacheControl: String(options.cacheControl ?? 3600),
    });

    if (error) throw error;
  } catch (error) {
    throw new Error(
      `Upload fallito: bucket=${bucketName} object=${objectPath} file=${filePath} size=${buffer.byteLength}B contentType=${contentType} :: ${error?.message || String(error)}`
    );
  }

  return {
    objectPath,
    size: buffer.byteLength,
  };
}

export async function readGameMetaFromStorage(gameSlug, options = {}) {
  const client = options.client || createSupabaseServiceClientFromEnv();
  const bucketName = options.dataBucket || process.env.TCG_DATA_BUCKET || DEFAULT_TCG_DATA_BUCKET;
  return downloadJsonObject(client, bucketName, getGameMetaObjectPath(gameSlug));
}

export async function updateGameMeta(gameSlug, nextPartialMeta, options = {}) {
  const client = options.client || createSupabaseServiceClientFromEnv();
  const dataBucket = options.dataBucket || process.env.TCG_DATA_BUCKET || DEFAULT_TCG_DATA_BUCKET;
  const nowIso = options.nowIso || new Date().toISOString();
  const existingMeta = options.existingMeta || (await readGameMetaFromStorage(gameSlug, {
    client,
    dataBucket,
  })) || {};

  const nextMeta = {
    game: gameSlug,
    updatedAt: nowIso,
    ...existingMeta,
    ...nextPartialMeta,
  };

  await uploadJsonObject(client, dataBucket, getGameMetaObjectPath(gameSlug), nextMeta, {
    cacheControl: 60,
  });

  return nextMeta;
}

export function computePayloadHash(payload) {
  return crypto.createHash("sha1").update(payload).digest("hex");
}

function normalizePriceRows(rows) {
  return (Array.isArray(rows) ? rows : [])
    .filter((row) => row && row.id != null)
    .map((row) => ({
      id: row.id,
      price: typeof row.price === "number" ? row.price : (row.price ?? null),
      lastUpdate: typeof row.lastUpdate === "number" ? row.lastUpdate : (row.lastUpdate ?? null),
    }))
    .sort((left, right) => String(left?.id ?? "").localeCompare(String(right?.id ?? "")));
}

function normalizeSetFileNameSet(fileNames) {
  if (!Array.isArray(fileNames) || !fileNames.length) return null;

  return new Set(
    fileNames
      .map((fileName) => String(fileName ?? "").trim())
      .filter(Boolean)
  );
}

function normalizeProvidedSetFiles(setFiles) {
  if (!Array.isArray(setFiles) || !setFiles.length) return [];

  return setFiles
    .filter((entry) => String(entry?.fileName ?? "").trim())
    .map((entry) => createSetFileEntry(entry.fileName, entry.cards, entry.raw))
    .sort((left, right) =>
      String(left?.fileName ?? "").localeCompare(
        String(right?.fileName ?? ""),
        undefined,
        { numeric: true, sensitivity: "base" },
      )
    );
}

async function resolveExistingImageSourcePath(card, imagesDir) {
  const candidatePaths = [
    getCardImageObjectPath(card),
    getLegacyCardImageObjectPath(card),
  ]
    .filter(Boolean)
    .map((objectPath, index, collection) => collection.indexOf(objectPath) === index ? objectPath : null)
    .filter(Boolean)
    .map((objectPath) => path.join(imagesDir, objectPath));

  for (const candidatePath of candidatePaths) {
    try {
      await fs.access(candidatePath);
      return candidatePath;
    } catch {
      // try next candidate
    }
  }

  return candidatePaths[0] || null;
}

export async function syncGameStorage(gameSlug, options = {}) {
  const client = options.client || createSupabaseServiceClientFromEnv();
  const dataBucket = options.dataBucket || process.env.TCG_DATA_BUCKET || DEFAULT_TCG_DATA_BUCKET;
  const imagesBucket = options.imagesBucket
    || process.env.TCG_IMAGES_BUCKET
    || DEFAULT_TCG_IMAGES_BUCKET;
  const logger = typeof options.logger === "function" ? options.logger : () => {};
  const nowIso = new Date().toISOString();
  const syncCatalog = options.syncCatalog !== false;
  const syncRawSets = Boolean(options.syncRawSets);
  const syncPrices = Boolean(options.syncPrices);
  const syncImages = Boolean(options.syncImages);
  const readFromStorage = options.readFromStorage !== false;
  const targetedSetFiles = normalizeSetFileNameSet(options.setFileNames);
  const targetedCards = Array.isArray(options.cardsForImages) && options.cardsForImages.length
    ? options.cardsForImages
    : null;
  const existingMeta = (await readGameMetaFromStorage(gameSlug, {
    client,
    dataBucket,
  })) || {};

  logger(`[storage] init game=${gameSlug} dataBucket=${dataBucket} imagesBucket=${imagesBucket} syncCatalog=${syncCatalog} syncRawSets=${syncRawSets} syncPrices=${syncPrices} syncImages=${syncImages}`);

  await ensureStorageBucket(client, dataBucket, {
    public: false,
    fileSizeLimit: "50MB",
  });

  if (syncImages) {
    await ensureStorageBucket(client, imagesBucket, {
      public: true,
      fileSizeLimit: "50MB",
    });
  }

  let setFilesPayload = normalizeProvidedSetFiles(options.setFiles);
  let cards = Array.isArray(options.cards) ? sortCardsById(options.cards) : null;

  const needsSetData = syncCatalog || syncRawSets || (!targetedCards && syncImages);
  if (needsSetData && (!setFilesPayload.length || (syncCatalog && !cards))) {
    const sourceData = readFromStorage
      ? await readGameCardsFromStorage(gameSlug, { client, dataBucket })
      : await readGameCardsFromLocalFiles(gameSlug);

    if (!setFilesPayload.length) setFilesPayload = sourceData.setFiles;
    if (!cards) cards = sourceData.cards;
  }

  if (!cards && setFilesPayload.length) {
    cards = buildGameCatalogFromSetFiles(setFilesPayload);
  }

  const summary = {
    game: gameSlug,
    dataBucket,
    imagesBucket,
    rawSetsUploaded: 0,
    imagesUploaded: 0,
    catalogUploaded: false,
    pricesUploaded: false,
    nextMeta: existingMeta,
  };

  if (syncRawSets && setFilesPayload.length) {
    const rawSetsToUpload = targetedSetFiles
      ? setFilesPayload.filter((entry) => targetedSetFiles.has(entry.fileName))
      : setFilesPayload;

    for (const entry of rawSetsToUpload) {
      logger(`[storage] upload raw-set bucket=${dataBucket} object=${getGameRawSetObjectPath(gameSlug, entry.fileName)} size=${Buffer.byteLength(entry.raw, "utf8")}B`);
      await uploadJsonObject(client, dataBucket, getGameRawSetObjectPath(gameSlug, entry.fileName), entry.raw, {
        cacheControl: 300,
      });
      summary.rawSetsUploaded += 1;
    }
  }

  if (syncCatalog) {
    const catalogCards = cards || buildGameCatalogFromSetFiles(setFilesPayload);
    const cardsPayload = JSON.stringify(catalogCards);
    const catalogHash = computePayloadHash(cardsPayload);
    const catalogChanged = catalogHash !== existingMeta.catalogHash;
    const catalogVersion = catalogChanged
      ? Number(existingMeta.catalogVersion || 0) + 1
      : Number(existingMeta.catalogVersion || 1);

    logger(`[storage] upload catalog bucket=${dataBucket} object=${getGameCatalogObjectPath(gameSlug)} size=${Buffer.byteLength(cardsPayload, "utf8")}B`);
    await uploadJsonObject(client, dataBucket, getGameCatalogObjectPath(gameSlug), cardsPayload, {
      cacheControl: 300,
    });

    summary.catalogUploaded = true;
    summary.nextMeta = {
      ...summary.nextMeta,
      game: gameSlug,
      cardCount: catalogCards.length,
      setCount: setFilesPayload.length || summary.nextMeta.setCount || 0,
      catalogHash,
      catalogVersion,
      catalogUpdatedAt: catalogChanged
        ? nowIso
        : (existingMeta.catalogUpdatedAt || nowIso),
      updatedAt: nowIso,
    };
  }

  if (syncPrices) {
    const priceRows = Array.isArray(options.priceRows)
      ? normalizePriceRows(options.priceRows)
      : (readFromStorage
        ? await readGamePricesFromStorage(gameSlug, { client, dataBucket })
        : await readGamePricesFromLocalFile(gameSlug));
    const pricesPayload = JSON.stringify(priceRows);
    const pricesHash = computePayloadHash(pricesPayload);
    const pricesChanged = pricesHash !== existingMeta.pricesHash;
    const pricesVersion = pricesChanged
      ? Number(existingMeta.pricesVersion || 0) + 1
      : Number(existingMeta.pricesVersion || 1);

    logger(`[storage] upload prices bucket=${dataBucket} object=${getGamePricesObjectPath(gameSlug)} size=${Buffer.byteLength(pricesPayload, "utf8")}B`);
    await uploadJsonObject(client, dataBucket, getGamePricesObjectPath(gameSlug), pricesPayload, {
      cacheControl: 120,
    });

    summary.pricesUploaded = true;
    summary.nextMeta = {
      ...summary.nextMeta,
      pricesCount: priceRows.length,
      pricesHash,
      pricesVersion,
      pricesUpdatedAt: pricesChanged
        ? nowIso
        : (existingMeta.pricesUpdatedAt || nowIso),
      updatedAt: nowIso,
    };
  }

  if (syncImages) {
    const imagesDir = path.resolve(options.imagesDir || resolveGameLocalPaths(gameSlug).imagesDir);
    const imageCards = targetedCards || cards || buildGameCatalogFromSetFiles(setFilesPayload);

    for (const card of imageCards) {
      const sourcePath = await resolveExistingImageSourcePath(card, imagesDir);
      const objectPath = getGameCardImageObjectPath(gameSlug, card);
      if (!sourcePath || !objectPath) continue;

      if (!(await fileExists(sourcePath))) {
        logger(`Immagine mancante, skip: ${sourcePath}`);
        continue;
      }

      const stats = await fs.stat(sourcePath);
      logger(`[storage] upload image bucket=${imagesBucket} object=${objectPath} size=${stats.size}B`);
      await uploadFileObject(client, imagesBucket, objectPath, sourcePath, {
        contentType: "image/webp",
        cacheControl: 31536000,
      });
      summary.imagesUploaded += 1;
    }

    summary.nextMeta = {
      ...summary.nextMeta,
      imagePrefix: getSupportedGameConfig(gameSlug).imagePathPrefix,
      imageCount: targetedCards ? Number(summary.nextMeta.imageCount || 0) : imageCards.length,
      updatedAt: nowIso,
    };
  }

  logger(`[storage] upload meta bucket=${dataBucket} object=${getGameMetaObjectPath(gameSlug)} size=${Buffer.byteLength(JSON.stringify(summary.nextMeta), "utf8")}B`);
  summary.nextMeta = await updateGameMeta(gameSlug, summary.nextMeta, {
    client,
    dataBucket,
    existingMeta,
    nowIso,
  });

  return summary;
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}
