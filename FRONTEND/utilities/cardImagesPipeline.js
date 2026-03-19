import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { getCardImageObjectPath } from "./cardImageStorage.js";

export const DEFAULT_CARD_IMAGES_DIR = path.join(process.cwd(), ".cache", "tcg-images");
export const DEFAULT_CARD_IMAGES_CONCURRENCY = 4;
export const DEFAULT_CARD_IMAGES_QUALITY = 75;
export const DEFAULT_CARD_IMAGES_RETRIES = 3;

export function createCardImageTasks(cards, options = {}) {
  const outputDir = path.resolve(options.outputDir || DEFAULT_CARD_IMAGES_DIR);

  return cards.reduce(
    (accumulator, card) => {
      const imageUrl = typeof card?.image === "string" ? card.image.trim() : "";
      const cardId = typeof card?.id === "string" ? card.id.trim() : "";
      const setName = typeof card?.setName === "string" ? card.setName.trim() : "";

      if (!imageUrl || !cardId || !setName) {
        accumulator.missingMetadata += 1;
        return accumulator;
      }

      const imageObjectPath = getCardImageObjectPath(card);
      if (!imageObjectPath) {
        accumulator.missingMetadata += 1;
        return accumulator;
      }

      accumulator.tasks.push({
        card,
        cardId,
        setName,
        imageUrl,
        destination: path.join(outputDir, imageObjectPath),
      });
      return accumulator;
    },
    { tasks: [], missingMetadata: 0 }
  );
}

export async function downloadAndStoreCardImages(cards, options = {}) {
  const outputDir = path.resolve(options.outputDir || DEFAULT_CARD_IMAGES_DIR);
  const concurrency = clampInteger(
    options.concurrency,
    DEFAULT_CARD_IMAGES_CONCURRENCY,
    1
  );
  const quality = clampInteger(options.quality, DEFAULT_CARD_IMAGES_QUALITY, 1, 100);
  const retries = clampInteger(options.retries, DEFAULT_CARD_IMAGES_RETRIES, 1);
  const force = Boolean(options.force);
  const onProgress =
    typeof options.onProgress === "function" ? options.onProgress : null;

  await fs.mkdir(outputDir, { recursive: true });

  const { tasks, missingMetadata } = createCardImageTasks(cards, { outputDir });
  const summary = {
    totalCards: Array.isArray(cards) ? cards.length : 0,
    totalTasks: tasks.length,
    missingMetadata,
    written: 0,
    skipped: 0,
    failed: 0,
    downloadBytes: 0,
    outputBytes: 0,
    failures: [],
    outputDir,
  };

  if (!tasks.length) {
    return summary;
  }

  let nextIndex = 0;

  await Promise.all(
    Array.from({ length: Math.min(concurrency, tasks.length) }, async () => {
      while (true) {
        const task = tasks[nextIndex++];
        if (!task) return;

        await processCardImageTask(task, {
          force,
          quality,
          retries,
          summary,
          onProgress,
        });
      }
    })
  );

  return summary;
}

async function processCardImageTask(task, options) {
  const outputExists = await fileExists(task.destination);

  if (outputExists && !options.force) {
    options.summary.skipped += 1;
    notifyProgress(options.onProgress, "skip", task, options.summary);
    return;
  }

  try {
    await fs.mkdir(path.dirname(task.destination), { recursive: true });

    const sourceBuffer = await fetchWithRetry(task.imageUrl, options.retries);
    const outputBuffer = await sharp(sourceBuffer, { failOn: "none" })
      .webp({
        quality: options.quality,
        effort: 6,
        smartSubsample: true,
        alphaQuality: 100,
      })
      .toBuffer();

    await fs.writeFile(task.destination, outputBuffer);

    options.summary.written += 1;
    options.summary.downloadBytes += sourceBuffer.byteLength;
    options.summary.outputBytes += outputBuffer.byteLength;
    notifyProgress(options.onProgress, "ok", task, options.summary);
  } catch (error) {
    options.summary.failed += 1;
    options.summary.failures.push({
      cardId: task.cardId,
      destination: task.destination,
      error: error instanceof Error ? error.message : String(error),
    });
    notifyProgress(options.onProgress, "err", task, options.summary, error);
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

function notifyProgress(callback, status, task, summary, error = null) {
  if (!callback) return;

  const processed = summary.written + summary.skipped + summary.failed;
  callback({
    status,
    task,
    summary,
    processed,
    total: summary.totalTasks,
    error: error instanceof Error ? error : null,
  });
}

function clampInteger(value, fallback, min, max = Number.MAX_SAFE_INTEGER) {
  const number = Number.parseInt(value, 10);
  if (Number.isNaN(number)) return fallback;
  return Math.min(Math.max(number, min), max);
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export function formatBytes(bytes) {
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
