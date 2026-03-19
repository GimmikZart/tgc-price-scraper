import fs from "fs";
import path from "path";
import puppeteer from "puppeteer";
import { fileURLToPath } from "url";
import "dotenv/config";
import { CARD_TRADER_SERVICE_NAME, ensureCardTraderSlugEntry } from "../utilities/cardTraderSlug.js";
import { DEFAULT_ONE_PIECE_GAME_SLUG, DEFAULT_TCG_DATA_BUCKET } from "../utilities/tcgGameConfig.js";
import {
  buildGameCatalogFromSetFiles,
  createSupabaseServiceClientFromEnv,
  downloadJsonObject,
  readGameCardsFromStorage,
  syncGameStorage,
  upsertSetFileEntry,
} from "../utilities/gameStorageSync.js";
import { getGamePricesObjectPath } from "../utilities/tcgStorage.js";

const GAME_SLUG = DEFAULT_ONE_PIECE_GAME_SLUG;
const DATA_BUCKET = process.env.TCG_DATA_BUCKET || DEFAULT_TCG_DATA_BUCKET;
const DEBUG_DIR = path.resolve(process.cwd(), ".cache", "debug-scrape");

const CHECKPOINT_ENABLED = String(process.env.CHECKPOINT || "1") === "1";
const CHECKPOINT_EVERY_FILES = Number(process.env.CHECKPOINT_EVERY_FILES || 1);
const CHECKPOINT_MIN_SECONDS = Number(process.env.CHECKPOINT_MIN_SECONDS || 10);
const CHECKPOINT_EVERY_UPDATES = Number(process.env.CHECKPOINT_EVERY_UPDATES || 0);

const PRICE_SELECTOR = "body > div.d-flex.flex-column.flex-grow-1.padding-top-for-header > div.bg-white > div > div > div.d-flex.pb-3 > div.w-100.ml-3.mr-0.mr-md-3 > div.blueprint-info-container > div > div:nth-child(1) > div.d-sm-flex.justify-content-between.flex-wrap > div:nth-child(2) > div.price-box__price";

const PER_CARD_BASE_DELAY_MS = 9000;
const PER_CARD_JITTER_MS = 3000;
const PER_FILE_COOLDOWN_MS = 35000;

const NAV_TIMEOUT_MS = 120000;
const PROTOCOL_TIMEOUT_MS = 120000;
const SELECTOR_TIMEOUT_MS = 30000;
const GOTO_RETRIES = 2;
const SELECTOR_RETRIES = 2;
const WATCHDOG_PAGE_STUCK_MS = 180000;
const RECREATE_BROWSER_EVERY_N = 250;
const SCRAPE_HEADLESS = String(process.env.SCRAPE_HEADLESS ?? "1") === "1";

const MAX_AGE_HOURS = Number(process.env.SCRAPE_MAX_AGE_HOURS || 24);
const MAX_AGE_MS = MAX_AGE_HOURS * 60 * 60 * 1000;
const FORCE_ALL = String(process.env.FORCE_ALL || "") === "1";
const MAX_FILES = Number(process.env.MAX_FILES || 0);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const jittered = (base, jitter) => {
  const delta = Math.floor(Math.random() * (jitter || 0));
  return Math.max(0, base + (Math.random() < 0.5 ? -delta : delta));
};

async function applyCardTraderFilters(page) {
  const conditionSelector = "#prop-condition-Near\\ Mint";
  const languageSelector = "#prop-language-en";
  let changed = false;

  try {
    await page.waitForSelector(conditionSelector, { visible: true, timeout: 10000 });
    const shouldClick = await page.$eval(conditionSelector, (element) => {
      const input = element.matches("input") ? element : element.querySelector("input");
      if (input) return !input.checked;

      const aria = element.getAttribute("aria-checked") ?? element.getAttribute("aria-pressed");
      if (aria != null) return aria !== "true";

      return !element.classList.contains("active") && !element.classList.contains("selected");
    });

    if (shouldClick) {
      await page.click(conditionSelector);
      changed = true;
      log("debug", "Filtro condizione impostato a Near Mint");
    }
  } catch (error) {
    log("warn", `Impossibile gestire filtro condizione Near Mint: ${error?.message || error}`);
  }

  try {
    await page.waitForSelector(languageSelector, { visible: true, timeout: 10000 });
    const shouldClick = await page.$eval(languageSelector, (element) => {
      const input = element.matches("input") ? element : element.querySelector("input");
      if (input) return !input.checked;

      const aria = element.getAttribute("aria-checked") ?? element.getAttribute("aria-pressed");
      if (aria != null) return aria !== "true";

      return !element.classList.contains("active") && !element.classList.contains("selected");
    });

    if (shouldClick) {
      await page.click(languageSelector);
      changed = true;
      log("debug", "Filtro lingua impostato a EN");
    }
  } catch (error) {
    log("warn", `Impossibile gestire filtro lingua EN: ${error?.message || error}`);
  }

  if (changed) {
    await sleep(1000);
  }
}

