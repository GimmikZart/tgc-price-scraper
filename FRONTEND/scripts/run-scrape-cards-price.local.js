// scripts/run-scrape-cards-price.local.js
// Locale, robusto: headful/slow, selector invariato, polling prudente.
// NON scrive lastUpdate nei JSON del catalogo.
// Usa Supabase Storage come sorgente principale (cache prezzi/lastUpdate) + checkpoint/intermedi.
// Opzionale: scrive anche un file locale prices per debug (WRITE_LOCAL=1).

import fs from 'fs'
import path from 'path'
import puppeteer from 'puppeteer'
import { createClient } from '@supabase/supabase-js'
import { fileURLToPath } from 'url'
import 'dotenv/config'  // carica .env

/* ---------------- path helper per ESM ---------------- */
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/* ---------------- CONFIG ---------------- */
const JSON_BASE_DIR = path.resolve(process.cwd(), 'data', 'cards', 'one_piece_tgc')

// Price index locale (solo per debug/visibilità)
const PRICE_INDEX_DIR  = path.resolve(process.cwd(), 'data', 'prices')
const PRICE_INDEX_FILE = path.join(PRICE_INDEX_DIR, 'one-piece.min.json')
const WRITE_LOCAL =  false ;//String(process.env.WRITE_LOCAL ?? '1') === '1'

// Supabase Storage
const PRICES_BUCKET = process.env.PRICES_BUCKET || 'prices'
const PRICES_OBJECT = process.env.PRICES_OBJECT || 'one-piece.min.json'

// ⛔️ Selettore invariante
const PRICE_SELECTOR = 'body > div.d-flex.flex-column.flex-grow-1.padding-top-for-header > div.bg-white > div > div > div.d-flex.pb-3 > div.w-100.ml-3.mr-0.mr-md-3 > div.blueprint-info-container > div > div:nth-child(1) > div.d-sm-flex.justify-content-between.flex-wrap > div:nth-child(2) > div.price-box__price'

// Timings “gentili”
const PER_CARD_BASE_DELAY_MS = 6000
const PER_CARD_JITTER_MS     = 2000
const PER_FILE_COOLDOWN_MS   = 8000

// Timeout & retry
const NAV_TIMEOUT_MS           = 90000
const PROTOCOL_TIMEOUT_MS      = 120000
const SELECTOR_TIMEOUT_MS      = Number(process.env.SCRAPE_SELECTOR_TIMEOUT_MS || 90000)
const GOTO_RETRIES             = 2
const SELECTOR_RETRIES         = Number(process.env.SCRAPE_SELECTOR_RETRIES || 3)
const WATCHDOG_PAGE_STUCK_MS   = 180000
const RECREATE_BROWSER_EVERY_N = 200

// Cache/skip (basato su Storage/priceIndex)
const MAX_AGE_HOURS = Number(process.env.SCRAPE_MAX_AGE_HOURS || 24)
const MAX_AGE_MS = MAX_AGE_HOURS * 60 * 60 * 1000
const FORCE_ALL = String(process.env.FORCE_ALL || '') === '1'

// Debug / headful in locale
const DEBUG_HEADFUL = String(process.env.DEBUG_HEADFUL ?? '1') === '1'

// Limiti per test locale
const MAX_FILES = Number(process.env.MAX_FILES || 2)
const MAX_CARDS_PER_FILE = Number(process.env.MAX_CARDS_PER_FILE || 20)

// Checkpoint (upload parziali verso Storage)
const CHECKPOINT_ENABLED          = true
const CHECKPOINT_MIN_SECONDS      = Number(process.env.CHECKPOINT_MIN_SECONDS || 5)
// NUOVO: checkpoint anche ogni N aggiornamenti eseguiti
const CHECKPOINT_EVERY_UPDATES    = Number(process.env.CHECKPOINT_EVERY_UPDATES || 1)
// (resta anche il checkpoint “per file” alla fine del file)
const CHECKPOINT_EVERY_FILES      = Number(process.env.CHECKPOINT_EVERY_FILES || 1)

/* ---------------- HELPERS ---------------- */
const sleep = (ms) => new Promise(r => setTimeout(r, ms))
const jittered = (base, jitter) => {
  const d = Math.floor(Math.random() * (jitter || 0))
  return Math.max(0, base + (Math.random() < 0.5 ? -d : d))
}
const isJsonFile = f => f.toLowerCase().endsWith('.json')

