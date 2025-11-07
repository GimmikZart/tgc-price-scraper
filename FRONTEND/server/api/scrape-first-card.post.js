// /server/api/scrape-first-card.post.js
import { defineEventHandler, readBody, createError, setResponseStatus } from 'h3'
import puppeteer from 'puppeteer'
import path from 'path'
import fs from 'fs'
import { broadcastEvent } from './scrape-stream' // adegua il path se diverso

// 🔧 Cambia questa base se salvi i json altrove
const JSON_BASE_DIR = path.resolve(process.cwd(), 'data', 'cards', 'one_piece_tgc')

// evita path traversal
function sanitizeFileName(name) {
  return String(name).replace(/(\.\.)|[\\/]/g, '').trim()
}
function resolveJsonPath(name) {
  const safe = sanitizeFileName(name)
  return path.join(JSON_BASE_DIR, safe)
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

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const name = body?.name ? sanitizeFileName(body.name) : null
  const data = body?.data

  if (!name) {
    throw createError({ statusCode: 400, statusMessage: 'Missing "name"' })
  }
  if (!data || (typeof data !== 'object' && !Array.isArray(data))) {
    throw createError({ statusCode: 400, statusMessage: 'Missing or invalid "data" (send the full file)' })
  }

  // individua l’array carte preservando la struttura root
  let cards = []
  let isArrayRoot = false
  if (Array.isArray(data)) {
    isArrayRoot = true
    cards = data
  } else if (Array.isArray(data.cards)) {
    cards = data.cards
  } else {
    throw createError({ statusCode: 400, statusMessage: 'Provided data has no cards array' })
  }

  if (!cards.length) {
    await broadcastEvent('generic_error', 'Il file ricevuto non contiene carte')
    setResponseStatus(event, 204)
    return null
  }

  // seleziona la prima carta con uno slug valido
  const idx = cards.findIndex(c => Array.isArray(c?.slugs) && c.slugs[0]?.url)
  if (idx === -1) {
    await broadcastEvent('generic_error', 'Nessuna carta con slugs[0].url valida nel file')
    setResponseStatus(event, 204)
    return null
  }

  const first = cards[idx]
  const url = first.slugs[0].url
  const cardName = String(first.name || 'unknown')
  const setName = String(first.setName || 'set')

  await broadcastEvent('generic_info', `🔎 Test prezzo per: ${cardName} (${setName})`)
  await broadcastEvent('generic_info', { url })

  // cartella snapshot
  const saveBaseDir = path.resolve(process.cwd(), 'debug-scrape', 'cardtrader')
  if (!fs.existsSync(saveBaseDir)) fs.mkdirSync(saveBaseDir, { recursive: true })

  const ts = new Date()
  const stamp = ts.toISOString().replace(/[:.]/g, '-')
  const safe = (s) => String(s).toLowerCase().replace(/[^a-z0-9\-_.]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
  const baseName = `${stamp}__${safe(cardName)}__${safe(setName)}`
  const pngPath = path.join(saveBaseDir, `${baseName}.png`)
  const htmlPath = path.join(saveBaseDir, `${baseName}.html`)

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

  const PRICE_SELECTOR = 'body > div.d-flex.flex-column.flex-grow-1.padding-top-for-header > div.bg-white > div > div > div.d-flex.pb-3 > div.w-100.ml-3.mr-0.mr-md-3 > div.blueprint-info-container > div > div:nth-child(1) > div.d-sm-flex.justify-content-between.flex-wrap > div:nth-child(2) > div.price-box__price'

  try {
    await broadcastEvent('generic_info', `➡️ Navigo verso ${url}`)
    await page.goto(url, { waitUntil: 'load', timeout: 30000 })

    // cookie banner (best effort)
    try {
      const cookieBtn = await page.$('#onetrust-accept-btn-handler, button[aria-label="Accept All Cookies"]')
      if (cookieBtn) {
        await cookieBtn.click()
        await page.waitForTimeout(500)
        await broadcastEvent('generic_info', '✅ Cookie banner chiuso')
      }
    } catch {}

    // leggi prezzo
    await page.waitForSelector(PRICE_SELECTOR, { visible: true, timeout: 15000 })
    const priceText = await page.$eval(PRICE_SELECTOR, el => el.textContent?.trim() || '')
    const price = parsePrice(priceText)

    if (price == null) {
      await broadcastEvent('generic_error', `⚠️ Prezzo non parsabile: "${priceText}"`)
    } else {
      await broadcastEvent('generic_success', `💰 Prezzo rilevato: ${price} (da "${priceText}")`)
      first.price = price
      cards[idx] = first
    }

    // snapshot per debug
    const html = await page.content()
    fs.writeFileSync(htmlPath, html, 'utf-8')
    await page.screenshot({ fullPage: true, type: 'png', path: pngPath })
    await broadcastEvent('generic_success', `💾 Salvati snapshot e HTML:\n- PNG: ${pngPath}\n- HTML: ${htmlPath}`)

    // scrivi il file completo aggiornato
    const jsonPath = resolveJsonPath(name)
    let toWrite
    if (isArrayRoot) {
      toWrite = cards
    } else {
      // preserva altri campi root
      toWrite = { ...data, cards }
    }

    fs.writeFileSync(jsonPath, JSON.stringify(toWrite, null, 2), 'utf-8')
    await broadcastEvent('generic_success', `✅ JSON sovrascritto: ${jsonPath}`)

    await broadcastEvent('scrape:done', {
      url,
      pngPath,
      htmlPath,
      jsonPath,
      updatedIndex: idx,
      price,
    })
  } catch (err) {
    await broadcastEvent('scrape:error', { message: String(err?.message || err) })
  } finally {
    try { await browser.close() } catch {}
  }

  // nessun payload verso il client
  setResponseStatus(event, 204)
  return null
})
