// scripts/run-scrape-cards-price.js
import fs from 'fs'
import path from 'path'
import puppeteer from 'puppeteer'         // NON puppeteer-core
import { createClient } from '@supabase/supabase-js'
import { fileURLToPath } from 'url'

// === path helper ESM ===
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// === CONFIG ===
const JSON_BASE_DIR = path.resolve(process.cwd(), 'data', 'cards', 'one_piece_tgc')

// Selettore attuale CardTrader
const PRICE_SELECTOR =
  'body > div.d-flex.flex-column.flex-grow-1.padding-top-for-header > div.bg-white > div > div > div.d-flex.pb-3 > div.w-100.ml-3.mr-0.mr-md-3 > div.blueprint-info-container > div > div:nth-child(1) > div.d-sm-flex.justify-content-between.flex-wrap > div:nth-child(2) > div.price-box__price'

// Timing "gentili"
const PER_CARD_BASE_DELAY_MS = 8000
const PER_CARD_JITTER_MS     = 2500
const PER_FILE_COOLDOWN_MS   = 25000

// Timeout e retry
const NAV_TIMEOUT_MS         = 120_000   // 120s per evitare i 90s fissi
const PRICE_WAIT_TOTAL_MS    = 35_000    // attesa max per prezzo
const PRICE_POLL_MS          = 900
const MAX_NAV_RETRIES        = 2         // riprova la pagina max 2 volte
const BACKOFF_AFTER_TIMEOUT  = 15_000    // pausa dopo timeout di navigazione

// === HELPERS ===
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

// === LOG ===
function log(type, payload) {
  const msg = typeof payload === 'string'
    ? payload
    : (() => { try { return JSON.stringify(payload) } catch { return String(payload) } })()
  console.log(`[${new Date().toISOString()}] [${type}] ${msg}`)
}

// === DB ===
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

// === Puppeteer launch ===
async function launchBrowser() {
  // Se è stato definito un eseguibile esterno (STRADA B), usalo.
  // Altrimenti Puppeteer userà quello che ha scaricato in build (STRADA A).
  const customExec = process.env.PUPPETEER_EXECUTABLE_PATH
  log('info', `Launching Chromium (customExec=${!!customExec})`)

  return puppeteer.launch({
    headless: true,
    executablePath: customExec || undefined,
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
      '--single-process',                 // aiuta sui 512 MB
    ],
    defaultViewport: { width: 1200, height: 800, deviceScaleFactor: 1 },
  })
}

async function newLeanPage(browser) {
  const page = await browser.newPage()

  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ' +
    'AppleWebKit/537.36 (KHTML, like Gecko) ' +
    'Chrome/114.0.0.0 Safari/537.36'
  )
  await page.setCacheEnabled(false)

  // Blocca risorse pesanti
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

// Goto con retry/backoff
async function safeGoto(page, url) {
  for (let attempt = 0; attempt <= MAX_NAV_RETRIES; attempt++) {
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT_MS })
      // poi aspetta “rete calma”, ma senza hard stop
      await page.waitForNetworkIdle({ idleTime: 1200, timeout: 20_000 }).catch(() => {})
      return
    } catch (e) {
      if (attempt < MAX_NAV_RETRIES) {
        log('warn', `goto timeout → retry ${attempt + 1}/${MAX_NAV_RETRIES}`)
        await sleep(BACKOFF_AFTER_TIMEOUT)
      } else {
        throw e
      }
    }
  }
}

// Attende il prezzo con polling più paziente
async function waitPrice(page) {
  await page.waitForSelector(PRICE_SELECTOR, { visible: true, timeout: 25_000 })
  const t0 = Date.now()

  while (Date.now() - t0 < PRICE_WAIT_TOTAL_MS) {
    const text = await page.$eval(PRICE_SELECTOR, el => el.textContent?.trim() || '')
    if (text && text !== '-' && !text.toLowerCase().includes('loading')) return text
    await page.waitForTimeout(PRICE_POLL_MS)
  }
  return '' // non trovato
}

// === MAIN ===
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

  const browser = await launchBrowser()
  const page = await newLeanPage(browser)

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
          try {
            log('nav', `→ ${url}`)
            await safeGoto(page, url)

            // cookie (best effort)
            try {
              const b = await page.$('#onetrust-accept-btn-handler, button[aria-label="Accept All Cookies"]')
              if (b) { await b.click(); await page.waitForTimeout(350); log('info','Cookie OK') }
            } catch {}

            const priceText = await waitPrice(page)
            const price = parsePrice(priceText)
            totalCardsVisited++

            if (price == null) {
              log('warn', `Prezzo non parsabile per "${card.name || card.code}" (text="${priceText}")`)
            } else {
              // salva su JSON
              card.slugs[si] = { ...slug, current_price: price }
              cards[ci] = { ...card }

              // salva su DB
              if (card.id != null) {
                try { await updateCardPrice(card.id, price) }
                catch (dbErr) { log('error', `DB ${card.id}: ${dbErr.message}`) }
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

          await sleep(jittered(PER_CARD_BASE_DELAY_MS, PER_CARD_JITTER_MS))
        }
      }

      if (updatedInThisFile > 0) {
        const toWrite = isArrayRoot ? cards : { ...json, cards }
        try {
          writeJsonSafe(fullPath, toWrite)
          log('save', `Scritto ${fileName} (${updatedInThisFile} aggiorn.)`)
        } catch (e) {
          log('error', `Write ${fileName}: ${e.message}`)
        }
      } else {
        log('info', `${fileName}: nessun aggiornamento`)
      }

      await sleep(jittered(PER_FILE_COOLDOWN_MS, 4000))
    }

    log('done', { files: files.length, totalCardsVisited, totalVerifiedFound, totalPricesUpdated })
  } finally {
    try { await page.close() } catch {}
    try { await browser.close() } catch {}
  }
}

// esegui se chiamato direttamente
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(err => { console.error(err); process.exit(1) })
}
