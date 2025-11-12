// scripts/run-scrape-cards-price.js
import fs from 'fs'
import path from 'path'
import puppeteer from 'puppeteer'
import { createClient } from '@supabase/supabase-js'
import { fileURLToPath } from 'url'
import 'dotenv/config'  // <--- carica automaticamente .env

/* ---------------- path helper per ESM ---------------- */
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/* ---------------- CONFIG ---------------- */
const JSON_BASE_DIR = path.resolve(process.cwd(), 'data', 'cards', 'one_piece_tgc')

// Supabase Storage (bucket/oggetto per l'index prezzi)
const PRICES_BUCKET = process.env.PRICES_BUCKET || 'prices'
const PRICES_OBJECT = process.env.PRICES_OBJECT || 'one-piece.min.json'

// Checkpoint (upload parziali durante la run)
const CHECKPOINT_ENABLED          = String(process.env.CHECKPOINT || '1') === '1'
const CHECKPOINT_EVERY_FILES      = Number(process.env.CHECKPOINT_EVERY_FILES || 1)   // ogni N file
const CHECKPOINT_MIN_SECONDS      = Number(process.env.CHECKPOINT_MIN_SECONDS || 10)  // almeno X s tra upload
const CHECKPOINT_EVERY_UPDATES    = Number(process.env.CHECKPOINT_EVERY_UPDATES || 0) // 0 = disattivo (per-carta)

// Selettore CardTrader (immutato)
const PRICE_SELECTOR = 'body > div.d-flex.flex-column.flex-grow-1.padding-top-for-header > div.bg-white > div > div > div.d-flex.pb-3 > div.w-100.ml-3.mr-0.mr-md-3 > div.blueprint-info-container > div > div:nth-child(1) > div.d-sm-flex.justify-content-between.flex-wrap > div:nth-child(2) > div.price-box__price'

// Timings “gentili”
const PER_CARD_BASE_DELAY_MS = 9000
const PER_CARD_JITTER_MS     = 3000
const PER_FILE_COOLDOWN_MS   = 35000

// Timeout & retry
const NAV_TIMEOUT_MS           = 120000
const PROTOCOL_TIMEOUT_MS      = 120000
const SELECTOR_TIMEOUT_MS      = 30000
const GOTO_RETRIES             = 2
const SELECTOR_RETRIES         = 2
const WATCHDOG_PAGE_STUCK_MS   = 180000
const RECREATE_BROWSER_EVERY_N = 250

// Cache: salta carte aggiornate di recente (basato su priceIndex su Storage)
const MAX_AGE_HOURS = Number(process.env.SCRAPE_MAX_AGE_HOURS || 24)
const MAX_AGE_MS = MAX_AGE_HOURS * 60 * 60 * 1000
const FORCE_ALL = String(process.env.FORCE_ALL || '') === '1'

/* ---------------- HELPERS ---------------- */
const sleep = (ms) => new Promise(r => setTimeout(r, ms))
const jittered = (base, jitter) => {
  const d = Math.floor(Math.random() * (jitter || 0))
  return Math.max(0, base + (Math.random() < 0.5 ? -d : d))
}
const isJsonFile = f => f.toLowerCase().endsWith('.json')

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

// euro (float) → centesimi (int)
function toCents(n) {
  if (n == null || !Number.isFinite(n)) return null
  return Math.round(n * 100)
}

// Log
function log(type, payload) {
  const msg = typeof payload === 'string'
    ? payload
    : (() => { try { return JSON.stringify(payload) } catch { return String(payload) } })()
  console.log(`[${new Date().toISOString()}] [${type}] ${msg}`)
}

/* ---------------- Supabase helpers ---------------- */
function getSbService() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY mancanti')
  return createClient(url, key)
}

// Legge eventuale index già presente su Storage per riusare lastUpdate/price come cache
async function readPriceIndexFromStorage() {
  const sb = getSbService()
  const { data, error } = await sb.storage.from(PRICES_BUCKET).download(PRICES_OBJECT)
  if (error || !data) {
    log('info', `Price index su Storage non trovato (bucket=${PRICES_BUCKET}, object=${PRICES_OBJECT})`)
    return []
  }
  try {
    const text = await data.text()
    const json = JSON.parse(text)
    if (Array.isArray(json)) {
      log('info', `Price index pre-caricato da Storage: ${json.length} entries`)
      return json
    }
  } catch (e) {
    log('warn', `Parse price index Storage fallito: ${e.message}`)
  }
  return []
}

