import fs from "node:fs/promises";
import path from "node:path";
import { config as loadEnvFile } from "dotenv";
import { downloadAndStoreCardImages } from "../utilities/cardImagesPipeline.js";
import { createCardTraderSlugEntry } from "../utilities/cardTraderSlug.js";
import {
  buildGameCatalogFromSetFiles,
  readGameCardsFromLocalFiles,
  syncGameStorage,
  resolveGameLocalPaths,
} from "../utilities/gameStorageSync.js";
import { DEFAULT_ONE_PIECE_GAME_SLUG } from "../utilities/tcgGameConfig.js";

const GAME_SLUG = DEFAULT_ONE_PIECE_GAME_SLUG;
const LOCAL_ENV_FILE = ".env.local";
const DON_TYPE = "Don!!";
const REPORTS_DIR = path.resolve(".cache", "reports");
const CARDTRADER_BLUEPRINTS_URL = "https://www.cardtrader.com/en/manasearch/15/blueprints.json";
const EXCLUDED_BLUEPRINT_GROUPS = new Set(["jppromo", "jp", "opch"]);
const PROMOTION_GROUPS = new Set([
  "op05p1st",
  "op09a",
  "op13a",
  "op12p",
  "opchp",
  "promo",
  "stp",
  "optp",
  "opwp",
  "up",
]);
const OTHER_PRODUCT_GROUPS = new Set(["oppr", "bandai", "oppcc"]);

const argv = parseArgs(process.argv.slice(2));
const envFile = String(argv["env-file"] || LOCAL_ENV_FILE).trim() || LOCAL_ENV_FILE;
const isDryRun = Boolean(argv["dry-run"]);

loadEnvFile({ path: path.resolve(process.cwd(), envFile), override: true });

main().catch((error) => {
  console.error("Errore irreversibile durante lo scraping dei DON!!:", error);
  process.exitCode = 1;
});

async function main() {
  const workspace = await readGameCardsFromLocalFiles(GAME_SLUG);
  const directTargets = buildDirectTargets(workspace.setFiles);
  const blueprintRows = await loadCardTraderDonBlueprints();
  const mappedRows = [];
  const skippedRows = [];

  for (const blueprint of blueprintRows) {
    const resolution = resolveBlueprintTarget(blueprint, directTargets);
    if (!resolution) {
      skippedRows.push({
        blueprintId: blueprint.id,
        blueprintName: blueprint.n,
        expansionName: blueprint.x,
        expansionCode: blueprint.xx,
        reason: "no-target",
      });
      continue;
    }

    if (resolution.skipReason) {
      skippedRows.push({
        blueprintId: blueprint.id,
        blueprintName: blueprint.n,
        expansionName: blueprint.x,
        expansionCode: blueprint.xx,
        reason: resolution.skipReason,
      });
      continue;
    }

    mappedRows.push({
      blueprint,
      resolution,
    });
  }

  const resolvedMappedRows = await resolveMappedImageUrls(mappedRows);

  const groupedByFile = groupMappedRowsByFile(resolvedMappedRows);
  const touchedFiles = [];

  for (const setFile of workspace.setFiles) {
    const additions = groupedByFile.get(setFile.fileName);
    if (!additions?.length) continue;
    touchedFiles.push(setFile.fileName);
  }

  const imageCards = resolvedMappedRows.map((entry) => entry.card);
  const { imagesDir } = resolveGameLocalPaths(GAME_SLUG);
  let imageSummary = null;
  let syncSummary = null;

  if (!isDryRun) {
    for (const setFile of workspace.setFiles) {
      const additions = groupedByFile.get(setFile.fileName);
      if (!additions?.length) continue;

      const baseCards = (Array.isArray(setFile.cards) ? setFile.cards : []).filter(
        (card) => String(card?.type ?? "") !== DON_TYPE,
      );
      const nextCards = [...baseCards, ...additions.map((entry) => entry.card)].sort((left, right) =>
        String(left?.id ?? "").localeCompare(String(right?.id ?? "")),
      );
      const filePath = path.join(workspace.cardsDir, setFile.fileName);

      await fs.writeFile(filePath, JSON.stringify(nextCards, null, 2), "utf8");
    }

    imageSummary = await downloadAndStoreCardImages(imageCards, {
      outputDir: imagesDir,
      quality: 75,
    });

    const nextWorkspace = await readGameCardsFromLocalFiles(GAME_SLUG);
    const nextCards = buildGameCatalogFromSetFiles(nextWorkspace.setFiles);
    syncSummary = await syncGameStorage(GAME_SLUG, {
      setFiles: nextWorkspace.setFiles,
      setFileNames: touchedFiles,
      cards: nextCards,
      cardsForImages: imageCards,
      syncCatalog: true,
      syncRawSets: true,
      syncPrices: false,
      syncImages: true,
      readFromStorage: false,
      imagesDir,
      logger: (message) => console.log(String(message)),
    });
  }

  await fs.mkdir(REPORTS_DIR, { recursive: true });
  const reportPath = path.join(
    REPORTS_DIR,
    `one-piece-dons-${new Date().toISOString().replace(/[:.]/g, "-")}.json`,
  );
  const report = {
    createdAt: new Date().toISOString(),
    envFile,
    dryRun: isDryRun,
    source: CARDTRADER_BLUEPRINTS_URL,
    totalBlueprints: blueprintRows.length,
    mappedCount: resolvedMappedRows.length,
    skippedCount: skippedRows.length,
    touchedFiles,
    imageSummary,
    syncSummary,
    mapped: resolvedMappedRows.map((entry) => ({
      blueprintId: entry.blueprint.id,
      blueprintName: entry.blueprint.n,
      expansionName: entry.blueprint.x,
      expansionCode: entry.blueprint.xx,
      collectorNumber: entry.blueprint.cn || null,
      targetFile: entry.resolution.fileName,
      targetSetName: entry.resolution.setName,
      cardId: entry.card.id,
      imageUrl: entry.card.image,
      cardTraderUrl: entry.card.slugs?.[0]?.url || "",
    })),
    skipped: skippedRows,
  };

  await fs.writeFile(reportPath, JSON.stringify(report, null, 2), "utf8");

  console.log("");
  console.log("Scraping DON!! completato.");
  console.log(
    JSON.stringify(
      {
        totalBlueprints: blueprintRows.length,
        mappedCount: resolvedMappedRows.length,
        skippedCount: skippedRows.length,
        touchedFiles,
        reportPath,
        imageSummary,
        syncSummary,
      },
      null,
      2,
    ),
  );
}

