// FRONTEND/scripts/run-scrape-cards-price.js
// Node ESM (package.json "type": "module")

import fs from 'fs'
import path from 'path'
import puppeteer from 'puppeteer'
import { createClient } from '@supabase/supabase-js'
import { fileURLToPath } from 'url'

// ---------- PATH/WD ----------
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const CWD = process.cwd()

// ---------- ENV KNOBS (tunable da Render) ----------
const JSON_BASE_DIR = process.env.JSON_BASE_DIR
  ? path.resolve(CWD, process.env.JSON_BASE_DIR)
  : path.resolve(CWD, 'data', 'cards', 'one_piece_tgc')

const MAX_FILES               = Number(process.env.MAX_FILES || 1)         // limita per cron
const PRICE_TIMEOUT_MS        = Number(process.env.PRICE_TIMEOUT_MS || 60000)
const PRICE_POLL_INTERVAL_MS  = Number(process.env.PRICE_POLL_INTERVAL_MS || 800)
const PER_CARD_BASE_DELAY_MS  = Number(process.env.PER_CARD_BASE_DELAY_MS || 6000)
const PER_CARD_JITTER_MS      = Number(process.env.PER_CARD_JITTER_MS || 2000)
const PER_FILE_COOLDOWN_MS    = Number(process.env.PER_FILE_COOLDOWN_MS || 15000)
const RESTART_BROWSER_EVERY   = Number(process.env.RESTART_BROWSER_EVERY || 20) // riavvia ogni N visite per RAM

// Supabase (Service Role per update server-side)
const SUPABASE_URL  = process.env.SUPABASE_URL
const SUPA_SKEY     = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPA_SKEY) {
  log('error', 'Mancano SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY nelle env.')
  process.exit(1)
}

// ---------- SELETTORE PREZZO ----------
const PRICE_SELECTOR =
  'body > div.d-flex.flex-column.flex-grow-1.padding-top-for-header > div.bg-white > div > div > div.d-flex.pb-3 > div.w-100.ml-3.mr-0.mr-md-3 > div.blueprint-info-container > div > div:nth-child(1) > div.d-sm-flex.justify-content-between.flex-wrap > div:nth-child(2) > div.price-box__price'

// ---------- LOG ----------
function ts() { return new Date().toISOString() }
function log(level, msg) { console.log(`[${ts()}] [${level}] ${msg}`) }

// ---------- HELPERS ----------
const sleep = (ms) => new Promise(r => setTimeout(r, ms))
const jittered = (base, j) => {
  const d = Math.floor(Math.random() * (j || 0))
  return Math.max(0, base + (Math.random() < 0.5 ? -d : d))
}
const isJsonFile = (f) => f.toLowerCase().endsWith('.json')

function detectCardsRoot(json) {
  if (Array.isArray(json)) return { cards: json, isArrayRoot: true }
  if (json && typeof json === 'object' && Array.isArray(json.cards)) {
    return { cards: json.cards, isArrayRoot: false }
  }
  return { cards: [], isArrayRoot: false }
}

function writeJsonSafe(fullPath, data) {
  fs.writeFileSync(fullPath, JSON.stringify(data, null, 2), 'utf-8')
}

function parsePrice(text) {
  if (!text) return null
  let t = String(text).trim().replace(/[^\d,.\-]/g, '')
  if (t.includes(',') && t.includes('.')) t = t.replace(/\./g, '').replace(',', '.')
  else if (t.includes(',')) t = t.replace(',', '.')
  const n = parseFloat(t)
  return Number.isFinite(n) ? n : null
}

// ---------- SUPABASE ----------
const supabase = createClient(SUPABASE_URL, SUPA_SKEY)

async function updateCardPrice(cardId, price) {
  try {
    const { error } = await supabase
      .from('cards')
      .update({ cardtrader_avg_price: price })
      .eq('card_id', cardId)

    if (error) throw error
    log('db', `Aggiornato DB: card_id=${cardId} → price=${price}`)
  } catch (err) {
    log('error', `DB update fallito per card_id=${cardId}: ${err?.message || err}`)
  }
}

// ---------- PUPPETEER ----------
function getExecutablePath() {
  // Se su Render hai settato l'env PUPPETEER_EXECUTABLE_PATH (es. /usr/bin/chromium)
  if (process.env.PUPPETEER_EXECUTABLE_PATH) return process.env.PUPPETEER_EXECUTABLE_PATH
  // Altrimenti prova quello bundled (se presente)
  try { return puppeteer.executablePath() } catch { return undefined }
}

async function launchBrowser() {
  const executablePath = getExecutablePath()
  const browser = await puppeteer.launch({
    headless: true,
    executablePath,
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
    ],
    defaultViewport: { width: 1280, height: 900, deviceScaleFactor: 1 },
  })
  return browser
}

async function newLeanPage(browser) {
  const page = await browser.newPage()
  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ' +
    'AppleWebKit/537.36 (KHTML, like Gecko) ' +
    'Chrome/114.0.0.0 Safari/537.36'
  )
  await page.setCacheEnabled(false)

  // NON bloccare XHR/fetch. Taglia solo immagini/media/font.
  await page.setRequestInterception(true)
  page.on('request', (req) => {
    const t = req.resourceType()
    if (t === 'image' || t === 'media' || t === 'font') {
      req.abort().catch(() => {})
    } else {
      req.continue().catch(() => {})
    }
  })

  return page
}

