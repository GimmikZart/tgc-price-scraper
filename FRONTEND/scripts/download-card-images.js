import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const DEFAULT_SOURCE_DIR = path.join(process.cwd(), "data", "cards", "one_piece_tgc");
const DEFAULT_OUTPUT_DIR = path.join(process.cwd(), "card-images");
const DEFAULT_CONCURRENCY = 4;
const DEFAULT_QUALITY = 75;
const DEFAULT_RETRIES = 3;

const argv = parseArgs(process.argv.slice(2));

if (argv.help) {
  printHelp();
  process.exit(0);
}

const sourceDir = path.resolve(argv.sourceDir || DEFAULT_SOURCE_DIR);
const outputDir = path.resolve(argv.outputDir || DEFAULT_OUTPUT_DIR);
const setFilter = normalizeSetFilter(
  argv.set || argv.expansion || argv.setFile || process.env.npm_config_set || process.env.npm_config_expansion
);
const concurrency = clampInteger(argv.concurrency || process.env.npm_config_concurrency, DEFAULT_CONCURRENCY, 1);
const limit = clampInteger(argv.limit || process.env.npm_config_limit, null, 1);
const quality = clampInteger(argv.quality || process.env.npm_config_quality, DEFAULT_QUALITY, 1, 100);
const retries = clampInteger(argv.retries || process.env.npm_config_retries, DEFAULT_RETRIES, 1);
const force = Boolean(argv.force || parseBooleanEnv(process.env.npm_config_force));
const verbose = Boolean(argv.verbose || parseBooleanEnv(process.env.npm_config_verbose));

const stats = {
  total: 0,
  written: 0,
  skipped: 0,
  failed: 0,
  downloadBytes: 0,
  outputBytes: 0,
};

const failures = [];

main().catch((error) => {
  console.error("Errore irreversibile durante il download delle immagini:", error);
  process.exitCode = 1;
});

async function main() {
  await fs.mkdir(outputDir, { recursive: true });

  const setFiles = await getSetFiles(sourceDir, setFilter);
  if (!setFiles.length) {
    throw new Error(`Nessun file set trovato in ${sourceDir}`);
  }

  const tasks = await buildTasks(setFiles, outputDir, limit);
  stats.total = tasks.length;

  if (!tasks.length) {
    console.log("Nessuna immagine da processare.");
    return;
  }

  console.log(`Set trovati: ${setFiles.length}`);
  console.log(`Immagini da processare: ${tasks.length}`);
  console.log(`Cartella output: ${outputDir}`);
  console.log(`Concorrenza: ${concurrency}`);
  console.log(`Qualita WebP: ${quality}`);
  console.log(`Force overwrite: ${force ? "si" : "no"}`);

  let nextTaskIndex = 0;

  await Promise.all(
    Array.from({ length: Math.min(concurrency, tasks.length) }, async () => {
      while (true) {
        const task = tasks[nextTaskIndex++];
        if (!task) return;
        await processTask(task, { force, quality, retries });
      }
    })
  );

  console.log("");
  console.log("Completato.");
  console.log(`Scritti: ${stats.written}`);
  console.log(`Saltati: ${stats.skipped}`);
  console.log(`Falliti: ${stats.failed}`);
  console.log(`Download totale: ${formatBytes(stats.downloadBytes)}`);
  console.log(`Output totale: ${formatBytes(stats.outputBytes)}`);

  if (failures.length) {
    console.log("");
    console.log("Prime immagini fallite:");
    for (const failure of failures.slice(0, 20)) {
      console.log(`- ${failure.destination}: ${failure.error}`);
    }
    process.exitCode = 1;
  }
}