async function applyCardTraderFilters(page) {
  const CONDITION_SELECTOR = '#prop-condition-Near\\ Mint'
  const LANGUAGE_SELECTOR  = '#prop-language-en'

  try {
    // Condizione: Near Mint
    await page.waitForSelector(CONDITION_SELECTOR, { visible: true, timeout: 10000 })
    await page.click(CONDITION_SELECTOR)
    log('debug', 'Filtro condizione impostato a Near Mint')
  } catch (e) {
    log('warn', `Impossibile impostare filtro condizione Near Mint: ${e?.message || e}`)
  }

  try {
    // Lingua: EN
    await page.waitForSelector(LANGUAGE_SELECTOR, { visible: true, timeout: 10000 })
    await page.click(LANGUAGE_SELECTOR)
    log('debug', 'Filtro lingua impostato a EN')
  } catch (e) {
    log('warn', `Impossibile impostare filtro lingua EN: ${e?.message || e}`)
  }

  // Lascia un attimo alla pagina per aggiornare il prezzo
  await sleep(1000)
}


function detectCardsRoot(json) {
  if (Array.isArray(json)) return { cards: json, isArrayRoot: true }
  if (json && typeof json === 'object' && Array.isArray(json.cards)) return { cards: json.cards, isArrayRoot: false }
  return { cards: [], isArrayRoot: false }
}

function parsePrice(text) {
  if (!text) return null
  let t = String(text).trim().replace(/[^\d,.\-]/g, '')
  if (t.includes(',') && t.includes('.')) t = t.replace(/\./g, '').replace(',', '.')
  else if (t.includes(',')) t = t.replace(',', '.')
  const n = parseFloat(t)
  return Number.isFinite(n) ? n : null
}
const isFresh = (ts) => {
  if (ts == null) return false
  const n = Number(ts)
  return Number.isFinite(n) && (Date.now() - n) < MAX_AGE_MS
}
function toCents(n) {
  if (n == null || !Number.isFinite(n)) return null
  return Math.round(n * 100)
}
function log(type, payload) {
  const msg = typeof payload === 'string'
    ? payload
    : (() => { try { return JSON.stringify(payload) } catch { return String(payload) } })()
  console.log(`[${new Date().toISOString()}] [${type}] ${msg}`)
}
function readJsonSafe(p, fallback) {
  try { return JSON.parse(fs.readFileSync(p, 'utf-8')) } catch { return fallback }
}
function atomicWriteJson(p, data) {
  const out = JSON.stringify(data)
  const dir = path.dirname(p)
  const tmp = p + '.tmp'
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(tmp, out, 'utf-8')
  fs.renameSync(tmp, p)
}

/* ---------------- Supabase helpers (opzionali in locale) ---------------- */
let _sb = null
async function getSb() {
  if (_sb) return _sb
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  _sb = createClient(url, key)
  return _sb
}
async function ensureBucketExists() {
  const sb = await getSb()
  if (!sb) return
  const { data, error } = await sb.storage.getBucket(PRICES_BUCKET)
  if (error || !data) {
    const { error: cErr } = await sb.storage.createBucket(PRICES_BUCKET, {
      public: false,
      fileSizeLimit: '20MB',
    })
    if (cErr) throw cErr
  }
}
async function readPriceIndexFromStorage() {
  const sb = await getSb()
  if (!sb) return []
  const { data, error } = await sb.storage.from(PRICES_BUCKET).download(PRICES_OBJECT)
  if (error || !data) return []
  const text = await data.text()
  try { const json = JSON.parse(text); return Array.isArray(json) ? json : [] } catch { return [] }
}
async function uploadPriceIndexToStorage(rows) {
  const sb = await getSb()
  if (!sb) return false
  const payload = JSON.stringify(rows)
  const blob = new Blob([payload], { type: 'application/json' })
  const { error } = await sb.storage.from(PRICES_BUCKET).upload(PRICES_OBJECT, blob, { upsert: true })
  if (error) throw error
  log('save', `Upload su Supabase Storage OK (entries=${rows.length})`)
  return true
}

/* ---------------- DB (opzionale) ---------------- */
async function updateCardPrice(cardId, price) {
  const sb = await getSb()
  if (!sb) { log('db', `(simulazione) Aggiornato card_id=${cardId} → ${price}`); return }
  const { error } = await sb.from('cards').update({ cardtrader_avg_price: price }).eq('card_id', cardId)
  if (error) throw new Error(error.message)
  log('db', `Aggiornato card_id=${cardId} → ${price}`)
}

