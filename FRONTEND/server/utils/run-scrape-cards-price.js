// server/lib/runScrapePrices.js
import path from 'path'
import fs from 'fs'
import puppeteer from 'puppeteer'

/** ====== CONFIG ====== */
const JSON_BASE_DIR = path.resolve(process.cwd(), 'data', 'cards', 'one_piece_tgc')

/** Selettore prezzo su Card Trader */
const PRICE_SELECTOR =
  'body > div.d-flex.flex-column.flex-grow-1.padding-top-for-header > div.bg-white > div > div > div.d-flex.pb-3 > div.w-100.ml-3.mr-0.mr-md-3 > div.blueprint-info-container > div > div:nth-child(1) > div.d-sm-flex.justify-content-between.flex-wrap > div:nth-child(2) > div.price-box__price'

/** Timings “gentili” */
const PER_CARD_BASE_DELAY_MS = 9000
const PER_CARD_JITTER_MS     = 3000
const PER_FILE_COOLDOWN_MS   = 35000

/** ====== HELPERS ====== */
const sleep = (ms) => new Promise(r => setTimeout(r, ms))
const jitteredDelay = (base, jitter) => {
  const delta = Math.floor(Math.random() * (jitter || 0))
  const sign = Math.random() < 0.5 ? -1 : 1
  return Math.max(0, base + sign * delta)
}
function parsePrice(text) {
  if (!text) return null
  let t = String(text).trim().replace(/[^\d,.\-]/g, '')
  if (t.includes(',') && t.includes('.')) t = t.replace(/\./g, '').replace(',', '.')
  else if (t.includes(',')) t = t.replace(',', '.')
  const n = parseFloat(t)
  return Number.isFinite(n) ? n : null
}
const isJsonFile = (f) => f.toLowerCase().endsWith('.json')
function detectCardsRoot(json) {
  if (Array.isArray(json)) return { cards: json, isArrayRoot: true }
  if (json && typeof json === 'object' && Array.isArray(json.cards)) return { cards: json.cards, isArrayRoot: false }
  return { cards: [], isArrayRoot: false }
}
const writeJsonSafe = (p, data) => fs.writeFileSync(p, JSON.stringify(data, null, 2), 'utf-8')

/** Fallback logger a console se non passato */
function createLogger(overrides = {}) {
  const toStr = (x) => (typeof x === 'string' ? x : JSON.stringify(x))
  return {
    info:    (m) => console.log(toStr(m)),
    warning: (m) => console.warn(toStr(m)),
    error:   (m) => console.error(toStr(m)),
    success: (m) => console.log(toStr(m)),
    done:    (m) => console.log(toStr(m)),
    ...overrides
  }
}