function parsePrice(text) {
  if (!text) return null;
  let normalized = String(text).trim().replace(/[^\d,.\-]/g, "");
  if (normalized.includes(",") && normalized.includes(".")) {
    normalized = normalized.replace(/\./g, "").replace(",", ".");
  } else if (normalized.includes(",")) {
    normalized = normalized.replace(",", ".");
  }

  const parsed = parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

const isFresh = (timestamp) => {
  if (timestamp == null) return false;
  const numericTimestamp = Number(timestamp);
  return Number.isFinite(numericTimestamp) && (Date.now() - numericTimestamp) < MAX_AGE_MS;
};

function toCents(price) {
  if (price == null || !Number.isFinite(price)) return null;
  return Math.round(price * 100);
}

function log(type, payload) {
  const message = typeof payload === "string"
    ? payload
    : (() => { try { return JSON.stringify(payload); } catch { return String(payload); } })();
  console.log(`[${new Date().toISOString()}] [${type}] ${message}`);
}

function getSbService() {
  return createSupabaseServiceClientFromEnv();
}

async function readPriceIndexFromStorage() {
  const client = createSupabaseServiceClientFromEnv();
  const json = await downloadJsonObject(client, DATA_BUCKET, getGamePricesObjectPath(GAME_SLUG));
  if (!Array.isArray(json)) {
    log("info", `Price index su Storage non trovato (bucket=${DATA_BUCKET}, object=${getGamePricesObjectPath(GAME_SLUG)})`);
    return [];
  }

  log("info", `Price index pre-caricato da Storage: ${json.length} entries`);
  return json;
}

function buildCompactArray(priceIndexMap) {
  const compact = [];
  for (const [id, value] of priceIndexMap.entries()) {
    compact.push({ id, price: value.price ?? null, lastUpdate: value.lastUpdate ?? null });
  }

  compact.sort((left, right) => (left.id > right.id ? 1 : left.id < right.id ? -1 : 0));
  return compact;
}

async function uploadPriceIndexToStorage(priceIndexMap) {
  const rows = buildCompactArray(priceIndexMap);
  await syncGameStorage(GAME_SLUG, {
    syncCatalog: false,
    syncRawSets: false,
    syncPrices: true,
    syncImages: false,
    priceRows: rows,
  });
  log("save", `Price index caricato su Supabase Storage: bucket=${DATA_BUCKET}, object=${getGamePricesObjectPath(GAME_SLUG)} (entries=${rows.length})`);
}

async function updateCardPrice(cardId, price) {
  const client = getSbService();
  const { error } = await client
    .from("cards")
    .update({ cardtrader_avg_price: price })
    .eq("card_id", cardId);

  if (error) throw new Error(error.message);
  log("db", `Aggiornato card_id=${cardId} -> ${price}`);
}

async function launchBrowser() {
  return puppeteer.launch({
    headless: SCRAPE_HEADLESS,
    protocolTimeout: PROTOCOL_TIMEOUT_MS,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--no-first-run",
      "--no-zygote",
      "--disable-notifications",
      "--disable-extensions",
      "--disable-background-networking",
      "--disable-background-timer-throttling",
      "--disable-renderer-backgrounding",
      "--mute-audio",
      "--single-process",
    ],
  });
}

