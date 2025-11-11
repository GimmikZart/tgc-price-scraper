// scripts/run-scrape-cards-price.local.js
// Locale, robusto: niente waitForTimeout/waitForNetworkIdle, solo sleep() e polling testo con cifre.
// Scrive data/prices/one-piece.min.json (id, price in centesimi, lastUpdate ms).

import fs from 'fs'
import path from 'path'
import puppeteer from 'puppeteer'
import { createClient } from '@supabase/supabase-js'
import { fileURLToPath } from 'url'

/* ---------------- path helper per ESM ---------------- */
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/* ---------------- CONFIG ---------------- */
const JSON_BASE_DIR = path.resolve(process.cwd(), 'data', 'cards', 'one_piece_tgc')

// OUTPUT PRICE INDEX (separato dal catalogo versionato)
const PRICE_INDEX_DIR  = path.resolve(process.cwd(), 'data', 'prices')
const PRICE_INDEX_FILE = path.join(PRICE_INDEX_DIR, 'one-piece.min.json')

// ⛔️ Lasciare invariato
const PRICE_SELECTOR = 'body > div.d-flex.flex-column.flex-grow-1.padding-top-for-header > div.bg-white > div > div > div.d-flex.pb-3 > div.w-100.ml-3.mr-0.mr-md-3 > div.blueprint-info-container > div > div:nth-child(1) > div.d-sm-flex.justify-content-between.flex-wrap > div:nth-child(2) > div.price-box__price'

// Timings “gentili”
const PER_CARD_BASE_DELAY_MS = 6000
const PER_CARD_JITTER_MS     = 2000
const PER_FILE_COOLDOWN_MS   = 8000

// Timeout & retry
const NAV_TIMEOUT_MS           = 90000
const PROTOCOL_TIMEOUT_MS      = 120000
const SELECTOR_TIMEOUT_MS      = Number(process.env.SCRAPE_SELECTOR_TIMEOUT_MS || 90000) // 90s
const GOTO_RETRIES             = 2
const SELECTOR_RETRIES         = Number(process.env.SCRAPE_SELECTOR_RETRIES || 3)
const WATCHDOG_PAGE_STUCK_MS   = 180000
const RECREATE_BROWSER_EVERY_N = 200

// Cache: salta carte aggiornate di recente
const MAX_AGE_HOURS = Number(process.env.SCRAPE_MAX_AGE_HOURS || 24)
const MAX_AGE_MS = MAX_AGE_HOURS * 60 * 60 * 1000
const FORCE_ALL = String(process.env.FORCE_ALL || '') === '1'

// Debug / headful in locale
const DEBUG_HEADFUL = String(process.env.DEBUG_HEADFUL ?? '1') === '1'

// Limiti per test locale
const MAX_FILES = Number(process.env.MAX_FILES || 1)
const MAX_CARDS_PER_FILE = Number(process.env.MAX_CARDS_PER_FILE || 5)

/* ---------------- HELPERS ---------------- */
const sleep = (ms) => new Promise(r => setTimeout(r, ms))
const jittered = (base, jitter) => {
  const d = Math.floor(Math.random() * (jitter || 0))
  return Math.max(0, base + (Math.random() < 0.5 ? -d : d))
}
const isJsonFile = f => f.toLowerCase().endsWith('.json')
const writeJsonPretty = (p, data) => fs.writeFileSync(p, JSON.stringify(data, null, 2), 'utf-8')

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

/* ---------------- DB (opzionale) ---------------- */
function getSb() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    log('warn', 'SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY mancanti: DB disabilitato in locale')
    return null
  }
  return createClient(url, key)
}
async function updateCardPrice(cardId, price) {
  const supabase = getSb()
  if (!supabase) { log('db', `(simulazione) Aggiornato card_id=${cardId} → ${price}`); return }
  const { error } = await supabase.from('cards').update({ cardtrader_avg_price: price }).eq('card_id', cardId)
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
  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36'
  )
  await page.setCacheEnabled(false)
  // In locale: NON blocchiamo nulla per evitare side-effect
  return page
}

