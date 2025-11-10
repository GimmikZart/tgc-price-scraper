// scripts/run-scrape-cards-price.js
import fs from 'fs'
import path from 'path'
import puppeteer from 'puppeteer'
import { createClient } from '@supabase/supabase-js'
import { fileURLToPath } from 'url'

/* ===================== PATH/ESM ===================== */
const __filename = fileURLToPath(import.meta.url)
const __dirname  = path.dirname(__filename)

/* ===================== CONFIG ===================== */
const JSON_BASE_DIR = path.resolve(process.cwd(), 'data', 'cards', 'one_piece_tgc')

// Selettore prezzo su CardTrader
const PRICE_SELECTOR =
  'body > div.d-flex.flex-column.flex-grow-1.padding-top-for-header > div.bg-white > div > div > div.d-flex.pb-3 > div.w-100.ml-3.mr-0.mr-md-3 > div.blueprint-info-container > div > div:nth-child(1) > div.d-sm-flex.justify-content-between.flex-wrap > div:nth-child(2) > div.price-box__price'

// Timings gentili (overridable via ENV)
const PER_CARD_BASE_DELAY_MS = num(process.env.PER_CARD_BASE_DELAY_MS, 9000)
const PER_CARD_JITTER_MS     = num(process.env.PER_CARD_JITTER_MS, 3000)
const PER_FILE_COOLDOWN_MS   = num(process.env.PER_FILE_COOLDOWN_MS, 35000)

// Timeout & retry (overridable via ENV)
const NAV_TIMEOUT_MS         = num(process.env.NAV_TIMEOUT_MS, 90000)
const PRICE_TIMEOUT_MS       = num(process.env.PRICE_TIMEOUT_MS, 45000)
const PRICE_POLL_INTERVAL_MS = num(process.env.PRICE_POLL_INTERVAL_MS, 700)
const MAX_RETRIES_PER_URL    = num(process.env.MAX_RETRIES_PER_URL, 3)
const LONG_BACKOFF_ON_429_MS = num(process.env.LONG_BACKOFF_ON_429_MS, 10 * 60 * 1000) // 10min
const CONSEC_TIMEOUT_BREAKER = num(process.env.CONSEC_TIMEOUT_BREAKER, 5)             // breaker globale

// Restart periodico del browser (0 = disabilitato)
const RESTART_BROWSER_EVERY  = num(process.env.RESTART_BROWSER_EVERY, 20)

// Chromium preinstallato (Render con apt)
const PUPPETEER_EXECUTABLE_PATH = process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium'

/* ===================== LOG ===================== */
function log(level, payload) {
  const ts = new Date().toISOString()
  const msg = typeof payload === 'string'
    ? payload
    : (() => { try { return JSON.stringify(payload) } catch { return String(payload) } })()
  console.log(`[${ts}] [${level}] ${msg}`)
}

/* ===================== HELPERS ===================== */
function num(v, d) { const n = Number(v); return Number.isFinite(n) ? n : d }
const sleep   = (ms) => new Promise(r => setTimeout(r, ms))
const jitter  = (base, j) => Math.max(0, base + (Math.random() < 0.5 ? -1 : 1) * Math.floor(Math.random() * (j || 0)))
const isJson  = f => f.toLowerCase().endsWith('.json')
const writeJSON = (p, data) => fs.writeFileSync(p, JSON.stringify(data, null, 2), 'utf-8')

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
function looksLikeChallenge(html) {
  const h = (html || '').toLowerCase()
  return h.includes('cloudflare') || h.includes('just a moment') ||
         h.includes('attention required') || h.includes('verify you are a human')
}

/* ===================== SUPABASE ===================== */
let __sb = null
function getSupabase() {
  // NB: su Render definisci SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY mancanti')
  if (!__sb) __sb = createClient(url, key)
  return __sb
}
async function updateCardPrice(cardId, price) {
  try {
    const supabase = getSupabase()
    const { error } = await supabase
      .from('cards')
      .update({ cardtrader_avg_price: price })
      .eq('card_id', cardId)
    if (error) throw new Error(error.message)
    log('db', `OK card_id=${cardId} price=${price}`)
  } catch (err) {
    log('error', `DB FAIL card_id=${cardId}: ${err?.message || err}`)
  }
}

