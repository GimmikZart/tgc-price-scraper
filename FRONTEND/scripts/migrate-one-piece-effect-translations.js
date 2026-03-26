import fs from "node:fs/promises";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import {
  getCardEffectText,
  normalizeCardEffect,
} from "../utilities/cardEffect.js";
import {
  containsSuspiciousTranslationPatterns,
  refineOnePieceItalianEffectTranslation,
} from "../utilities/onePieceEffectTranslation.js";

const TARGET_DIRECTORIES = [
  path.resolve(process.cwd(), "data", "cards", "one_piece_tgc"),
  path.resolve(process.cwd(), ".cache", "tcg-workspace", "one-piece", "sets"),
];
const CACHE_FILE = path.resolve(
  process.cwd(),
  "tmp",
  "effect-translation-cache",
  "one-piece-effect-it.json",
);
const SEPARATOR = "__CARD_EFFECT_TRANSLATION_SEPARATOR__";
const BATCH_CHAR_LIMIT = 3200;
const REQUEST_HEADERS = {
  "User-Agent": "Mozilla/5.0",
};
const PROTECTED_SEGMENT_PATTERNS = [
  { pattern: /\[[^[\]]+\]/g, replacement: (match) => match },
  { pattern: /\{[^{}]+\}/g, replacement: (match) => match },
  { pattern: /DON!! deck/gi, replacement: () => "mazzo DON!!" },
  { pattern: /DON!! cards/gi, replacement: () => "carte DON!!" },
  { pattern: /DON!! card/gi, replacement: () => "carta DON!!" },
  { pattern: /DON!!/g, replacement: () => "DON!!" },
  { pattern: /Life cards/gi, replacement: () => "carte Life" },
  { pattern: /Life area/gi, replacement: () => "area Life" },
  { pattern: /base power/gi, replacement: () => "power base" },
  { pattern: /base cost/gi, replacement: () => "costo base" },
  { pattern: /\bpower\b/gi, replacement: () => "power" },
  { pattern: /\b[Tt]rash\b/g, replacement: () => "Trash" },
  { pattern: /\bTrigger\b/g, replacement: () => "Trigger" },
  { pattern: /\bCounter\b/g, replacement: () => "Counter" },
  { pattern: /K\.O\./g, replacement: () => "K.O." },
  { pattern: /face-down/gi, replacement: () => "coperta" },
  { pattern: /face-up/gi, replacement: () => "scoperta" },
];

main().catch((error) => {
  console.error("Migrazione effect fallita:", error);
  process.exitCode = 1;
});

async function main() {
  const cache = await readCache();
  const workspace = await readWorkspace();
  const uniqueEffects = collectUniqueEnglishEffects(workspace);
  let refinedCacheEntries = 0;

  for (const englishEffect of Object.keys(cache)) {
    const refinedTranslation = refineOnePieceItalianEffectTranslation(
      englishEffect,
      cache[englishEffect],
    );

    if (refinedTranslation && refinedTranslation !== cache[englishEffect]) {
      cache[englishEffect] = refinedTranslation;
      refinedCacheEntries += 1;
    }
  }

  console.log(`File letti: ${workspace.files.length}`);
  console.log(`Effetti inglesi unici trovati: ${uniqueEffects.length}`);
  console.log(`Traduzioni in cache rifinite localmente: ${refinedCacheEntries}`);

  const effectsToRefresh = uniqueEffects.filter((effect) => {
    const cachedTranslation = normalizeText(cache[effect]);
    if (!cachedTranslation) return true;
    return containsSuspiciousTranslationPatterns(cachedTranslation);
  });
  console.log(`Traduzioni italiane da rigenerare o correggere: ${effectsToRefresh.length}`);

  if (refinedCacheEntries > 0 && effectsToRefresh.length === 0) {
    await writeCache(cache);
  }

  if (effectsToRefresh.length > 0) {
    await translateMissingEffects(effectsToRefresh, cache);
    await writeCache(cache);
  }

  await writeMigratedWorkspace(workspace, cache);
  console.log("Migrazione completata.");
}

async function readWorkspace() {
  const files = [];

  for (const directory of TARGET_DIRECTORIES) {
    const fileNames = (await fs.readdir(directory))
      .filter((fileName) => fileName.endsWith(".json"))
      .sort((left, right) => left.localeCompare(right, undefined, { numeric: true }));

    for (const fileName of fileNames) {
      const filePath = path.join(directory, fileName);
      const raw = await fs.readFile(filePath, "utf8");
      files.push({
        directory,
        fileName,
        filePath,
        cards: JSON.parse(raw),
      });
    }
  }

  return { files };
}

function collectUniqueEnglishEffects(workspace) {
  const effects = new Set();

  for (const file of workspace.files) {
    for (const card of file.cards) {
      const englishEffect = getCardEffectText(card.effect, "en");
      if (englishEffect) effects.add(englishEffect);
    }
  }

  return [...effects].sort((left, right) => left.localeCompare(right));
}

async function translateMissingEffects(effectsToRefresh, cache) {
  const batches = chunkEffectsBySize(effectsToRefresh);

  for (let index = 0; index < batches.length; index += 1) {
    const batch = batches[index];
    const translatedBatch = await translateBatch(batch);

    for (let batchIndex = 0; batchIndex < batch.length; batchIndex += 1) {
      const englishEffect = batch[batchIndex];
      const italianEffect = normalizeText(
        refineOnePieceItalianEffectTranslation(englishEffect, translatedBatch[batchIndex]),
      );

      if (!italianEffect) {
        throw new Error(`Traduzione italiana vuota per effect: ${englishEffect}`);
      }

      cache[englishEffect] = italianEffect;
    }

    await writeCache(cache);
    console.log(`Batch ${index + 1}/${batches.length} completato (${batch.length} effect).`);
    await delay(150);
  }
}

