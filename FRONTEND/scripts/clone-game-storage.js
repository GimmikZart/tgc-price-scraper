import "dotenv/config";
import path from "node:path";
import { config as loadEnvFile } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import {
  DEFAULT_TCG_DATA_BUCKET,
  DEFAULT_TCG_IMAGES_BUCKET,
  getSupportedGameConfig,
} from "../utilities/tcgGameConfig.js";
import {
  downloadTextObject,
  ensureStorageBucket,
  listGameRawSetFileNamesFromStorage,
  readGameCardsFromStorage,
  uploadJsonObject,
} from "../utilities/gameStorageSync.js";
import {
  getGameCatalogObjectPath,
  getGameCardImageObjectPath,
  getGameCardImageObjectPathCandidates,
  getGameMetaObjectPath,
  getGamePricesObjectPath,
  getGameRawSetObjectPath,
} from "../utilities/tcgStorage.js";

const argv = parseArgs(process.argv.slice(2));

if (argv.help) {
  printHelp();
  process.exit(0);
}

const gameSlug = String(argv.game || "").trim();
if (!gameSlug) {
  console.error("Devi specificare --game=<slug>, ad esempio --game=one-piece.");
  printHelp();
  process.exit(1);
}

main().catch((error) => {
  console.error("Errore irreversibile durante la clonazione storage:", error);
  process.exitCode = 1;
});

async function main() {
  getSupportedGameConfig(gameSlug);

  const sourceEnvFile = loadOptionalEnvFile(argv["source-env-file"]);
  const targetEnvFile = loadOptionalEnvFile(argv["target-env-file"]);
  const source = resolveClientConfig("source", sourceEnvFile);
  const target = resolveClientConfig("target", targetEnvFile);
  const sourceClient = createServiceClient(source.url, source.serviceRoleKey);
  const targetClient = createServiceClient(target.url, target.serviceRoleKey);
  const dataOnly = Boolean(argv["data-only"]);
  const imagesOnly = Boolean(argv["images-only"]);
  const copyData = !imagesOnly;
  const copyImages = !dataOnly;

  if (!copyData && !copyImages) {
    throw new Error("Hai disattivato sia dati che immagini: non c'e nulla da clonare.");
  }

  console.log(`Clonazione gioco: ${gameSlug}`);
  console.log(`Source: ${source.url}`);
  console.log(`Target: ${target.url}`);
  console.log(`Bucket data: ${source.dataBucket} -> ${target.dataBucket}`);
  console.log(`Bucket images: ${source.imagesBucket} -> ${target.imagesBucket}`);

  await ensureStorageBucket(targetClient, target.dataBucket, {
    public: false,
    fileSizeLimit: "50MB",
  });

  if (copyImages) {
    await ensureStorageBucket(targetClient, target.imagesBucket, {
      public: true,
      fileSizeLimit: "50MB",
    });
  }

  const summary = {
    game: gameSlug,
    dataObjectsCopied: 0,
    imageObjectsCopied: 0,
  };

  if (copyData) {
    const dataObjectPaths = [
      getGameMetaObjectPath(gameSlug),
      getGameCatalogObjectPath(gameSlug),
      getGamePricesObjectPath(gameSlug),
    ];

    const rawSetFileNames = await listGameRawSetFileNamesFromStorage(gameSlug, {
      client: sourceClient,
      dataBucket: source.dataBucket,
    });

    dataObjectPaths.push(
      ...rawSetFileNames.map((fileName) => getGameRawSetObjectPath(gameSlug, fileName)),
    );

    for (const objectPath of dataObjectPaths) {
      const payload = await downloadTextObject(sourceClient, source.dataBucket, objectPath);
      if (payload == null) {
        console.log(`[skip:data] ${objectPath} non trovato su source`);
        continue;
      }

      console.log(`[copy:data] ${objectPath}`);
      await uploadJsonObject(targetClient, target.dataBucket, objectPath, payload, {
        cacheControl: objectPath.endsWith("prices.min.json") ? 120 : 300,
      });
      summary.dataObjectsCopied += 1;
    }
  }

  if (copyImages) {
    const sourceStorageData = await readGameCardsFromStorage(gameSlug, {
      client: sourceClient,
      dataBucket: source.dataBucket,
    });
    const imageEntries = buildImageCloneEntries(gameSlug, sourceStorageData.cards);

    for (const entry of imageEntries) {
      const { objectPath, sourceCandidates } = entry;
      let buffer = null;
      let matchedSourcePath = null;

      for (const sourcePath of sourceCandidates) {
        buffer = await downloadBufferObject(sourceClient, source.imagesBucket, sourcePath);
        if (!buffer) continue;

        matchedSourcePath = sourcePath;
        break;
      }

      if (!buffer) {
        console.log(`[skip:image] ${sourceCandidates.join(" | ")} non trovato su source`);
        continue;
      }

      if (matchedSourcePath !== objectPath) {
        console.log(`[copy:image] ${matchedSourcePath} -> ${objectPath}`);
      } else {
        console.log(`[copy:image] ${objectPath}`);
      }

      await uploadBufferObject(targetClient, target.imagesBucket, objectPath, buffer, {
        contentType: guessContentType(objectPath),
        cacheControl: 31536000,
      });
      summary.imageObjectsCopied += 1;
    }
  }

  console.log("");
  console.log("Clonazione completata.");
  console.log(JSON.stringify(summary, null, 2));
}