async function makeLeanPage(browser) {
  const page = await browser.newPage();
  page.setDefaultNavigationTimeout(NAV_TIMEOUT_MS);
  page.setDefaultTimeout(SELECTOR_TIMEOUT_MS);
  await page.setViewport({ width: 1366, height: 768 });
  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36",
  );
  await page.setCacheEnabled(false);
  return page;
}

async function gotoWithRetry(page, url, tries = 1 + GOTO_RETRIES) {
  for (let attempt = 0; attempt < tries; attempt += 1) {
    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: NAV_TIMEOUT_MS });
      await sleep(1500);
      try {
        const button = await page.$("#onetrust-accept-btn-handler, button[aria-label='Accept All Cookies']");
        if (button) {
          await button.click();
          await sleep(500);
        }
      } catch {}
      try {
        await page.evaluate(() => window.scrollTo(0, Math.round(window.innerHeight * 0.3)));
      } catch {}
      await sleep(1200);
      return;
    } catch (error) {
      if (attempt >= tries - 1) throw error;
      log("warn", `goto timeout -> retry ${attempt + 1}/${tries - 1}`);
      await sleep(5000 * (attempt + 1));
    }
  }
}

async function waitForPriceWithRetry(page, selector, tries = 1 + SELECTOR_RETRIES) {
  for (let attempt = 0; attempt < tries; attempt += 1) {
    try {
      await page.waitForSelector(selector, { visible: false, timeout: Math.min(15000, SELECTOR_TIMEOUT_MS) });
    } catch {
      await sleep(1500 + attempt * 500);
      continue;
    }

    const startedAt = Date.now();
    while (Date.now() - startedAt < SELECTOR_TIMEOUT_MS) {
      try {
        const text = await page.$eval(selector, (element) => (element.textContent || "").trim());
        if (text && text !== "-" && !/loading/i.test(text) && /\d/.test(text)) {
          return text;
        }
      } catch {}

      try {
        await page.evaluate(() => window.scrollBy(0, Math.round(window.innerHeight * 0.15)));
      } catch {}
      await sleep(800);
    }

    if (attempt < tries - 1) {
      log("warn", `selector polling timeout -> retry ${attempt + 1}/${tries - 1}`);
      await sleep(2000 + attempt * 1000);
    }
  }

  throw new Error(`Waiting for selector \`${selector}\` failed: ${SELECTOR_TIMEOUT_MS * tries}ms exceeded`);
}

async function writeDebugFragment(page) {
  try {
    await fs.promises.mkdir(DEBUG_DIR, { recursive: true });
    const fragment = await page.$eval(PRICE_SELECTOR, (element) => element.outerHTML);
    fs.writeFileSync(path.join(DEBUG_DIR, "debug-price-fragment.html"), fragment, "utf-8");
    log("debug", `Scritto ${path.join(DEBUG_DIR, "debug-price-fragment.html")}`);
  } catch {}
}