/** Avvio browser “leggero” */
async function launchBrowser() {
  return puppeteer.launch({
    headless: true,
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
      // riduce memoria su piattaforme con limiti RAM
      '--single-process',
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

  // Intercetta e blocca risorse pesanti
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

/**
 * Esegue lo scraping prezzi da Card Trader.
 * Opzioni:
 * - baseDir: directory dei json (default JSON_BASE_DIR)
 * - logger: { info, warning, error, success, done } (default console)
 */
export async function run(options = {}) {
  const baseDir = options.baseDir || JSON_BASE_DIR
  const log = createLogger(options.logger)

  log.info(`📂 JSON_BASE_DIR: ${baseDir}`)

  if (!fs.existsSync(baseDir)) {
    throw new Error(`JSON base dir not found: ${baseDir}`)
  }

  const files = fs.readdirSync(baseDir).filter(isJsonFile)
  if (!files.length) {
    log.warning(`Nessun file .json trovato in ${baseDir}`)
    return { files: 0, totalCardsVisited: 0, totalVerifiedFound: 0, totalPricesUpdated: 0 }
  }

  log.info(`🟡 Avvio scraping prezzi Card Trader su ${files.length} file`)

  let browser = await launchBrowser()
  let page = await newLeanPage(browser)

  let totalCardsVisited = 0
  let totalPricesUpdated = 0
  let totalVerifiedFound = 0

  try {
    for (let fi = 0; fi < files.length; fi++) {
      const fileName = files[fi]
      const fullPath = path.join(baseDir, fileName)

      log.info(`📁 File ${fi + 1}/${files.length}: ${fileName}`)
      log.info(`   ↳ ${fullPath}`)

      // leggi/parsa json
      let json
      try {
        const raw = fs.readFileSync(fullPath, 'utf-8')
        json = JSON.parse(raw)
      } catch (err) {
        log.error(`Impossibile leggere/parlare JSON: ${fileName} → ${String(err?.message || err)}`)
        await sleep(jitteredDelay(PER_FILE_COOLDOWN_MS, 2000))
        continue
      }

      const { cards, isArrayRoot } = detectCardsRoot(json)
      if (!Array.isArray(cards) || cards.length === 0) {
        log.warning(`Nessuna carta in ${fileName}`)
        await sleep(jitteredDelay(PER_FILE_COOLDOWN_MS, 2000))
        continue
      }

      let pricesUpdatedInThisFile = 0

      // ciclo carte
      for (let ci = 0; ci < cards.length; ci++) {
        const card = cards[ci]
        if (!Array.isArray(card?.slugs) || card.slugs.length === 0) continue

        // per ogni slug verificato Card Trader
        for (let si = 0; si < card.slugs.length; si++) {
          const slug = card.slugs[si]
          const isCardTrader = String(slug?.service || '') === 'Card Trader'
          const isVerified = !!slug?.verified
          const url = slug?.url

          if (!isCardTrader || !isVerified || !url) continue

          totalVerifiedFound++

          try {
            log.info(`🔎 [${fileName}] Carta ${ci + 1}/${cards.length} → ${url}`)
            await page.goto(url, { waitUntil: 'networkidle2', timeout: 90000 })

            // best-effort: cookie banner
            try {
              const cookieBtn = await page.$('#onetrust-accept-btn-handler, button[aria-label="Accept All Cookies"]')
              if (cookieBtn) {
                await cookieBtn.click()
                await page.waitForTimeout(400)
                log.info('✅ Cookie banner chiuso')
              }
            } catch {}

            // attendo il prezzo “reale”
            await page.waitForSelector(PRICE_SELECTOR, { visible: true, timeout: 20000 })
            let priceText = ''
            const start = Date.now()
            while (Date.now() - start < 20000) {
              priceText = await page.$eval(PRICE_SELECTOR, el => el.textContent?.trim() || '')
              if (priceText && priceText !== '-' && !priceText.toLowerCase().includes('loading')) break
              log.info('⏳ Prezzo non ancora pronto, ritento...')
              await page.waitForTimeout(800)
            }
            log.info(`💰 Price text: "${priceText}"`)
            const price = parsePrice(priceText)
            totalCardsVisited++

            if (price == null) {
              log.warning(`⚠️ Prezzo non parsabile per "${card.name || card.code || 'unknown'}" in ${fileName}: "${priceText}"`)
            } else {
              card.slugs[si] = { ...slug, current_price: price }
              cards[ci] = { ...card }
              pricesUpdatedInThisFile++
              totalPricesUpdated++
              log.success(`💰 Aggiornato ${price} → "${card.name || card.code || 'unknown'}"`)
            }
          } catch (err) {
            log.error(`Errore durante scraping per "${card.name || card.code || 'unknown'}" in ${fileName}: ${String(err?.message || err)}`)
          }

          // delay gentile tra richieste reali
          await sleep(jitteredDelay(PER_CARD_BASE_DELAY_MS, PER_CARD_JITTER_MS))
        }
      }

      // scrivi solo se ci sono aggiornamenti
      if (pricesUpdatedInThisFile > 0) {
        const toWrite = isArrayRoot ? cards : { ...json, cards }
        try {
          writeJsonSafe(fullPath, toWrite)
          log.success(`✅ ${fileName}: aggiornati ${pricesUpdatedInThisFile} slug verificati`)
        } catch (err) {
          log.error(`Errore in scrittura ${fileName}: ${String(err?.message || err)}`)
        }
      } else {
        log.info(`ℹ️ ${fileName}: nessun prezzo aggiornato`)
      }

      // cooldown tra file
      await sleep(jitteredDelay(PER_FILE_COOLDOWN_MS, 5000))
    }

    const summary = {
      files: files.length,
      totalCardsVisited,
      totalVerifiedFound,
      totalPricesUpdated,
      baseDir
    }
    log.done({ type: 'scrape:done', ...summary })
    log.success(`🏁 Completato: files=${files.length}, visitati=${totalCardsVisited}, verified=${totalVerifiedFound}, aggiornati=${totalPricesUpdated}`)
    return summary

  } finally {
    try { await page.close() } catch {}
    try { await browser.close() } catch {}
  }
}