/* ===================== PUPPETEER ===================== */
async function launchBrowser() {
  const useExec = !!PUPPETEER_EXECUTABLE_PATH
  log('info', `Launching Chromium (customExec=${useExec})`)
  return puppeteer.launch({
    headless: true,
    executablePath: useExec ? PUPPETEER_EXECUTABLE_PATH : undefined,
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
      '--single-process', // più “parsimonioso” su istanze 512Mi
    ],
    defaultViewport: { width: 1200, height: 900, deviceScaleFactor: 1 },
  })
}
async function newLeanPage(browser) {
  const page = await browser.newPage()
  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ' +
    'AppleWebKit(537.36) (KHTML, like Gecko) ' +
    'Chrome/114.0.0.0 Safari/537.36'
  )
  await page.setCacheEnabled(false)
  await page.setRequestInterception(true)
  page.on('request', (req) => {
    const t = req.resourceType()
    if (t === 'image' || t === 'media' || t === 'font' || t === 'stylesheet') {
      req.abort().catch(() => {})
    } else {
      req.continue().catch(() => {})
    }
  })
  return page
}

/* ===================== NAV + WAIT (retry/backoff) ===================== */
let consecutiveTimeouts = 0

async function gotoAndWaitPrice(page, url) {
  for (let attempt = 1; attempt <= MAX_RETRIES_PER_URL; attempt++) {
    try {
      const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT_MS })
      const status = resp ? resp.status() : 0
      const finalUrl = page.url()
      log('nav', `→ ${url} | status=${status} final=${finalUrl} (try ${attempt}/${MAX_RETRIES_PER_URL})`)

      if (!resp || status >= 500) {
        log('warn', `Server error/nessuna resp (${status}). Retry...`)
        await sleep(2000 * attempt)
        if (attempt === 1) {
          try { await page.reload({ waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT_MS }) } catch {}
        }
        continue
      }

      if (status === 429 || status === 403) {
        log('warn', `Rate limited (${status}). Backoff lungo ${LONG_BACKOFF_ON_429_MS}ms`)
        await sleep(LONG_BACKOFF_ON_429_MS)
        throw new Error(`Blocked (${status})`)
      }

      const html = await page.content()
      if (looksLikeChallenge(html)) {
        log('warn', 'Challenge rilevata. Backoff lungo e retry...')
        await sleep(LONG_BACKOFF_ON_429_MS)
        throw new Error('Challenge page')
      }

      // Cookie banner (best effort)
      try {
        const cookieBtn = await page.$('#onetrust-accept-btn-handler, button[aria-label="Accept All Cookies"]')
        if (cookieBtn) { await cookieBtn.click(); await page.waitForTimeout(400) }
      } catch {}

      // Assicura visibilità contenitore prezzo
      await page.waitForSelector(PRICE_SELECTOR, { visible: true, timeout: Math.min(NAV_TIMEOUT_MS, 15000) })

      // Poll fino a numero “vero” (niente '-' o 'loading')
      await page.waitForFunction(
        (sel) => {
          const el = document.querySelector(sel)
          if (!el) return false
          const txt = (el.textContent || '').trim().toLowerCase()
          if (!txt || txt === '-' || txt.includes('loading')) return false
          let t = txt.replace(/[^\d,.\-]/g, '')
          if (t.includes(',') && t.includes('.')) t = t.replace(/\./g, '').replace(',', '.')
          else if (t.includes(',')) t = t.replace(',', '.')
          const n = parseFloat(t)
          return Number.isFinite(n)
        },
        { timeout: PRICE_TIMEOUT_MS, polling: PRICE_POLL_INTERVAL_MS },
        PRICE_SELECTOR
      )

      consecutiveTimeouts = 0
      return await page.$eval(PRICE_SELECTOR, el => el.textContent?.trim() || '')
    } catch (err) {
      const msg = String(err?.message || err)
      const isTimeout = msg.includes('timeout') || msg.includes('Navigation timeout')
      log(isTimeout ? 'error' : 'warn', isTimeout
        ? `Navigation timeout (try ${attempt})`
        : `Goto/Wait error: ${msg}`)

      if (isTimeout) consecutiveTimeouts++

      if (attempt === 1) {
        try { await page.reload({ waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT_MS }) } catch {}
      } else if (attempt === 2) {
        try { await page.close() } catch {}
        // ricreo la page nello stesso browser
        page = await newLeanPage(page.browser())
      }
      // al terzo fallimento il for uscirà con throw sotto
    }
  }
  throw new Error('gotoAndWaitPrice: MAX_RETRIES_PER_URL esauriti')
}