async function loadCardTraderDonBlueprints() {
  const response = await fetch(CARDTRADER_BLUEPRINTS_URL, {
    headers: {
      "user-agent": "DeckspediaDonScraper/1.0",
      accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`CardTrader blueprints.json non disponibile: HTTP ${response.status}`);
  }

  const rows = await response.json();
  return rows
    .filter((row) => Number(row?.c) === 255)
    .filter((row) => /^don!?/i.test(String(row?.n ?? "")))
    .sort((left, right) =>
      `${left?.x ?? ""} ${left?.n ?? ""}`.localeCompare(`${right?.x ?? ""} ${right?.n ?? ""}`, undefined, {
        sensitivity: "base",
        numeric: true,
      }),
    );
}

async function resolveMappedImageUrls(rows) {
  const results = new Array(rows.length);
  let nextIndex = 0;
  const concurrency = Math.min(8, rows.length || 1);

  await Promise.all(
    Array.from({ length: concurrency }, async () => {
      while (true) {
        const currentIndex = nextIndex;
        nextIndex += 1;
        const row = rows[currentIndex];
        if (!row) return;

        const imageUrl = await resolveCardTraderImageUrl(row.blueprint);
        results[currentIndex] = {
          ...row,
          card: buildDonCard(row.blueprint, row.resolution, imageUrl),
        };
      }
    }),
  );

  return results.filter(Boolean);
}

function buildDirectTargets(setFiles) {
  const targets = new Map();

  for (const setFile of Array.isArray(setFiles) ? setFiles : []) {
    const fileName = String(setFile?.fileName ?? "").trim();
    if (!fileName || AGGREGATED_FILE_NAMES.has(fileName)) continue;

    const cards = Array.isArray(setFile?.cards) ? setFile.cards : [];
    const uniqueSetNames = [...new Set(cards.map((card) => String(card?.setName ?? "").trim()).filter(Boolean))];
    if (uniqueSetNames.length !== 1) continue;

    const directTarget = {
      fileName,
      setName: uniqueSetNames[0],
    };

    for (const code of extractCodesFromFileName(fileName)) {
      targets.set(normalizeCode(code), directTarget);
    }

    for (const code of extractBracketCodes(uniqueSetNames[0])) {
      targets.set(normalizeCode(code), directTarget);
    }
  }

  return targets;
}

function resolveBlueprintTarget(blueprint, directTargets) {
  const groupCode = normalizeCode(blueprint.xx);
  if (EXCLUDED_BLUEPRINT_GROUPS.has(groupCode)) {
    return { skipReason: "excluded-non-en" };
  }

  if (/saikyo jump/i.test(String(blueprint.n ?? ""))) {
    return { skipReason: "excluded-jp-promo" };
  }

  const collectorCode = extractMainCode(String(blueprint.cn ?? "")) || extractMainCode(String(blueprint.n ?? ""));
  if (collectorCode && directTargets.has(normalizeCode(collectorCode))) {
    const directTarget = directTargets.get(normalizeCode(collectorCode));
    return {
      fileName: directTarget.fileName,
      setName: directTarget.setName,
      expansionCode: normalizeHumanCode(collectorCode),
    };
  }

  if (groupCode && directTargets.has(groupCode)) {
    const directTarget = directTargets.get(groupCode);
    return {
      fileName: directTarget.fileName,
      setName: directTarget.setName,
      expansionCode: normalizeHumanCode(blueprint.xx),
    };
  }

  if (PROMOTION_GROUPS.has(groupCode)) {
    const setName = resolvePromotionSetName(blueprint);
    if (!setName) return { skipReason: "promotion-no-set-name" };

    return {
      fileName: PROMOTION_FILE_NAME,
      setName,
      expansionCode: resolveAggregateExpansionCode(blueprint),
    };
  }

  if (OTHER_PRODUCT_GROUPS.has(groupCode)) {
    const setName = resolveOtherProductSetName(blueprint);
    if (!setName) return { skipReason: "other-product-no-set-name" };

    return {
      fileName: OTHER_PRODUCTS_FILE_NAME,
      setName,
      expansionCode: resolveAggregateExpansionCode(blueprint),
    };
  }

  return null;
}

function buildDonCard(blueprint, resolution, imageUrl) {
  const name = resolveDonName(blueprint);
  const illustration = resolveIllustration(blueprint);
  const imageId = normalizeBlueprintImageId(blueprint.id);
  const cardId = buildCardId(imageId, resolution.setName);
  const cardTraderUrl = `https://www.cardtrader.com/en/cards/${blueprint.id}`;

  return {
    name,
    code: null,
    rarity: null,
    type: DON_TYPE,
    attribute: null,
    power: null,
    counter: null,
    color: null,
    family: null,
    effect: null,
    trigger: null,
    setName: resolution.setName,
    image: imageUrl,
    cost: null,
    life: null,
    expansionCode: resolution.expansionCode,
    imageId,
    id: cardId,
    ...(illustration ? { illustration } : {}),
    slugs: [
      createCardTraderSlugEntry({
        url: cardTraderUrl,
        verified: false,
      }),
    ],
  };
}

function resolveDonName(blueprint) {
  const rawName = String(blueprint?.n ?? "")
    .replace(/^don!!?\s*-\s*/i, "")
    .trim();
  if (!rawName) return null;

  const [baseName] = rawName.split("|").map((part) => part.trim());
  if (!baseName) return null;
  if (/^(op|st|eb|prb|dp|df|ts)-?\d+/i.test(baseName)) return null;

  return baseName;
}

function resolveIllustration(blueprint) {
  const rawName = String(blueprint?.n ?? "");
  const parts = rawName
    .split("|")
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.some((part) => /gold foil/i.test(part))) return "Gold Foil";
  if (parts.some((part) => /alternate art/i.test(part))) return "Alternate Art";
  if (parts.some((part) => /english version/i.test(part))) return "English Version";

  return null;
}