/* ---------------- Puppeteer bootstrap ---------------- */
async function launchBrowser() {
  return puppeteer.launch({
    headless: DEBUG_HEADFUL ? false : true,
    protocolTimeout: PROTOCOL_TIMEOUT_MS,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--no-first-run',
      '--no-zygote',
      '--disable-notifications',
      '--disable-extensions',
      '--disable-background-networking',
      '--disable-background-timer-throttling',
      '--disable-renderer-backgrounding',
      '--mute-audio',
    ]
  })
}

async function makeLeanPage(browser) {
  const page = await browser.newPage()
  page.setDefaultNavigationTimeout(NAV_TIMEOUT_MS)
  page.setDefaultTimeout(SELECTOR_TIMEOUT_MS)
  await page.setViewport({ width: 1366, height: 768 })
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36')
  await page.setCacheEnabled(false)
  return page
}

/* ---------------- Retry helpers ---------------- */
async function gotoWithRetry(page, url, tries = 1 + GOTO_RETRIES) {
  for (let i = 0; i < tries; i++) {
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT_MS })
      await sleep(1500)
      try {
        const b = await page.$('#onetrust-accept-btn-handler, button[aria-label="Accept All Cookies"]')
        if (b) { await b.click(); await sleep(500) }
      } catch {}
      try { await page.evaluate(() => window.scrollTo(0, Math.round(window.innerHeight * 0.3))) } catch {}
      await sleep(1200)
      return
    } catch (e) {
      if (i < tries - 1) {
        log('warn', `goto timeout → retry ${i + 1}/${tries - 1}`)
        await sleep(5000 * (i + 1))
      } else {
        throw e
      }
    }
  }
}

async function waitForPriceWithRetry(page, selector, tries = 1 + SELECTOR_RETRIES) {
  for (let attempt = 0; attempt < tries; attempt++) {
    try {
      await page.waitForSelector(selector, { visible: false, timeout: Math.min(15000, SELECTOR_TIMEOUT_MS) })
    } catch {
      await sleep(1500 + attempt * 500)
      continue
    }
    const start = Date.now()
    while (Date.now() - start < SELECTOR_TIMEOUT_MS) {
      try {
        const txt = await page.$eval(selector, el => (el.textContent || '').trim())
        if (txt && txt !== '-' && !/loading/i.test(txt) && /\d/.test(txt)) return txt
      } catch {}
      try { await page.evaluate(() => window.scrollBy(0, Math.round(window.innerHeight * 0.15))) } catch {}
      await sleep(800)
    }
    if (attempt < tries - 1) {
      log('warn', `price polling timeout (@${selector}) → retry ${attempt + 1}/${tries - 1}`)
      await sleep(2000 + attempt * 1000)
      continue
    }
    break
  }
  throw new Error(`Waiting price on selector failed: ${selector}`)
}

