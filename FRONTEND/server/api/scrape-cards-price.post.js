// /server/api/scrape-first-card.post.js
import { defineEventHandler, createError, setResponseStatus } from 'h3'
import puppeteer from 'puppeteer'
import path from 'path'
import fs from 'fs'
import { broadcastEvent } from './scrape-stream' // adegua il path se diverso

// === CONFIG ===
const JSON_BASE_DIR = path.resolve(process.cwd(), 'data', 'cards', 'one_piece_tgc')

// Selettore prezzo su Card Trader (come da tua indicazione)
const PRICE_SELECTOR = 'body > div.d-flex.flex-column.flex-grow-1.padding-top-for-header > div.bg-white > div > div > div.d-flex.pb-3 > div.w-100.ml-3.mr-0.mr-md-3 > div.blueprint-info-container > div > div:nth-child(1) > div.d-sm-flex.justify-content-between.flex-wrap > div:nth-child(2) > div.price-box__price'

// Timings "gentili"
const PER_CARD_BASE_DELAY_MS = 9000   // ~9s tra card
const PER_CARD_JITTER_MS     = 3000   // ± up to 3s
const PER_FILE_COOLDOWN_MS   = 35000  // 35s tra file

// === HELPERS ===
function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}
function jitteredDelay(base, jitter) {
  const delta = Math.floor(Math.random() * jitter)
  const sign = Math.random() < 0.5 ? -1 : 1
  return Math.max(0, base + sign * delta)
}
function parsePrice(text) {
  if (!text) return null
  let t = String(text).trim()
  // rimuovi simboli valuta e altro
  t = t.replace(/[^\d,.\-]/g, '')
  // gestisci formati EU tipo 1.234,56
  if (t.includes(',') && t.includes('.')) {
    t = t.replace(/\./g, '').replace(',', '.')
  } else if (t.includes(',')) {
    t = t.replace(',', '.')
  }
  const n = parseFloat(t)
  return Number.isFinite(n) ? n : null
}
function isJsonFile(f) {
  return f.toLowerCase().endsWith('.json')
}
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