/* ---------------- Retry helpers ---------------- */
async function gotoWithRetry(page, url, tries = 1 + GOTO_RETRIES) {
  for (let i = 0; i < tries; i++) {
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT_MS })

      // piccole attese e interazioni "manuali" senza API puppeteer non portabili
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
    // Assicurati che il nodo esista
    try {
      await page.waitForSelector(selector, { visible: false, timeout: Math.min(15000, SELECTOR_TIMEOUT_MS) })
    } catch {
      // se non esiste ancora, backoff e retry
      await sleep(1500 + attempt * 500)
      continue
    }

    // Polling manuale finché non leggi un testo con cifre
    const start = Date.now()
    while (Date.now() - start < SELECTOR_TIMEOUT_MS) {
      try {
        const txt = await page.$eval(selector, el => (el.textContent || '').trim())
        if (txt && txt !== '-' && !/loading/i.test(txt) && /\d/.test(txt)) {
          return txt
        }
      } catch {
        // element momentaneamente non disponibile → ignora
      }
      // nudge: piccolo scroll e attesa breve
      try { await page.evaluate(() => window.scrollBy(0, Math.round(window.innerHeight * 0.15))) } catch {}
      await sleep(800)
    }

    // Se siamo qui, timeout per questo tentativo
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
  const files = filesAll.slice(0, MAX_FILES)
  log('info', `File da processare: ${files.length}/${filesAll.length} (MAX_FILES=${MAX_FILES})`)

  // Price index in memoria
  let priceIndex = new Map()
  const existingIndex = readJsonSafe(PRICE_INDEX_FILE, [])
  for (const row of existingIndex) {
    if (row && row.id != null) priceIndex.set(row.id, { price: row.price ?? null, lastUpdate: row.lastUpdate ?? null })
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

  let totalCardsVisited = 0
  let totalPricesUpdated = 0
  let totalVerifiedFound = 0
  let totalSkippedFresh = 0

  try {
    for (let i = 0; i < 1; i++) {
      const fileName = files[i]
      const fullPath = path.join(JSON_BASE_DIR, fileName)
      log('file', `${i + 1}/${files.length}: ${fileName}`)

      let json
      try { json = JSON.parse(fs.readFileSync(fullPath, 'utf-8')) }
      catch (e) { log('error', `Parse ${fileName}: ${e.message}`); await sleep(jittered(PER_FILE_COOLDOWN_MS, 2000)); continue }

      const { cards, isArrayRoot } = detectCardsRoot(json)
      if (!cards.length) { log('warn', `Nessuna carta in ${fileName}`); await sleep(jittered(PER_FILE_COOLDOWN_MS, 2000)); continue }

      let updatedInThisFile = 0
      let processedThisFile = 0

      fileLoop:
      for (let ci = 0; ci < cards.length; ci++) {
        if (processedThisFile >= MAX_CARDS_PER_FILE) break
        const card = cards[ci]
        if (!Array.isArray(card?.slugs) || !card.slugs.length) continue

        for (let si = 0; si < card.slugs.length; si++) {
          const slug = card.slugs[si]
          const isCT = String(slug?.service || '') === 'Card Trader'
          const isVerified = !!slug?.verified
          const url = slug?.url
          if (!isCT || !isVerified || !url) continue

          if (!FORCE_ALL && isFresh(slug.lastUpdate)) {
            totalSkippedFresh++
            log('skip', `fresh (<${MAX_AGE_HOURS}h) "${card.name || card.code}" → salto`)
            continue
          }

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

              // lastUpdate nel JSON catalogo
              card.slugs[si] = { ...slug, lastUpdate: now }
              cards[ci] = { ...card }

              if (card.id != null) await updateCardPrice(card.id, price)
              else log('warn', `card.id mancante per "${card.name || card.code}"`)

              if (card.id != null && priceCents != null) priceIndex.set(card.id, { price: priceCents, lastUpdate: now })

              updatedInThisFile++
              totalPricesUpdated++
              processedThisFile++
              log('ok', `Aggiornato ${price} (€) per "${card.name || card.code}"`)
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

      if (updatedInThisFile > 0) {
        const toWrite = isArrayRoot ? cards : { ...json, cards }
        try { writeJsonPretty(fullPath, toWrite); log('save', `Scritto ${fileName} (${updatedInThisFile} aggiornamenti)`) }
        catch (e) { log('error', `Write ${fileName}: ${e.message}`) }
      } else {
        log('info', `${fileName}: nessun aggiornamento`)
      }

      await sleep(jittered(PER_FILE_COOLDOWN_MS, 2000))
    }

    // ---- FLUSH FINALE: scrivi price index in modo atomico ----
    try {
      const compact = []
      for (const [id, v] of priceIndex.entries()) compact.push({ id, price: v.price ?? null, lastUpdate: v.lastUpdate ?? null })
      compact.sort((a, b) => (a.id > b.id ? 1 : a.id < b.id ? -1 : 0))
      atomicWriteJson(PRICE_INDEX_FILE, compact)
      log('save', `Price index scritto: ${PRICE_INDEX_FILE} (entries=${compact.length})`)
    } catch (e) {
      log('error', `Scrittura price index: ${e.message}`)
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