/* ---------------- MAIN ---------------- */
async function main() {
  log('start', `JSON_BASE_DIR = ${JSON_BASE_DIR} | MAX_AGE_HOURS=${MAX_AGE_HOURS} | FORCE_ALL=${FORCE_ALL} | DEBUG_HEADFUL=${DEBUG_HEADFUL}`)

  if (!fs.existsSync(JSON_BASE_DIR)) throw new Error(`JSON base dir not found: ${JSON_BASE_DIR}`)

  const filesAll = fs.readdirSync(JSON_BASE_DIR).filter(isJsonFile)
  if (!filesAll.length) { log('warn', `Nessun .json in ${JSON_BASE_DIR}`); return }
  const files = filesAll.reverse().slice(0, MAX_FILES)
  console.log('PRIMO FILE:', files[0]);
  
  log('info', `File da processare: ${files.length}/${filesAll.length} (MAX_FILES=${MAX_FILES})`)

  // Price index in memoria (id -> {price,lastUpdate})
  const priceIndex = new Map()

  // Carica cache iniziale (Storage → locale)
  let loadedFrom = 'none'
  try {
    const fromStorage = await readPriceIndexFromStorage()
    if (fromStorage.length) {
      for (const row of fromStorage) {
        if (row && row.id != null)
          priceIndex.set(row.id, { price: row.price ?? null, lastUpdate: row.lastUpdate ?? null })
      }
      loadedFrom = 'storage'
    }
  } catch (e) {
    log('warn', `Lettura da Storage fallita: ${e.message}`)
  }
  if (loadedFrom !== 'storage' && WRITE_LOCAL) {
    const existing = readJsonSafe(PRICE_INDEX_FILE, [])
    for (const row of existing) {
      if (row && row.id != null)
        priceIndex.set(row.id, { price: row.price ?? null, lastUpdate: row.lastUpdate ?? null })
    }
    loadedFrom = 'local'
  }
  log('info', `Price index pre-caricato da: ${loadedFrom} (${priceIndex.size} entries)`)

  let browser = await launchBrowser()
  let page = await makeLeanPage(browser)
  let lastActivityAt = Date.now()
  let navigationsCounter = 0

  const ensureFreshPageIfStuck = async () => {
    if (Date.now() - lastActivityAt > WATCHDOG_PAGE_STUCK_MS) {
      log('warn', 'watchdog: page “stuck” → ricreo la pagina')
      try { await page.close() } catch {}
      page = await makeLeanPage(browser)
      lastActivityAt = Date.now()
    }
  }

  // Stato checkpoint
  await ensureBucketExists().catch(e => log('warn', `ensureBucketExists: ${e.message}`))
  let lastCheckpointAt = 0
  let updatesSinceLastCheckpoint = 0

  const serializeRows = () => {
    const rows = [...priceIndex.entries()].map(([id, v]) => ({
      id, price: v.price ?? null, lastUpdate: v.lastUpdate ?? null
    }))
    rows.sort((a, b) => (a.id > b.id ? 1 : a.id < b.id ? -1 : 0))
    return rows
  }

  const doCheckpoint = async (reason) => {
    if (!CHECKPOINT_ENABLED) return false
    const secondsFromLast = (Date.now() - lastCheckpointAt) / 1000
    const timeOk = secondsFromLast >= CHECKPOINT_MIN_SECONDS
    const countOk = updatesSinceLastCheckpoint >= CHECKPOINT_EVERY_UPDATES
    if (!timeOk && !countOk) return false

    try {
      const rows = serializeRows()
      const uploaded = await uploadPriceIndexToStorage(rows).catch(err => {
        log('warn', `Checkpoint upload fallito: ${err.message}`); return false
      })
      if (WRITE_LOCAL) {
        atomicWriteJson(PRICE_INDEX_FILE, rows)
        log('save', `Checkpoint locale scritto: ${PRICE_INDEX_FILE} (entries=${rows.length})`)
      }
      if (uploaded) log('info', `Checkpoint → Storage OK (${reason})`)
      lastCheckpointAt = Date.now()
      updatesSinceLastCheckpoint = 0
      return uploaded
    } catch (e) {
      log('warn', `Checkpoint fallito (${reason}): ${e.message}`)
      return false
    }
  }

  let totalCardsVisited = 0
  let totalPricesUpdated = 0
  let totalVerifiedFound = 0
  let totalSkippedFresh = 0

  try {
    for (let i = 0; i < files.length; i++) {
      const fileName = files[i]
      const fullPath = path.join(JSON_BASE_DIR, fileName)
      log('file', `${i + 1}/${files.length}: ${fileName}`)

      let json
      try { json = JSON.parse(fs.readFileSync(fullPath, 'utf-8')) }
      catch (e) { log('error', `Parse ${fileName}: ${e.message}`); await sleep(jittered(PER_FILE_COOLDOWN_MS, 2000)); continue }

      const { cards } = detectCardsRoot(json)
      if (!cards.length) { log('warn', `Nessuna carta in ${fileName}`); await sleep(jittered(PER_FILE_COOLDOWN_MS, 2000)); continue }

      let updatedInThisFile = 0
      let processedThisFile = 0

      fileLoop:
      for (let ci = 0; ci < cards.length; ci++) {
        if (processedThisFile >= MAX_CARDS_PER_FILE) break
        const card = cards[ci]
        if (!Array.isArray(card?.slugs) || !card.slugs.length) continue

        // Skip basato su priceIndex (Storage/locale)
        const prev = priceIndex.get(card.id)
        if (!FORCE_ALL && prev && isFresh(prev.lastUpdate)) {
          totalSkippedFresh++
          continue
        }

        for (let si = 0; si < card.slugs.length; si++) {
          const slug = card.slugs[si]
          const isCT = String(slug?.service || '') === 'Card Trader'
          const isVerified = !!slug?.verified
          const url = slug?.url
          if (!isCT || !isVerified || !url) continue

          totalVerifiedFound++

          if (navigationsCounter > 0 && navigationsCounter % RECREATE_BROWSER_EVERY_N === 0) {
            log('info', 'ricreo browser per manutenzione periodica')
            try { await page.close() } catch {}
            try { await browser.close() } catch {}
            browser = await launchBrowser()
            page = await makeLeanPage(browser)
          }

          try {
            await ensureFreshPageIfStuck()
            log('nav', `→ ${url}`)
            lastActivityAt = Date.now()
            navigationsCounter++

            await gotoWithRetry(page, url)

            await applyCardTraderFilters(page)

            const priceText = await waitForPriceWithRetry(page, PRICE_SELECTOR)
            log('debug', `raw price text = "${priceText}"`)
            const price = parsePrice(priceText)
            totalCardsVisited++
            lastActivityAt = Date.now()

            if (price == null) {
              log('warn', `Prezzo non parsabile per "${card.name || card.code}" : "${priceText}"`)
              try {
                const frag = await page.$eval(PRICE_SELECTOR, el => el.outerHTML)
                fs.writeFileSync('debug-price-fragment.html', frag, 'utf-8')
                log('debug', 'Scritto debug-price-fragment.html')
              } catch {}
            } else {
              const now = Date.now()
              const priceCents = toCents(price)

              // NON scriviamo lastUpdate negli slug del catalogo
              if (card.id != null) await updateCardPrice(card.id, price)
              else log('warn', `card.id mancante per "${card.name || card.code}"`)

              if (card.id != null && priceCents != null) {
                priceIndex.set(card.id, { price: priceCents, lastUpdate: now })
                updatedInThisFile++
                totalPricesUpdated++
                processedThisFile++
                updatesSinceLastCheckpoint++  // <-- conteggio per checkpoint “per aggiornamenti”
              }

              log('ok', `Aggiornato ${price} (€) per "${card.name || card.code}"`)

              // NEW: checkpoint in corso d’opera (per aggiornamenti/tempo)
              await doCheckpoint('per-updates')
            }
          } catch (e) {
            const msg = e?.message || String(e)
            log('error', `Scrape "${card.name || card.code}": ${msg}`)
            try {
              const frag = await page.$eval(PRICE_SELECTOR, el => el.outerHTML)
              fs.writeFileSync('debug-price-fragment.html', frag, 'utf-8')
              log('debug', 'Scritto debug-price-fragment.html')
            } catch {}
            try { await page.close() } catch {}
            try { await browser.close() } catch {}
            browser = await launchBrowser()
            page = await makeLeanPage(browser)
            continue fileLoop
          }

          await sleep(jittered(PER_CARD_BASE_DELAY_MS, PER_CARD_JITTER_MS))
        }
      }

      // Checkpoint “per file” (come prima)
      const secondsFromLast = (Date.now() - lastCheckpointAt) / 1000
      const fileBoundary = ((i + 1) % CHECKPOINT_EVERY_FILES) === 0
      if (CHECKPOINT_ENABLED && updatedInThisFile > 0 && (fileBoundary || secondsFromLast >= CHECKPOINT_MIN_SECONDS)) {
        await doCheckpoint('per-file')
      }

      await sleep(jittered(PER_FILE_COOLDOWN_MS, 2000))
    }

    // ---- FLUSH FINALE: Storage (+ locale se abilitato) ----
    try {
      const rows = serializeRows()
      const uploaded = await uploadPriceIndexToStorage(rows).catch(err => { log('warn', `Upload finale fallito: ${err.message}`); return false })
      if (WRITE_LOCAL) {
        atomicWriteJson(PRICE_INDEX_FILE, rows)
        log('save', `Price index locale scritto: ${PRICE_INDEX_FILE} (entries=${rows.length})`)
      }
      if (uploaded) log('save', `Price index caricato su Supabase Storage (entries=${rows.length})`)
    } catch (e) {
      log('error', `Flush finale error: ${e.message}`)
    }

    log('done', {
      files: files.length,
      totalCardsVisited,
      totalVerifiedFound,
      totalPricesUpdated,
      totalSkippedFresh,
      maxAgeHours: MAX_AGE_HOURS,
      forced: FORCE_ALL
    })
  } finally {
    try { await page.close() } catch {}
    try { await browser.close() } catch {}
  }
}

/* ---------------- run if invoked directly ---------------- */
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(err => { console.error(err); process.exit(1) })
}