function chunkEffectsBySize(effects) {
  const chunks = [];
  let currentChunk = [];
  let currentLength = 0;

  for (const effect of effects) {
    const protectedEffect = protectEffectSegments(effect);
    const estimatedLength = protectedEffect.protectedText.length + SEPARATOR.length + 4;

    if (currentChunk.length > 0 && currentLength + estimatedLength > BATCH_CHAR_LIMIT) {
      chunks.push(currentChunk);
      currentChunk = [];
      currentLength = 0;
    }

    currentChunk.push(effect);
    currentLength += estimatedLength;
  }

  if (currentChunk.length > 0) {
    chunks.push(currentChunk);
  }

  return chunks;
}

async function translateBatch(effects) {
  const protectedEffects = effects.map((effect) => protectEffectSegments(effect));
  const requestPayload = protectedEffects
    .map((entry) => entry.protectedText)
    .join(`\n${SEPARATOR}\n`);

  const translatedPayload = await requestTranslation(requestPayload);
  const translatedParts = translatedPayload.split(`\n${SEPARATOR}\n`);

  if (translatedParts.length !== effects.length) {
    throw new Error(
      `Numero traduzioni inatteso: attese ${effects.length}, ricevute ${translatedParts.length}.`,
    );
  }

  return translatedParts.map((translatedPart, index) =>
    cleanupTranslatedEffect(
      effects[index],
      restoreProtectedSegments(translatedPart, protectedEffects[index].placeholders),
    ),
  );
}

async function requestTranslation(payload, attempt = 0) {
  const url = new URL("https://translate.googleapis.com/translate_a/single");
  url.searchParams.set("client", "gtx");
  url.searchParams.set("sl", "en");
  url.searchParams.set("tl", "it");
  url.searchParams.set("dt", "t");
  url.searchParams.set("q", payload);

  try {
    const response = await fetch(url, {
      headers: REQUEST_HEADERS,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const body = await response.json();
    const translatedText = Array.isArray(body?.[0])
      ? body[0].map((chunk) => chunk?.[0] ?? "").join("")
      : "";

    const normalizedTranslation = normalizeText(translatedText);
    if (!normalizedTranslation) {
      throw new Error("Risposta traduzione vuota.");
    }

    return normalizedTranslation;
  } catch (error) {
    if (attempt >= 3) {
      throw error;
    }

    await delay(500 * (attempt + 1));
    return requestTranslation(payload, attempt + 1);
  }
}

function protectEffectSegments(effect) {
  let protectedText = String(effect ?? "");
  const placeholders = [];
  let placeholderIndex = 0;

  for (const entry of PROTECTED_SEGMENT_PATTERNS) {
    protectedText = protectedText.replace(entry.pattern, (match) => {
      const placeholderKey = `@@${placeholderIndex}@@`;
      const replacement = typeof entry.replacement === "function"
        ? entry.replacement(match)
        : entry.replacement;

      placeholders.push([placeholderKey, replacement]);
      placeholderIndex += 1;
      return placeholderKey;
    });
  }

  return {
    protectedText,
    placeholders,
  };
}

function restoreProtectedSegments(text, placeholders) {
  return placeholders.reduce(
    (currentText, [placeholderKey, replacement]) =>
      currentText.replaceAll(placeholderKey, replacement),
    String(text ?? ""),
  );
}

function cleanupTranslatedEffect(englishEffect, italianEffect) {
  return refineOnePieceItalianEffectTranslation(englishEffect, italianEffect);
}

async function writeMigratedWorkspace(workspace, cache) {
  for (const file of workspace.files) {
    const nextCards = file.cards.map((card) => migrateCardEffect(card, cache));
    await fs.writeFile(file.filePath, JSON.stringify(nextCards, null, 2), "utf8");
    console.log(`Aggiornato ${file.filePath}`);
  }
}

function migrateCardEffect(card, cache) {
  const englishEffect = getCardEffectText(card.effect, "en");

  if (!englishEffect) {
    return {
      ...card,
      effect: null,
    };
  }

  const existingEffect = normalizeCardEffect(card.effect) ?? {};
  const italianEffect = normalizeText(cache[englishEffect]) ?? normalizeText(existingEffect.it);

  if (!italianEffect) {
    throw new Error(`Traduzione italiana mancante per effect: ${englishEffect}`);
  }

  return {
    ...card,
    effect: {
      en: englishEffect,
      it: refineOnePieceItalianEffectTranslation(englishEffect, italianEffect),
    },
  };
}

async function readCache() {
  try {
    const raw = await fs.readFile(CACHE_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch (error) {
    if (error?.code === "ENOENT") return {};
    throw error;
  }
}

async function writeCache(cache) {
  await fs.mkdir(path.dirname(CACHE_FILE), { recursive: true });
  await fs.writeFile(CACHE_FILE, JSON.stringify(cache, null, 2), "utf8");
}

function normalizeText(value) {
  if (typeof value !== "string") return null;

  const trimmedValue = value.trim();
  return trimmedValue ? trimmedValue : null;
}