// ---------- MAIN ----------
async function main() {
  log('start', `JSON_BASE_DIR = ${JSON_BASE_DIR}`)

  if (!fs.existsSync(JSON_BASE_DIR)) {
    log('error', `Cartella non trovata: ${JSON_BASE_DIR}`)
    process.exit(1)
  }

  const filesAll = fs.readdirSync(JSON_BASE_DIR).filter(isJsonFile).sort()
  const files = filesAll.slice(0, MAX_FILES)
  log('info', `File da processare: ${files.length}`)

  let browser = await launchBrowser()
  let page = await newLeanPage(browser)

  let totalVisited = 0
  let totalVerified = 0
  let totalUpdated = 0

  try {
    for (let fi = 0; fi < files.length; fi++) {
      const fileName = files[fi]
      const fullPath = path.join(JSON_BASE_DIR, fileName)
      log('file', `${fi + 1}/${files.length}: ${fileName}`)

      // parse JSON
      let json
      try {
        const raw = fs.readFileSync(fullPath, 'utf-8')
        json = JSON.parse(raw)
      } catch (err) {
        log('error', `JSON non valido in ${fileName}: ${err?.message || err}`)
        await sleep(jittered(PER_FILE_COOLDOWN_MS, 3000))
        continue
      }

      const { cards, isArrayRoot } = detectCardsRoot(json)
      if (!Array.isArray(cards) || cards.length === 0) {
        log('warn', `Nessuna carta in ${fileName}`)
        await sleep(jittered(PER_FILE_COOLDOWN_MS, 3000))
        continue
      }

      let updatedInFile = 0

      // loop carte
      for (let ci = 0; ci < cards.length; ci++) {
        const card = cards[ci]
        if (!Array.isArray(card?.slugs) || card.slugs.length === 0) continue

        for (let si = 0; si < card.slugs.length; si++) {
          const slug = card.slugs[si]
          const isCardTrader = String(slug?.service || '') === 'Card Trader'
          const isVerified = !!slug?.verified
          const url = slug?.url
          if (!isCardTrader || !isVerified || !url) continue

          totalVerified++

          // riavvio periodico per contenere RAM
          if (RESTART_BROWSER_EVERY > 0 && totalVisited > 0 && totalVisited % RESTART_BROWSER_EVERY === 0) {
            try { await page.close() } catch {}
            try { await browser.close() } catch {}
            browser = await launchBrowser()
            page = await newLeanPage(browser)
            log('info', `Browser riavviato dopo ${totalVisited} navigazioni`)
          }

          try {
            log('nav', `→ ${url}`)
            await page.goto(url, { waitUntil: 'networkidle2', timeout: Math.max(PRICE_TIMEOUT_MS, 60000) })

            // cookie banner (best effort)
            try {
              const cookieBtn = await page.$('#onetrust-accept-btn-handler, button[aria-label="Accept All Cookies"]')
              if (cookieBtn) { await cookieBtn.click(); await page.waitForTimeout(300) }
            } catch {}

            // il box deve esserci
            await page.waitForSelector(PRICE_SELECTOR, { visible: true, timeout: Math.min(PRICE_TIMEOUT_MS, 15000) })

            // attendi che diventi numerico (non '-' / non 'loading')
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

            const priceText = await page.$eval(PRICE_SELECTOR, el => el.textContent?.trim() || '')
            const price = parsePrice(priceText)
            totalVisited++

            if (price == null) {
              log('warn', `Prezzo non parsabile per "${card.name || card.code || '??'}" in ${fileName}: "${priceText}"`)
            } else {
              // aggiorna JSON in-memory
              card.slugs[si] = { ...slug, current_price: price }
              cards[ci] = { ...card }

              // aggiorna DB
              if (card.id != null) {
                await updateCardPrice(card.id, price)
              } else if (card.card_id != null) {
                await updateCardPrice(card.card_id, price)
              } else {
                log('warn', `Carta senza id/card_id per update DB: "${card.name || card.code || '??'}"`)
              }

              updatedInFile++
              totalUpdated++
              log('ok', `Prezzo aggiornato: ${price} → "${card.name || card.code || '??'}"`)
            }
          } catch (err) {
            log('error', `Errore scraping per "${card.name || card.code || '??'}" (${fileName}): ${err?.message || err}`)
          }

          // delay gentile tra carte
          await sleep(jittered(PER_CARD_BASE_DELAY_MS, PER_CARD_JITTER_MS))
        }
      }

      // persist JSON se cambiato
      if (updatedInFile > 0) {
        const out = isArrayRoot ? cards : { ...json, cards }
        try {
          writeJsonSafe(fullPath, out)
          log('ok', `Scritto ${fileName}: ${updatedInFile} prezzi aggiornati`)
        } catch (err) {
          log('error', `Scrittura ${fileName} fallita: ${err?.message || err}`)
        }
      } else {
        log('info', `${fileName}: nessun prezzo aggiornato`)
      }

      // cooldown tra file
      await sleep(jittered(PER_FILE_COOLDOWN_MS, 4000))
    }

    log('done', `FINITO → files=${files.length}, visitati=${totalVisited}, verified=${totalVerified}, aggiornati=${totalUpdated}`)
  } finally {
    try { await page.close() } catch {}
    try { await browser.close() } catch {}
  }
}

// ---------- RUN ----------
main().catch(err => {
  log('error', `Fatal: ${err?.message || err}`)
  process.exit(1)
})