function resolvePromotionSetName(blueprint) {
  const expansionName = normalizeSpaces(String(blueprint?.x ?? ""));
  const blueprintName = normalizeSpaces(String(blueprint?.n ?? "").replace(/^don!!?\s*-\s*/i, ""));

  const winnerMatch = blueprintName.match(/winner\s*\|\s*(tournament pack vol\.?\s*\d+)/i);
  if (winnerMatch) {
    return `Card Set(s)Winner Pack | ${normalizeSpaces(winnerMatch[1])}`;
  }
  const tournamentPackMatch = blueprintName.match(/(tournament pack vol\.?\s*\d+)/i);
  if (tournamentPackMatch) {
    return `Card Set(s)${normalizeSpaces(tournamentPackMatch[1])}`;
  }
  if (/op-12: legacy of the master promos/i.test(expansionName)) {
    return "Card Set(s)OP-12: Legacy of the Master Promos";
  }
  if (/1st anniversary tournament/i.test(expansionName)) {
    return "Card Set(s)OP-05: 1st Anniversary Tournament Cards";
  }
  if (/2nd anniversary tournament/i.test(expansionName)) {
    return "Card Set(s)OP-09: Emperors in the New World: 2nd Anniversary Tournament Cards";
  }
  if (/3rd anniversary/i.test(expansionName)) {
    return "Card Set(s)OP-13: Carrying on his Will | 3rd Anniversary";
  }
  if (/winner pack/i.test(expansionName)) {
    return "Card Set(s)Winner Pack";
  }
  if (/tournament pack/i.test(expansionName)) {
    return "Card Set(s)Tournament Pack";
  }
  if (/store tournaments promos/i.test(expansionName)) {
    return "Card Set(s)Store Tournaments Promos";
  }
  if (/championships promo/i.test(expansionName)) {
    return "Card Set(s)Championships Promo";
  }
  if (/netflix chopper/i.test(blueprintName)) {
    return "Card Set(s)Netflix Chopper DON!!";
  }

  return `Card Set(s)${expansionName}`;
}