export default defineEventHandler(async (event) => {
  // Non leggiamo più data/name dal client: si processa l'intera cartella
  // (se vuoi passare opzioni in futuro, puoi leggere il body qui)

  // Pre-scan directory
  if (!fs.existsSync(JSON_BASE_DIR)) {
    throw createError({ statusCode: 500, statusMessage: `JSON base dir not found: ${JSON_BASE_DIR}` })
  }

  const files = fs.readdirSync(JSON_BASE_DIR).filter(isJsonFile)
  if (!files.length) {
    await broadcastEvent('generic_warning', `Nessun file .json trovato in ${JSON_BASE_DIR}`)
    setResponseStatus(event, 204)
    return null
  }

  await broadcastEvent('generic_info', `🟡 Avvio scraping prezzi Card Trader su ${files.length} file`)

  // Browser unico riusato
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
    ],
  })
  const page = await browser.newPage()
  const desktopUA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36'
  await page.setUserAgent(desktopUA)
  await page.setViewport({ width: 1366, height: 900 })

  let totalCardsVisited = 0
  let totalPricesUpdated = 0
  let totalVerifiedFound = 0

  try {
    for (let fi = 0; fi < files.length; fi++) {
      const fileName = files[fi]
      const fullPath = path.join(JSON_BASE_DIR, fileName)

      await broadcastEvent('generic_info', `📁 File ${fi + 1}/${files.length}: ${fileName}`)

      // Leggi e parse file
      let json
      try {
        const raw = fs.readFileSync(fullPath, 'utf-8')
        json = JSON.parse(raw)
      } catch (err) {
        await broadcastEvent('generic_error', `Impossibile leggere/parlare JSON: ${fileName} → ${String(err?.message || err)}`)
        // passa al prossimo file
        await sleep(jitteredDelay(PER_FILE_COOLDOWN_MS, 2000))
        continue
      }

      const { cards, isArrayRoot } = detectCardsRoot(json)
      if (!Array.isArray(cards) || cards.length === 0) {
        await broadcastEvent('generic_warning', `Nessuna carta in ${fileName}`)
        await sleep(jitteredDelay(PER_FILE_COOLDOWN_MS, 2000))
        continue
      }

      let pricesUpdatedInThisFile = 0
      let verifiedInThisFile = 0

      // Loop carte
      for (let ci = 0; ci < cards.length; ci++) {
        const card = cards[ci]
        if (!Array.isArray(card?.slugs) || card.slugs.length === 0) continue

        // Trova slug verificati Card Trader
        for (let si = 0; si < card.slugs.length; si++) {
          const slug = card.slugs[si]
          const isCardTrader = String(slug?.service || '') === 'Card Trader'
          const isVerified = !!slug?.verified
          const url = slug?.url

          if (!isCardTrader || !isVerified || !url) continue

          verifiedInThisFile++
          totalVerifiedFound++

          // Vai alla pagina e leggi prezzo
          try {
            await broadcastEvent('generic_info', `🔎 [${fileName}] Carta ${ci + 1}/${cards.length} — Card Trader verified → navigo: ${url}`)
            await page.goto(url, { waitUntil: 'networkidle2', timeout: 90000 })

            // Cookie banner (best effort)
            try {
              const cookieBtn = await page.$('#onetrust-accept-btn-handler, button[aria-label="Accept All Cookies"]')
              if (cookieBtn) {
                await cookieBtn.click()
                await page.waitForTimeout(500)
                await broadcastEvent('generic_info', '✅ Cookie banner chiuso')
              }
            } catch {}

            /**
             * Attende che l’elemento prezzo sia presente e non sia "-" o vuoto.
             */
            await page.waitForSelector(PRICE_SELECTOR, { visible: true, timeout: 20000 })

            let priceText = ''
            const startTime = Date.now()
            while (Date.now() - startTime < 20000) { // max 20 secondi di polling
              priceText = await page.$eval(PRICE_SELECTOR, el => el.textContent?.trim() || '')
              if (priceText && priceText !== '-' && !priceText.toLowerCase().includes('loading')) break
              await broadcastEvent('generic_info', '⏳ Prezzo non ancora pronto, ritento...')
              await page.waitForTimeout(1000)
            }
            await broadcastEvent('generic_info', `💰 Price text found: "${priceText}"`)
            const price = parsePrice(priceText)

            totalCardsVisited++

            if (price == null) {
              await broadcastEvent('generic_warning', `⚠️ Prezzo non parsabile per "${card.name || card.code || 'unknown'}" in ${fileName}: "${priceText}"`)
            } else {
              // Salva nel campo dello slug corrente
              card.slugs[si] = { ...slug, current_price: price }
              cards[ci] = { ...card }

              pricesUpdatedInThisFile++
              totalPricesUpdated++

              await broadcastEvent('generic_success', `💰 Aggiornato prezzo (${price}) per "${card.name || card.code || 'unknown'}" in ${fileName}`)
            }

          } catch (err) {
            await broadcastEvent('generic_error', `Errore durante scraping prezzo per "${card.name || card.code || 'unknown'}" in ${fileName}: ${String(err?.message || err)}`)
          }

          await broadcastEvent('generic_info', `Delay di ${jitteredDelay(PER_CARD_BASE_DELAY_MS, PER_CARD_JITTER_MS)} milli-secondi`)
          // Delay "gentile" tra richieste
          await sleep(jitteredDelay(PER_CARD_BASE_DELAY_MS, PER_CARD_JITTER_MS))
          await broadcastEvent('generic_info', `Delay concluso`)
        }
      }

      // Scrivi il file solo se qualcosa è cambiato
      if (pricesUpdatedInThisFile > 0) {
        const toWrite = isArrayRoot ? cards : { ...json, cards }
        try {
          writeJsonSafe(fullPath, toWrite)
          await broadcastEvent('generic_success', `✅ ${fileName}: prezzi aggiornati per ${pricesUpdatedInThisFile} slug verificati`)
        } catch (err) {
          await broadcastEvent('generic_error', `Errore in scrittura ${fileName}: ${String(err?.message || err)}`)
        }
      } else {
        await broadcastEvent('generic_info', `ℹ️ ${fileName}: nessun prezzo aggiornato (nessuno slug Card Trader verificato trovato o prezzo non parsabile)`)
      }

      // Cooldown tra file
      await sleep(jitteredDelay(PER_FILE_COOLDOWN_MS, 5000))
    }

    await broadcastEvent('scrape:done', {
      files: files.length,
      totalCardsVisited,
      totalVerifiedFound,
      totalPricesUpdated,
    })
    await broadcastEvent('generic_success', `🏁 Completato: files=${files.length}, visitati=${totalCardsVisited}, verified=${totalVerifiedFound}, aggiornati=${totalPricesUpdated}`)

  } catch (err) {
    await broadcastEvent('scrape:error', { message: String(err?.message || err) })
  } finally {
    try { await browser.close() } catch {}
  }

  // Nessun payload al client
  setResponseStatus(event, 204)
  return null
})
