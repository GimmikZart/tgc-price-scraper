// scripts/run-scrape-cards-price.js
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

// Selettore CardTrader
const PRICE_SELECTOR = 'body > div.d-flex.flex-column.flex-grow-1.padding-top-for-header > div.bg-white > div > div > div.d-flex.pb-3 > div.w-100.ml-3.mr-0.mr-md-3 > div.blueprint-info-container > div > div:nth-child(1) > div.d-sm-flex.justify-content-between.flex-wrap > div:nth-child(2) > div.price-box__price'

// Timings “gentili”
const PER_CARD_BASE_DELAY_MS = 9000
const PER_CARD_JITTER_MS     = 3000
const PER_FILE_COOLDOWN_MS   = 35000

// Timeout & retry
const NAV_TIMEOUT_MS           = 120000          // 120s per goto
const PROTOCOL_TIMEOUT_MS      = 120000          // 120s per protocollo CDP
const SELECTOR_TIMEOUT_MS      = 30000           // 30s per vedere il prezzo
const GOTO_RETRIES             = 2               // n. retry extra oltre al primo tentativo
const SELECTOR_RETRIES         = 2
const WATCHDOG_PAGE_STUCK_MS   = 180000          // se non logghiamo nulla per 3 minuti, ricreo la page
const RECREATE_BROWSER_EVERY_N = 250             // chiude/riapre il browser ogni N navigazioni (evita fughe memoria)

/* ---------------- HELPERS ---------------- */
const sleep = (ms) => new Promise(r => setTimeout(r, ms))
const jittered = (base, jitter) => {
  const d = Math.floor(Math.random() * (jitter || 0))
  return Math.max(0, base + (Math.random() < 0.5 ? -d : d))
}
const isJsonFile = f => f.toLowerCase().endsWith('.json')
const writeJsonSafe = (p, data) => fs.writeFileSync(p, JSON.stringify(data, null, 2), 'utf-8')
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

// Log
function log(type, payload) {
  const msg = typeof payload === 'string'
    ? payload
    : (() => { try { return JSON.stringify(payload) } catch { return String(payload) } })()
  console.log(`[${new Date().toISOString()}] [${type}] ${msg}`)
}

/* ---------------- DB ---------------- */
function getSb() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY mancanti')
  return createClient(url, key)
}
async function updateCardPrice(cardId, price) {
  const supabase = getSb()
  const { error } = await supabase
    .from('cards')
    .update({ cardtrader_avg_price: price })
    .eq('card_id', cardId)
  if (error) throw new Error(error.message)
  log('db', `Aggiornato card_id=${cardId} → ${price}`)
}

/* ---------------- Puppeteer bootstrap ---------------- */
async function launchBrowser() {
  return puppeteer.launch({
    headless: true,
    protocolTimeout: PROTOCOL_TIMEOUT_MS, // evita “Network.enable timed out”
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
      '--single-process', // su istanze piccole aiuta
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

  // Blocca risorse pesanti (immagini/media/font/css)
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
        await sleep(5000 * (i + 1)) // backoff
      } else {
        throw e
      }
    }
  }
}

async function waitForPriceWithRetry(page, selector, tries = 1 + SELECTOR_RETRIES) {
  for (let i = 0; i < tries; i++) {
    await page.waitForSelector(selector, { visible: true, timeout: SELECTOR_TIMEOUT_MS })
    // polling interno sul testo
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
      // piccolo nudge: prova un leggero scroll e reload soft
      try { await page.evaluate(() => window.scrollTo(0, 300)) } catch {}
      await page.waitForTimeout(1500)
    }
  }
  throw new Error(`Waiting for selector \`${selector}\` failed: ${SELECTOR_TIMEOUT_MS * tries}ms exceeded`)
}

/* ---------------- MAIN ---------------- */
async function main() {
  log('start', `JSON_BASE_DIR = ${JSON_BASE_DIR}`)

  if (!fs.existsSync(JSON_BASE_DIR)) {
    throw new Error(`JSON base dir not found: ${JSON_BASE_DIR}`)
  }

  const files = fs.readdirSync(JSON_BASE_DIR).filter(isJsonFile)
  if (!files.length) {
    log('warn', `Nessun .json in ${JSON_BASE_DIR}`)
    return
  }
  log('info', `File da processare: ${files.length}`)

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

      const { cards, isArrayRoot } = detectCardsRoot(json)
      if (!cards.length) {
        log('warn', `Nessuna carta in ${fileName}`)
        await sleep(jittered(PER_FILE_COOLDOWN_MS, 2000))
        continue
      }

      let updatedInThisFile = 0

      for (let ci = 0; ci < cards.length; ci++) {
        const card = cards[ci]
        if (!Array.isArray(card?.slugs) || !card.slugs.length) continue

        for (let si = 0; si < card.slugs.length; si++) {
          const slug = card.slugs[si]
          const isCT = String(slug?.service || '') === 'Card Trader'
          const isVerified = !!slug?.verified
          const url = slug?.url
          if (!isCT || !isVerified || !url) continue

          totalVerifiedFound++

          // ogni tot navigazioni, ricreo il browser (anti-leak)
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
            const price = parsePrice(priceText)
            totalCardsVisited++
            lastActivityAt = Date.now()

            if (price == null) {
              log('warn', `Prezzo non parsabile per "${card.name || card.code}" : "${priceText}"`)
            } else {
              // salva su JSON
              card.slugs[si] = { ...slug, current_price: price }
              cards[ci] = { ...card }

              // salva su DB
              if (card.id != null) {
                await updateCardPrice(card.id, price)
              } else {
                log('warn', `card.id mancante per "${card.name || card.code}"`)
              }

              updatedInThisFile++
              totalPricesUpdated++
              log('ok', `Aggiornato ${price} per "${card.name || card.code}"`)
            }
          } catch (e) {
            // recupero mirato da errori di protocollo/proxy
            const msg = e?.message || String(e)
            log('error', `Scrape "${card.name || card.code}": ${msg}`)
            if (/Network\.enable timed out|Target closed|Execution context was destroyed/i.test(msg)) {
              // pagina rotta → ricreo la pagina; se fallisce, ricreo browser
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

      // scrivi su file se aggiornato
      if (updatedInThisFile > 0) {
        const toWrite = isArrayRoot ? cards : { ...json, cards }
        try {
          writeJsonSafe(fullPath, toWrite)
          log('save', `Scritto ${fileName} (${updatedInThisFile} aggiornamenti)`)
        } catch (e) {
          log('error', `Write ${fileName}: ${e.message}`)
        }
      } else {
        log('info', `${fileName}: nessun aggiornamento`)
      }

      // cooldown tra file
      await sleep(jittered(PER_FILE_COOLDOWN_MS, 5000))
    }

    log('done', { files: files.length, totalCardsVisited, totalVerifiedFound, totalPricesUpdated })
  } finally {
    try { await page.close() } catch {}
    try { await browser.close() } catch {}
  }
}

/* ---------------- run if invoked directly ---------------- */
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(err => { console.error(err); process.exit(1) })
}
