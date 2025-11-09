// scripts/run-scrape-cards-price.js
import fs from 'fs'
import path from 'path'
import puppeteer from 'puppeteer'
import { createClient } from '@supabase/supabase-js'
import { fileURLToPath } from 'url'

// === path helper per ESM ===
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// === CONFIG ===
const JSON_BASE_DIR = path.resolve(process.cwd(), 'data', 'cards', 'one_piece_tgc')
const PRICE_SELECTOR = 'body > div.d-flex.flex-column.flex-grow-1.padding-top-for-header > div.bg-white > div > div > div.d-flex.pb-3 > div.w-100.ml-3.mr-0.mr-md-3 > div.blueprint-info-container > div > div:nth-child(1) > div.d-sm-flex.justify-content-between.flex-wrap > div:nth-child(2) > div.price-box__price'
const PER_CARD_BASE_DELAY_MS = 9000
const PER_CARD_JITTER_MS = 3000
const PER_FILE_COOLDOWN_MS = 35000

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
  const msg = typeof payload === 'string' ? payload : (() => { try { return JSON.stringify(payload) } catch { return String(payload) } })()
  console.log(`[${new Date().toISOString()}] [${type}] ${msg}`)
}

// === DB ===
function getSb() {
  console.log('SUPABASE_URL', process.env.SUPABASE_URL);
  console.log('SUPABASE_SERVICE_ROLE_KEY', process.env.SUPABASE_SERVICE_ROLE_KEY);
  
  
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

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage']
  })
  const page = await browser.newPage()
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36')
  await page.setViewport({ width: 1366, height: 900 })

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
            await page.goto(url, { waitUntil: 'networkidle2', timeout: 90000 })

            // cookie (best effort)
            try {
              const b = await page.$('#onetrust-accept-btn-handler, button[aria-label="Accept All Cookies"]')
              if (b) { await b.click(); await page.waitForTimeout(400); log('info','Cookie OK') }
            } catch {}

            await page.waitForSelector(PRICE_SELECTOR, { visible: true, timeout: 20000 })
            let priceText = ''
            const t0 = Date.now()
            while (Date.now() - t0 < 20000) {
              priceText = await page.$eval(PRICE_SELECTOR, el => el.textContent?.trim() || '')
              if (priceText && priceText !== '-' && !priceText.toLowerCase().includes('loading')) break
              await page.waitForTimeout(800)
            }
            const price = parsePrice(priceText)
            totalCardsVisited++

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
            log('error', `Scrape "${card.name || card.code}": ${e.message}`)
          }

          await sleep(jittered(PER_CARD_BASE_DELAY_MS, PER_CARD_JITTER_MS))
        }
      }

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

      await sleep(jittered(PER_FILE_COOLDOWN_MS, 5000))
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