function buildCompactArray(priceIndexMap) {
  const compact = []
  for (const [id, v] of priceIndexMap.entries()) {
    compact.push({ id, price: v.price ?? null, lastUpdate: v.lastUpdate ?? null })
  }
  compact.sort((a, b) => (a.id > b.id ? 1 : a.id < b.id ? -1 : 0))
  return compact
}

async function uploadPriceIndexToStorage(priceIndexMap) {
  const sb = getSbService()
  const rows = buildCompactArray(priceIndexMap)
  const payload = JSON.stringify(rows)
  const blob = new Blob([payload], { type: 'application/json' })
  const { error } = await sb.storage
    .from(PRICES_BUCKET)
    .upload(PRICES_OBJECT, blob, { upsert: true })
  if (error) throw error
  log('save', `Price index caricato su Supabase Storage: bucket=${PRICES_BUCKET}, object=${PRICES_OBJECT} (entries=${rows.length})`)
}

/* ---------------- DB (tabella cards) ---------------- */
async function updateCardPrice(cardId, price) {
  const sb = getSbService()
  const { error } = await sb
    .from('cards')
    .update({ cardtrader_avg_price: price }) // euro (float)
    .eq('card_id', cardId)
  if (error) throw new Error(error.message)
  log('db', `Aggiornato card_id=${cardId} → ${price}`)
}

/* ---------------- Puppeteer bootstrap ---------------- */
async function launchBrowser() {
  return puppeteer.launch({
    headless: true,
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
      '--single-process',
    ]
  })
}

async function makeLeanPage(browser) {
  const page = await browser.newPage()
  page.setDefaultNavigationTimeout(NAV_TIMEOUT_MS)
  page.setDefaultTimeout(SELECTOR_TIMEOUT_MS)

  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36'
  )
  await page.setCacheEnabled(false)

  // Blocca risorse pesanti
  await page.setRequestInterception(true)
  page.on('request', (req) => {
    const t = req.resourceType()
    if (t === 'image' || t === 'media' || t === 'font' || t === 'stylesheet') {
      req.abort().catch(() => {})
    } else req.continue().catch(() => {})
  })

  return page
}