function resolveOtherProductSetName(blueprint) {
  const blueprintName = normalizeSpaces(String(blueprint?.n ?? "").replace(/^don!!?\s*-\s*/i, ""));
  const collectorNumber = normalizeSpaces(String(blueprint?.cn ?? ""));

  const doublePackMatch = blueprintName.match(/(double pack set vol\.?\s*\d+)/i);
  if (doublePackMatch) {
    return `Card Set(s)${normalizeSpaces(doublePackMatch[1])}`;
  }
  if (/super pre-?release/i.test(blueprintName)) {
    return "Card Set(s)Super Pre Release";
  }
  if (/special don!! card pack/i.test(blueprintName)) {
    return "Card Set(s)Special DON!! Card Pack";
  }
  if (/special don!! set vol\.?\s*1/i.test(blueprintName)) {
    return "Card Set(s)Special DON!! Set Vol.1";
  }
  if (/special don!! set vol\.?\s*2/i.test(blueprintName)) {
    return "Card Set(s)Special DON!! Set Vol.2";
  }
  if (/special don!! set vol\.?\s*3/i.test(blueprintName)) {
    return "Card Set(s)Special DON!! Set Vol.3";
  }
  if (/tin pack set vol\.?\s*1/i.test(blueprintName) || /ts-?01/i.test(collectorNumber)) {
    return "Card Set(s)Tin Pack Set Vol.1";
  }
  if (/devil fruits collection vol\.?\s*1/i.test(blueprintName) || /df0?1/i.test(collectorNumber)) {
    return "Card Set(s)Devil Fruits Collection Vol.1";
  }
  if (/devil fruits collection vol\.?\s*2/i.test(blueprintName) || /df0?2/i.test(collectorNumber)) {
    return "Card Set(s)Devil Fruits Collection Vol.2";
  }
  if (/devil fruits collection vol\.?\s*3/i.test(blueprintName) || /df0?3/i.test(collectorNumber)) {
    return "Card Set(s)Devil Fruits Collection Vol.3";
  }
  if (/2nd anniversary set/i.test(blueprintName)) {
    return "Card Set(s)English Version 2nd Anniversary Set";
  }
  if (/3rd anniversary set/i.test(blueprintName)) {
    return "Card Set(s)English Version 3rd Anniversary Set";
  }
  if (/one piece day dallas 2025/i.test(blueprintName)) {
    return "Card Set(s)ONE PIECE DAY Dallas 2025";
  }
  if (/one piece day 2024/i.test(blueprintName)) {
    return "Card Set(s)Premium Card Collection  One Piece Day 2024-";
  }

  return `Card Set(s)${normalizeSpaces(String(blueprint?.x ?? ""))}`;
}

function resolveAggregateExpansionCode(blueprint) {
  const directCode = extractMainCode(String(blueprint?.cn ?? "")) || extractMainCode(String(blueprint?.n ?? ""));
  if (directCode) return normalizeHumanCode(directCode);
  if (String(blueprint?.xx ?? "").trim()) return normalizeHumanCode(String(blueprint.xx));
  return null;
}

function buildCardTraderImageUrl(blueprint) {
  return `https://www.cardtrader.com/uploads/blueprints/image/${blueprint.rid}/${blueprint.id}.jpg`;
}