/* ===================== MAIN ===================== */
async function main() {
  log('start', `JSON_BASE_DIR = ${JSON_BASE_DIR}`)

  if (!fs.existsSync(JSON_BASE_DIR)) {
    throw new Error(`JSON base dir not found: ${JSON_BASE_DIR}`)
  }

  const files = fs.readdirSync(JSON_BASE_DIR).filter(isJson)
  if (!files.length) {
    log('warn', `Nessun .json in ${JSON_BASE_DIR}`)
    return
  }
  log('info', `File da processare: ${files.length}`)

  let browser = await launchBrowser()
  let page    = await newLeanPage(browser)

  let totalCardsVisited  = 0
  let totalPricesUpdated = 0
  let totalVerifiedFound = 0
  let cardsSinceRestart  = 0

  try {
    for (let i = 0; i < files.length; i++) {
      const fileName = files[i]
      const fullPath = path.join(JSON_BASE_DIR, fileName)
      log('file', `${i + 1}/${files.length}: ${fileName}`)

      // Leggi/parsa JSON
      let json
      try {
        json = JSON.parse(fs.readFileSync(fullPath, 'utf-8'))
      } catch (e) {
        log('error', `Parse ${fileName}: ${e.message}`)
        await sleep(jitter(PER_FILE_COOLDOWN_MS, 2000))
        continue
      }
      const { cards, isArrayRoot } = detectCardsRoot(json)
      if (!cards.length) {
        log('warn', `Nessuna carta in ${fileName}`)
        await sleep(jitter(PER_FILE_COOLDOWN_MS, 2000))
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

          try {
            const priceText = await gotoAndWaitPrice(page, url)
            const price = parsePrice(priceText)
            totalCardsVisited++
            cardsSinceRestart++

            if (price == null) {
              log('warn', `Prezzo non parsabile per "${card.name || card.code}" : "${priceText}"`)
            } else {
              // Aggiorna JSON
              card.slugs[si] = { ...slug, current_price: price }
              cards[ci] = { ...card }

              // Aggiorna DB
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
            log('error', `Scrape "${card.name || card.code}": ${e.message}`)
          }

          // Breaker su troppi timeout consecutivi
          if (consecutiveTimeouts >= CONSEC_TIMEOUT_BREAKER) {
            log('warn', `Troppi timeout consecutivi (${consecutiveTimeouts}). Sleep 15min & restart browser`)
            await sleep(15 * 60 * 1000)
            try { await page.close() } catch {}
            try { await browser.close() } catch {}
            browser = await launchBrowser()
            page    = await newLeanPage(browser)
            consecutiveTimeouts = 0
            cardsSinceRestart = 0
          }

          // Restart periodico per ripulire memoria/sessione
          if (RESTART_BROWSER_EVERY > 0 && cardsSinceRestart >= RESTART_BROWSER_EVERY) {
            log('info', `Restart browser dopo ${cardsSinceRestart} carte`)
            try { await page.close() } catch {}
            try { await browser.close() } catch {}
            browser = await launchBrowser()
            page    = await newLeanPage(browser)
            cardsSinceRestart = 0
          }

          // Delay “gentile”
          await sleep(jitter(PER_CARD_BASE_DELAY_MS, PER_CARD_JITTER_MS))
        }
      }

      if (updatedInThisFile > 0) {
        const toWrite = isArrayRoot ? cards : { ...json, cards }
        try {
          writeJSON(fullPath, toWrite)
          log('save', `Scritto ${fileName} (${updatedInThisFile} aggiornamenti)`)
        } catch (e) {
          log('error', `Write ${fileName}: ${e.message}`)
        }
      } else {
        log('info', `${fileName}: nessun aggiornamento`)
      }

      // Cooldown tra file
      await sleep(jitter(PER_FILE_COOLDOWN_MS, 5000))
    }

    log('done', { files: files.length, totalCardsVisited, totalVerifiedFound, totalPricesUpdated })
  } finally {
    try { await page.close() } catch {}
    try { await browser.close() } catch {}
  }
}

/* ===================== BOOT ===================== */
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(err => { console.error(err); process.exit(1) })
}
