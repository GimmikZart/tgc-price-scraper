import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const DEFAULT_SOURCE_DIR = path.join(process.cwd(), "card-images");
const DEFAULT_CONCURRENCY = 6;
const DEFAULT_QUALITY = 75;

const argv = parseArgs(process.argv.slice(2));

if (argv.help) {
  printHelp();
  process.exit(0);
}

const sourceDir = path.resolve(argv.sourceDir || DEFAULT_SOURCE_DIR);
const concurrency = clampInteger(argv.concurrency || process.env.npm_config_concurrency, DEFAULT_CONCURRENCY, 1);
const quality = clampInteger(argv.quality || process.env.npm_config_quality, DEFAULT_QUALITY, 1, 100);
const verbose = Boolean(argv.verbose || parseBooleanEnv(process.env.npm_config_verbose));

const stats = {
  total: 0,
  written: 0,
  skipped: 0,
  keptOriginal: 0,
  beforeBytes: 0,
  afterBytes: 0,
};

main().catch((error) => {
  console.error("Errore irreversibile durante la ricompressione:", error);
  process.exitCode = 1;
});

async function main() {
  const files = await collectWebpFiles(sourceDir);
  stats.total = files.length;

  if (!files.length) {
    throw new Error(`Nessun file WebP trovato in ${sourceDir}`);
  }

  console.log(`File WebP trovati: ${files.length}`);
  console.log(`Cartella sorgente: ${sourceDir}`);
  console.log(`Qualita WebP: ${quality}`);
  console.log(`Concorrenza: ${concurrency}`);

  let nextIndex = 0;

  await Promise.all(
    Array.from({ length: Math.min(concurrency, files.length) }, async () => {
      while (true) {
        const filePath = files[nextIndex++];
        if (!filePath) return;
        await recompressFile(filePath, quality);
      }
    })
  );

  console.log("");
  console.log("Completato.");
  console.log(`Riscritti: ${stats.written}`);
  console.log(`Saltati: ${stats.skipped}`);
  console.log(`Originale mantenuto: ${stats.keptOriginal}`);
  console.log(`Peso iniziale: ${formatBytes(stats.beforeBytes)}`);
  console.log(`Peso finale: ${formatBytes(stats.afterBytes)}`);
  console.log(`Risparmio: ${formatBytes(stats.beforeBytes - stats.afterBytes)}`);
}

async function collectWebpFiles(rootDir) {
  const files = [];
  const stack = [rootDir];

  while (stack.length) {
    const current = stack.pop();
    const entries = await fs.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) stack.push(fullPath);
      else if (entry.isFile() && fullPath.endsWith(".webp")) files.push(fullPath);
    }
  }

  return files.sort((a, b) => a.localeCompare(b));
}

async function recompressFile(filePath, qualityValue) {
  const input = await fs.readFile(filePath);
  const output = await sharp(input, { failOn: "none" }).webp({
    quality: qualityValue,
    effort: 6,
    smartSubsample: true,
    alphaQuality: 100,
  }).toBuffer();

  stats.beforeBytes += input.byteLength;

  if (output.byteLength >= input.byteLength) {
    stats.keptOriginal += 1;
    stats.afterBytes += input.byteLength;
    logProgress("keep", filePath);
    return;
  }

  await fs.writeFile(filePath, output);
  stats.written += 1;
  stats.afterBytes += output.byteLength;
  logProgress("ok", `${filePath} -> ${formatBytes(output.byteLength)}`);
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

function clampInteger(value, fallback, min, max = Number.MAX_SAFE_INTEGER) {
  const number = Number.parseInt(value, 10);
  if (Number.isNaN(number)) return fallback;
  return Math.min(Math.max(number, min), max);
}

function parseBooleanEnv(value) {
  if (typeof value !== "string") return false;
  return ["1", "true", "yes"].includes(value.trim().toLowerCase());
}

function logProgress(status, detail) {
  const done = stats.written + stats.keptOriginal + stats.skipped;
  const shouldLog = verbose || done <= 10 || done === stats.total || done % 100 === 0;
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

function printHelp() {
  console.log(`
Uso:
  node scripts/recompress-card-images.js [opzioni]

Opzioni:
  --sourceDir=<cartella>     Cartella contenente i WebP. Default: ./card-images
  --quality=<1-100>          Qualita WebP. Default: 75
  --concurrency=<numero>     File processati in parallelo. Default: 6
  --verbose                  Logga piu dettagli
  --help                     Mostra questo messaggio
`);
}