function createServiceClient(url, serviceRoleKey) {
  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function loadOptionalEnvFile(filePath) {
  if (!filePath) return {};

  const resolvedPath = path.resolve(process.cwd(), String(filePath));
  const result = loadEnvFile({ path: resolvedPath, override: false });
  if (result.error) {
    throw result.error;
  }

  return result.parsed || {};
}

function resolveClientConfig(role, envFileVars) {
  const upperRole = role.toUpperCase();
  const url =
    process.env[`${upperRole}_SUPABASE_URL`] ||
    envFileVars.SUPABASE_URL ||
    (role === "target" ? process.env.SUPABASE_URL : "");
  const serviceRoleKey =
    process.env[`${upperRole}_SUPABASE_SERVICE_ROLE_KEY`] ||
    envFileVars.SUPABASE_SERVICE_ROLE_KEY ||
    (role === "target" ? process.env.SUPABASE_SERVICE_ROLE_KEY : "");
  const dataBucket =
    process.env[`${upperRole}_TCG_DATA_BUCKET`] ||
    envFileVars.TCG_DATA_BUCKET ||
    process.env.TCG_DATA_BUCKET ||
    DEFAULT_TCG_DATA_BUCKET;
  const imagesBucket =
    process.env[`${upperRole}_TCG_IMAGES_BUCKET`] ||
    envFileVars.TCG_IMAGES_BUCKET ||
    process.env.TCG_IMAGES_BUCKET ||
    DEFAULT_TCG_IMAGES_BUCKET;

  if (!url || !serviceRoleKey) {
    throw new Error(
      role === "source"
        ? "Config source mancante: usa SOURCE_SUPABASE_URL / SOURCE_SUPABASE_SERVICE_ROLE_KEY o --source-env-file."
        : "Config target mancante: usa TARGET_SUPABASE_URL / TARGET_SUPABASE_SERVICE_ROLE_KEY, --target-env-file o il tuo .env corrente.",
    );
  }

  return {
    url,
    serviceRoleKey,
    dataBucket,
    imagesBucket,
  };
}

async function downloadBufferObject(client, bucketName, objectPath) {
  const { data, error } = await client.storage.from(bucketName).download(objectPath);
  if (error || !data) return null;

  const arrayBuffer = await data.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function uploadBufferObject(client, bucketName, objectPath, buffer, options = {}) {
  const { error } = await client.storage.from(bucketName).upload(objectPath, buffer, {
    upsert: true,
    contentType: options.contentType || "application/octet-stream",
    cacheControl: String(options.cacheControl ?? 3600),
  });

  if (error) throw error;
}

function guessContentType(objectPath) {
  const lowerPath = String(objectPath || "").toLowerCase();
  if (lowerPath.endsWith(".webp")) return "image/webp";
  if (lowerPath.endsWith(".json")) return "application/json; charset=utf-8";
  return "application/octet-stream";
}

function buildImageCloneEntries(gameSlug, cards) {
  const groupedEntries = new Map();

  for (const card of Array.isArray(cards) ? cards : []) {
    const objectPath = getGameCardImageObjectPath(gameSlug, card);
    if (!objectPath) continue;

    const sourceCandidates = getGameCardImageObjectPathCandidates(gameSlug, card, {
      includeLowercase: true,
    });

    if (!groupedEntries.has(objectPath)) {
      groupedEntries.set(objectPath, new Set());
    }

    for (const sourcePath of sourceCandidates) {
      groupedEntries.get(objectPath).add(sourcePath);
    }
  }

  return Array.from(groupedEntries.entries()).map(([objectPath, sourceCandidates]) => ({
    objectPath,
    sourceCandidates: [...sourceCandidates],
  }));
}

function parseArgs(args) {
  return args.reduce((acc, arg) => {
    if (!arg.startsWith("--")) return acc;
    const [rawKey, rawValue] = arg.slice(2).split("=", 2);
    const key = rawKey.trim();
    const value = rawValue === undefined ? true : rawValue.trim();
    acc[key] = value;
    return acc;
  }, {});
}

function printHelp() {
  console.log(`
Uso:
  npm run storage:clone-game -- --game=one-piece --source-env-file=.env.prod --target-env-file=.env.local

Opzioni:
  --game=<slug>                 Slug del gioco da clonare
  --source-env-file=<file>      File env sorgente, es. .env.prod
  --target-env-file=<file>      File env destinazione, es. .env.local
  --data-only                   Copia solo tcg-data
  --images-only                 Copia solo tcg-images
  --help                        Mostra questo messaggio

Override via env:
  SOURCE_SUPABASE_URL
  SOURCE_SUPABASE_SERVICE_ROLE_KEY
  SOURCE_TCG_DATA_BUCKET
  SOURCE_TCG_IMAGES_BUCKET
  TARGET_SUPABASE_URL
  TARGET_SUPABASE_SERVICE_ROLE_KEY
  TARGET_TCG_DATA_BUCKET
  TARGET_TCG_IMAGES_BUCKET
`);
}