async function getSetFiles(directory, filter) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .map((entry) => ({
      name: entry.name,
      path: path.join(directory, entry.name),
      baseName: path.basename(entry.name, ".json"),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  if (!filter) return files;

  return files.filter((file) => {
    const lowerName = file.name.toLowerCase();
    const lowerBase = file.baseName.toLowerCase();
    return lowerName === filter || lowerBase === filter;
  });
}

async function buildTasks(setFiles, baseOutputDir, limitCount) {
  const tasks = [];

  for (const setFile of setFiles) {
    const raw = await fs.readFile(setFile.path, "utf8");
    const cards = JSON.parse(raw);
    const setOutputDir = path.join(baseOutputDir, sanitizePathSegment(setFile.baseName));

    for (const card of cards) {
      const imageUrl = typeof card.image === "string" ? card.image.trim() : "";
      const cardId = typeof card.id === "string" ? card.id.trim() : "";

      if (!imageUrl || !cardId) continue;

      tasks.push({
        imageUrl,
        destination: path.join(setOutputDir, `${sanitizePathSegment(cardId)}.webp`),
      });

      if (limitCount && tasks.length >= limitCount) {
        return tasks;
      }
    }
  }

  return tasks;
}

async function processTask(task, options) {
  const { destination, imageUrl } = task;
  const outputExists = await fileExists(destination);

  if (outputExists && !options.force) {
    stats.skipped += 1;
    logProgress("skip", destination);
    return;
  }

  try {
    await fs.mkdir(path.dirname(destination), { recursive: true });

    const sourceBuffer = await fetchWithRetry(imageUrl, options.retries);
    const outputBuffer = await sharp(sourceBuffer, { failOn: "none" })
      .webp({
        quality: options.quality,
        effort: 6,
        smartSubsample: true,
        alphaQuality: 100,
      })
      .toBuffer();

    await fs.writeFile(destination, outputBuffer);

    stats.written += 1;
    stats.downloadBytes += sourceBuffer.byteLength;
    stats.outputBytes += outputBuffer.byteLength;
    logProgress("ok", destination);
  } catch (error) {
    stats.failed += 1;
    failures.push({
      destination,
      error: error instanceof Error ? error.message : String(error),
    });
    logProgress("err", `${destination} -> ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function fetchWithRetry(url, retries) {
  let lastError = null;

  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: {
          "user-agent": "DeckspediaImageMirror/1.0",
          accept: "image/avif,image/webp,image/apng,image/png,image/*,*/*;q=0.8",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (error) {
      lastError = error;
      if (attempt < retries) {
        await sleep(500 * attempt);
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
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

function normalizeSetFilter(value) {
  if (!value || typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return null;
  return normalized.endsWith(".json") ? normalized : `${normalized}.json`;
}

function sanitizePathSegment(value) {
  return value
    .replace(/[<>:"/\\|?*]/g, "_")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[. ]+$/g, "");
}

function clampInteger(value, fallback, min, max = Number.MAX_SAFE_INTEGER) {
  if (value === null) return null;
  const number = Number.parseInt(value, 10);
  if (Number.isNaN(number)) return fallback;
  return Math.min(Math.max(number, min), max);
}

function parseBooleanEnv(value) {
  if (typeof value !== "string") return false;
  return ["1", "true", "yes"].includes(value.trim().toLowerCase());
}

function logProgress(status, detail) {
  const done = stats.written + stats.skipped + stats.failed;
  const shouldLog = verbose || status === "err" || done <= 10 || done === stats.total || done % 25 === 0;
  if (!shouldLog) return;
  console.log(`[${done}/${stats.total}] ${status} ${detail}`);
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(2)} ${units[unitIndex]}`;
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function printHelp() {
  console.log(`
Uso:
  node scripts/download-card-images.js [opzioni]

Opzioni:
  --set=<nome-file-json>     Processa un solo file set, es. 008_booster_pack_two_legends_op08
  --expansion=<nome-file>    Alias di --set, utile anche via npm run
  --outputDir=<cartella>     Cartella di output. Default: ./card-images
  --sourceDir=<cartella>     Cartella sorgente JSON. Default: ./data/cards/one_piece_tgc
  --limit=<numero>           Limita il numero totale di immagini da processare
  --concurrency=<numero>     Numero di download paralleli. Default: 4
  --quality=<1-100>          Qualita WebP. Default: 92
  --retries=<numero>         Numero tentativi per download falliti. Default: 3
  --force                    Sovrascrive i file gia presenti
  --verbose                  Logga ogni singola immagine processata
  --help                     Mostra questo messaggio
`);
}