/* ---------------- Retry helpers ---------------- */
async function gotoWithRetry(page, url, tries = 1 + GOTO_RETRIES) {
  for (let i = 0; i < tries; i++) {
    try {
      await page.goto(url, { waitUntil: 'networkidle2', timeout: NAV_TIMEOUT_MS })
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
  for (let i = 0; i < tries; i++) {
    await page.waitForSelector(selector, { visible: true, timeout: SELECTOR_TIMEOUT_MS })
    const t0 = Date.now()
    while (Date.now() - t0 < SELECTOR_TIMEOUT_MS) {
      const txt = await page.$eval(selector, el => el.textContent?.trim() || '')
      if (txt && txt !== '-' && !txt.toLowerCase().includes('loading')) {
        return txt
      }
      await page.waitForTimeout(800)
    }
    if (i < tries - 1) {
      log('warn', `selector polling timeout → retry ${i + 1}/${tries - 1}`)
      try { await page.evaluate(() => window.scrollTo(0, 300)) } catch {}
      await page.waitForTimeout(1500)
    }
  }
  throw new Error(`Waiting for selector \`${selector}\` failed: ${SELECTOR_TIMEOUT_MS * tries}ms exceeded`)
}

/* ---------------- MAIN ---------------- */
async function main() {
  log('start', `JSON_BASE_DIR = ${JSON_BASE_DIR} | MAX_AGE_HOURS=${MAX_AGE_HOURS} | FORCE_ALL=${FORCE_ALL}`)

  if (!fs.existsSync(JSON_BASE_DIR)) {
    throw new Error(`JSON base dir not found: ${JSON_BASE_DIR}`)
  }

  // Ordine inverso: sort numerico + reverse
  const files = fs
    .readdirSync(JSON_BASE_DIR)
    .filter(isJsonFile)
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }))
    .reverse()

  if (!files.length) {
    log('warn', `Nessun .json in ${JSON_BASE_DIR}`)
    return
  }
  log('info', `File da processare: ${files.length}`)
  log('info', `Primo file (in ordine inverso): ${files[0]}`)

  // Price index in memoria: id -> { price (cents), lastUpdate (ms) }
  const priceIndex = new Map()

  // Pre-carica index da Storage per avere lastUpdate e saltare le carte fresche
  try {
    const existing = await readPriceIndexFromStorage()
    for (const row of existing) {
      if (row && row.id != null) {
        priceIndex.set(row.id, { price: row.price ?? null, lastUpdate: row.lastUpdate ?? null })
      }
    }
  } catch (e) {
    log('warn', `Impossibile leggere index da Storage: ${e.message}`)
  }

  log('info', `Price index pre-caricato: ${priceIndex.size} entries`)

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

  // checkpoint state
  let lastCheckpointAt = 0
  let updatesSinceLastCheckpoint = 0

  const shouldCheckpoint = (fileIndex, updatedInThisFile) => {
    if (!CHECKPOINT_ENABLED) return false
    const enoughTime   = (Date.now() - lastCheckpointAt) > (CHECKPOINT_MIN_SECONDS * 1000)
    const fileBoundary = ((fileIndex + 1) % CHECKPOINT_EVERY_FILES) === 0
    const enoughUpdates = CHECKPOINT_EVERY_UPDATES > 0 && updatesSinceLastCheckpoint >= CHECKPOINT_EVERY_UPDATES
    return (updatedInThisFile > 0) && (enoughTime || fileBoundary || enoughUpdates)
  }

  async function doCheckpoint(reason) {
    await uploadPriceIndexToStorage(priceIndex)
    lastCheckpointAt = Date.now()
    updatesSinceLastCheckpoint = 0
    log('info', `Checkpoint → Storage (${reason})`)
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
      try {
        json = JSON.parse(fs.readFileSync(fullPath, 'utf-8'))
      } catch (e) {
        log('error', `Parse ${fileName}: ${e.message}`)
        await sleep(jittered(PER_FILE_COOLDOWN_MS, 2000))
        continue
      }

      const { cards } = detectCardsRoot(json)
      if (!cards.length) {
        log('warn', `Nessuna carta in ${fileName}`)
        await sleep(jittered(PER_FILE_COOLDOWN_MS, 2000))
        continue
      }

      let updatedInThisFile = 0

      for (let ci = 0; ci < cards.length; ci++) {
        const card = cards[ci]
        if (!Array.isArray(card?.slugs) || !card.slugs.length) continue

        // SKIP basato su priceIndex (Supabase Storage)
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

          // manutenzione periodica
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

            // cookie (best effort)
            try {
              const b = await page.$('#onetrust-accept-btn-handler, button[aria-label="Accept All Cookies"]')
              if (b) { await b.click(); await page.waitForTimeout(400); log('info','Cookie OK') }
            } catch {}

            const priceText = await waitForPriceWithRetry(page, PRICE_SELECTOR)
            const price = parsePrice(priceText) // euro (float)
            totalCardsVisited++
            lastActivityAt = Date.now()

            if (price == null) {
              log('warn', `Prezzo non parsabile per "${card.name || card.code}" : "${priceText}"`)
            } else {
              const now = Date.now()
              const priceCents = toCents(price)

              if (card.id != null) {
                await updateCardPrice(card.id, price)
              } else {
                log('warn', `card.id mancante per "${card.name || card.code}"`)
              }

              if (card.id != null && priceCents != null) {
                priceIndex.set(card.id, { price: priceCents, lastUpdate: now })
              }

              updatedInThisFile++
              totalPricesUpdated++
              updatesSinceLastCheckpoint++   // <-- conteggio per checkpoint "per aggiornamenti"
              log('ok', `Aggiornato ${price} (€) per "${card.name || card.code}"`)

              // Checkpoint "in corsa" (per aggiornamenti/tempo)
              if (shouldCheckpoint(i, 1)) {
                try { await doCheckpoint('per-updates') } 
                catch (e) { log('warn', `Checkpoint upload fallito: ${e.message}`) }
              }
            }
          } catch (e) {
            const msg = e?.message || String(e)
            log('error', `Scrape "${card.name || card.code}": ${msg}`)
            if (/Network\.enable timed out|Target closed|Execution context was destroyed/i.test(msg)) {
              log('warn', 'recupero: ricreo pagina')
              try { await page.close() } catch {}
              try {
                page = await makeLeanPage(browser)
              } catch {
                log('warn', 'recupero: ricreo browser')
                try { await browser.close() } catch {}
                browser = await launchBrowser()
                page = await makeLeanPage(browser)
              }
            }
          }

          // delay gentile tra carte
          await sleep(jittered(PER_CARD_BASE_DELAY_MS, PER_CARD_JITTER_MS))
        }
      }

      // CHECKPOINT per-file (boundary/tempo)
      if (shouldCheckpoint(i, updatedInThisFile)) {
        try { await doCheckpoint('per-file') }
        catch (e) { log('warn', `Checkpoint upload fallito: ${e.message}`) }
      }

      await sleep(jittered(PER_FILE_COOLDOWN_MS, 5000))
    }

    // FLUSH FINALE su Supabase Storage
    try {
      await uploadPriceIndexToStorage(priceIndex)
    } catch (e) {
      log('error', `Upload finale price index fallito: ${e.message}`)
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