async function resolveCardTraderImageUrl(blueprint) {
  const guessedImageUrl = buildCardTraderImageUrl(blueprint);
  const headers = {
    "user-agent": "DeckspediaDonScraper/1.0",
    accept: "image/avif,image/webp,image/apng,image/png,image/*,*/*;q=0.8,text/html;q=0.9",
  };

  try {
    const imageResponse = await fetch(guessedImageUrl, { method: "HEAD", headers });
    if (imageResponse.ok) return guessedImageUrl;
  } catch {
    // fallback below
  }

  const cardTraderUrl = `https://www.cardtrader.com/en/cards/${blueprint.id}`;
  const pageResponse = await fetch(cardTraderUrl, { headers });
  if (!pageResponse.ok) {
    throw new Error(`Pagina CardTrader non leggibile per ${blueprint.id}: HTTP ${pageResponse.status}`);
  }

  const pageHtml = await pageResponse.text();
  const ogImage = pageHtml.match(/<meta property="og:image" content="([^"]+)"/i)?.[1] || null;
  if (ogImage) return ogImage;

  const previewImageUrl = `https://www.cardtrader.com/uploads/blueprints/image/${blueprint.rid}/preview_${blueprint.id}.jpg`;
  try {
    const previewResponse = await fetch(previewImageUrl, { method: "HEAD", headers });
    if (previewResponse.ok) return previewImageUrl;
  } catch {
    // ignore
  }

  throw new Error(`Immagine CardTrader non trovata per ${blueprint.id}`);
}

function buildCardId(imageId, setName) {
  const sanitizedSetName = String(setName ?? "")
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^A-Za-z0-9_\-\[\].]/g, "");

  return `${imageId}_${sanitizedSetName}`;
}

function normalizeBlueprintImageId(blueprintId) {
  return String(blueprintId ?? "")
    .trim()
    .replace(/[^A-Za-z0-9._-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function groupMappedRowsByFile(mappedRows) {
  const grouped = new Map();

  for (const row of mappedRows) {
    if (!grouped.has(row.resolution.fileName)) {
      grouped.set(row.resolution.fileName, []);
    }
    grouped.get(row.resolution.fileName).push(row);
  }

  return grouped;
}

function extractCodesFromFileName(fileName) {
  return [...String(fileName ?? "").matchAll(/(op\d{2}|eb\d{2}|prb\d{2}|st\d{2})/gi)].map((match) => match[1]);
}

function extractBracketCodes(value) {
  return [...String(value ?? "").matchAll(/\[(OP-?\d{2}(?:-?EB\d{2})?|EB-?\d{2}|PRB-?\d{2}|ST-?\d{2})\]/gi)].map((match) => match[1]);
}

function extractMainCode(value) {
  const match = String(value ?? "").match(/\b(OP-?\d{2}|EB-?\d{2}|PRB-?\d{2}|ST-?\d{2}|DP-?\d{2}|DF-?\d{2}|TS-?\d{2})\b/i);
  return match ? match[1] : null;
}

function normalizeCode(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function normalizeHumanCode(value) {
  const raw = String(value ?? "").trim().toUpperCase();
  if (!raw) return null;

  return raw
    .replace(/^OP(\d{2})$/, "OP$1")
    .replace(/^EB(\d{2})$/, "EB$1")
    .replace(/^PRB(\d{2})$/, "PRB$1")
    .replace(/^ST(\d{2})$/, "ST$1")
    .replace(/^DP(\d{2})$/, "DP$1")
    .replace(/^DF(\d{2})$/, "DF$1")
    .replace(/^TS(\d{2})$/, "TS$1")
    .replace(/[^A-Z0-9]+/g, "");
}

function normalizeSpaces(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function parseArgs(args) {
  return args.reduce((accumulator, arg) => {
    if (!arg.startsWith("--")) return accumulator;
    const [rawKey, rawValue] = arg.slice(2).split("=", 2);
    accumulator[rawKey.trim()] = rawValue === undefined ? true : rawValue.trim();
    return accumulator;
  }, {});
}

const OTHER_PRODUCTS_FILE_NAME = "000_other_product_card.json";
const PROMOTION_FILE_NAME = "000_promotion_card.json";
const AGGREGATED_FILE_NAMES = new Set([OTHER_PRODUCTS_FILE_NAME, PROMOTION_FILE_NAME]);