export async function main() {
  log("start", `GAME=${GAME_SLUG} MAX_AGE_HOURS=${MAX_AGE_HOURS} FORCE_ALL=${FORCE_ALL} HEADLESS=${SCRAPE_HEADLESS} MAX_FILES=${MAX_FILES || "all"} VERIFIED_SLUGS_ONLY=true`);

  const storageData = await readGameCardsFromStorage(GAME_SLUG);
  if (!storageData.setFiles.length) {
    log("warn", `Nessun raw set trovato nel bucket ${DATA_BUCKET}/${GAME_SLUG}`);
    return;
  }

  let setFiles = [...storageData.setFiles];
  const filesToProcess = [...storageData.setFiles]
    .sort((left, right) =>
      String(left?.fileName ?? "").localeCompare(
        String(right?.fileName ?? ""),
        undefined,
        { numeric: true, sensitivity: "base" },
      )
    )
    .reverse()
    .slice(0, MAX_FILES > 0 ? MAX_FILES : undefined);

  log("info", `Raw set da processare: ${filesToProcess.length}`);
  log("info", `Primo raw set (ordine inverso): ${filesToProcess[0]?.fileName || "n/a"}`);

  const priceIndex = new Map();
  try {
    const existing = await readPriceIndexFromStorage();
    for (const row of existing) {
      if (row && row.id != null) {
        priceIndex.set(row.id, { price: row.price ?? null, lastUpdate: row.lastUpdate ?? null });
      }
    }
  } catch (error) {
    log("warn", `Impossibile leggere index da Storage: ${error.message}`);
  }

  log("info", `Price index pre-caricato: ${priceIndex.size} entries`);

  let browser = await launchBrowser();
  let page = await makeLeanPage(browser);
  let lastActivityAt = Date.now();
  let navigationsCounter = 0;

  const ensureFreshPageIfStuck = async () => {
    if (Date.now() - lastActivityAt <= WATCHDOG_PAGE_STUCK_MS) return;

    log("warn", "watchdog: page stuck -> ricreo la pagina");
    try { await page.close(); } catch {}
    page = await makeLeanPage(browser);
    lastActivityAt = Date.now();
  };

  let lastCheckpointAt = 0;
  let updatesSinceLastCheckpoint = 0;

  const shouldCheckpoint = (fileIndex, updatedInThisFile) => {
    if (!CHECKPOINT_ENABLED) return false;
    const enoughTime = (Date.now() - lastCheckpointAt) > (CHECKPOINT_MIN_SECONDS * 1000);
    const fileBoundary = ((fileIndex + 1) % CHECKPOINT_EVERY_FILES) === 0;
    const enoughUpdates = CHECKPOINT_EVERY_UPDATES > 0 && updatesSinceLastCheckpoint >= CHECKPOINT_EVERY_UPDATES;
    return updatedInThisFile > 0 && (enoughTime || fileBoundary || enoughUpdates);
  };

  async function doCheckpoint(reason) {
    await uploadPriceIndexToStorage(priceIndex);
    lastCheckpointAt = Date.now();
    updatesSinceLastCheckpoint = 0;
    log("info", `Checkpoint -> Storage (${reason})`);
  }

  let totalCardsVisited = 0;
  let totalPricesUpdated = 0;
  let totalVerifiedFound = 0;
  let totalSkippedFresh = 0;
  const modifiedSetFiles = new Set();

  try {
    for (let fileIndex = 0; fileIndex < filesToProcess.length; fileIndex += 1) {
      const entry = filesToProcess[fileIndex];
      const fileName = entry.fileName;
      log("file", `${fileIndex + 1}/${filesToProcess.length}: ${fileName}`);

      const cards = Array.isArray(entry?.cards) ? [...entry.cards] : [];
      if (!cards.length) {
        log("warn", `Nessuna carta in ${fileName}`);
        await sleep(jittered(PER_FILE_COOLDOWN_MS, 2000));
        continue;
      }

      let updatedInThisFile = 0;
      let fileModified = false;

      for (let cardIndex = 0; cardIndex < cards.length; cardIndex += 1) {
        let card = cards[cardIndex];
        const hasCardTraderSlug = Array.isArray(card?.slugs)
          && card.slugs.some((slug) => String(slug?.service || "") === CARD_TRADER_SERVICE_NAME);

        if (!hasCardTraderSlug) {
          const nextCard = ensureCardTraderSlugEntry(card);
          if (nextCard !== card) {
            cards[cardIndex] = nextCard;
            card = nextCard;
            fileModified = true;
          }
        }

        if (!Array.isArray(card?.slugs) || !card.slugs.length) continue;

        const previous = priceIndex.get(card.id);
        if (!FORCE_ALL && previous && isFresh(previous.lastUpdate)) {
          totalSkippedFresh += 1;
          continue;
        }

        for (let slugIndex = 0; slugIndex < card.slugs.length; slugIndex += 1) {
          const slug = card.slugs[slugIndex];
          const isCardTrader = String(slug?.service || "") === CARD_TRADER_SERVICE_NAME;
          const isVerified = Boolean(slug?.verified);
          const url = typeof slug?.url === "string" ? slug.url.trim() : "";
          if (
            !isCardTrader ||
            !url ||
            !isVerified
          ) continue;

          totalVerifiedFound += 1;

          if (navigationsCounter > 0 && navigationsCounter % RECREATE_BROWSER_EVERY_N === 0) {
            log("info", "ricreo browser per manutenzione periodica");
            try { await page.close(); } catch {}
            try { await browser.close(); } catch {}
            browser = await launchBrowser();
            page = await makeLeanPage(browser);
          }

          try {
            await ensureFreshPageIfStuck();
            log("nav", `-> ${url}`);
            lastActivityAt = Date.now();
            navigationsCounter += 1;

            await gotoWithRetry(page, url);
            await applyCardTraderFilters(page);

            const priceText = await waitForPriceWithRetry(page, PRICE_SELECTOR);
            const price = parsePrice(priceText);
            totalCardsVisited += 1;
            lastActivityAt = Date.now();

            if (price == null) {
              log("warn", `Prezzo non parsabile per "${card.name || card.code}": "${priceText}"`);
            } else {
              const now = Date.now();
              const priceCents = toCents(price);

              if (card.id != null) {
                await updateCardPrice(card.id, price);
              } else {
                log("warn", `card.id mancante per "${card.name || card.code}"`);
              }

              if (card.id != null && priceCents != null) {
                priceIndex.set(card.id, { price: priceCents, lastUpdate: now });
              }

              cards[cardIndex] = {
                ...card,
                slugs: card.slugs.map((entrySlug, index) => (
                  index === slugIndex
                    ? {
                      ...entrySlug,
                      verified: true,
                      lastPriceCheckAt: now,
                      lastPriceCheckStatus: "ok",
                    }
                    : entrySlug
                )),
              };

              fileModified = true;
              updatedInThisFile += 1;
              totalPricesUpdated += 1;
              updatesSinceLastCheckpoint += 1;
              log("ok", `Aggiornato ${price} (EUR) per "${card.name || card.code}"`);

              if (shouldCheckpoint(fileIndex, 1)) {
                try { await doCheckpoint("per-updates"); } catch (error) {
                  log("warn", `Checkpoint upload fallito: ${error.message}`);
                }
              }
            }
          } catch (error) {
            const message = error?.message || String(error);
            log("error", `Scrape "${card.name || card.code}": ${message}`);
            await writeDebugFragment(page);
            log("warn", "recupero: ricreo browser e pagina");
            try { await page.close(); } catch {}
            try { await browser.close(); } catch {}
            browser = await launchBrowser();
            page = await makeLeanPage(browser);
            lastActivityAt = Date.now();
          }

          await sleep(jittered(PER_CARD_BASE_DELAY_MS, PER_CARD_JITTER_MS));
        }
      }

      if (fileModified) {
        setFiles = upsertSetFileEntry(setFiles, {
          fileName,
          cards,
        });
        modifiedSetFiles.add(fileName);
        log("save", `Set aggiornato in memoria per sync bucket: ${fileName}`);
      }

      if (shouldCheckpoint(fileIndex, updatedInThisFile)) {
        try { await doCheckpoint("per-file"); } catch (error) {
          log("warn", `Checkpoint upload fallito: ${error.message}`);
        }
      }

      await sleep(jittered(PER_FILE_COOLDOWN_MS, 5000));
    }

    try {
      await uploadPriceIndexToStorage(priceIndex);
    } catch (error) {
      log("error", `Upload finale price index fallito: ${error.message}`);
    }

    if (modifiedSetFiles.size) {
      try {
        const rawSetFiles = Array.from(modifiedSetFiles);
        const nextCards = buildGameCatalogFromSetFiles(setFiles);
        await syncGameStorage(GAME_SLUG, {
          setFiles,
          setFileNames: rawSetFiles,
          cards: nextCards,
          syncCatalog: true,
          syncRawSets: true,
          syncPrices: false,
          syncImages: false,
        });
        log("save", `Catalogo e raw set sincronizzati dopo verifica slug: ${rawSetFiles.length} file`);
      } catch (error) {
        log("warn", `Sync finale catalog/raw set fallita: ${error.message}`);
      }
    }

    log("done", {
      files: filesToProcess.length,
      totalCardsVisited,
      totalVerifiedFound,
      totalPricesUpdated,
      totalSkippedFresh,
      maxAgeHours: MAX_AGE_HOURS,
      forced: FORCE_ALL,
    });
  } finally {
    try { await page.close(); } catch {}
    try { await browser.close(); } catch {}
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
