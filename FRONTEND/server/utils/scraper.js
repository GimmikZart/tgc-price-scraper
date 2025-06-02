import { broadcastEvent } from '../api/scrape-stream'
import puppeteer from 'puppeteer'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function scrapeNewProduct({ url, regular_price, original_price, discounted_price, image, set, store, currency, lang, category, setName, storeName }) {
  broadcastEvent('scraping_started', { url })

  const start = Date.now()
  const ramStart = process.memoryUsage().heapUsed / 1024 / 1024

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-accelerated-2d-canvas', '--disable-gpu']
  })
  const page = await browser.newPage()

  try {
    await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    })

    if (page.isClosed()) {
      throw new Error({message: 'La pagina si è chiusa dopo il goto'})
    }

    const regularPriceResult = await page.$eval(regular_price, el => el.textContent?.trim())

    let original_price_result = null
    if (original_price) {
      const el = await page.$(original_price)
      if (el) original_price_result = await page.evaluate(el => el.textContent?.trim(), el)
    }

    let discounted_price_result = null
    if (discounted_price) {
      const el = await page.$(discounted_price)
      if (el) discounted_price_result = await page.evaluate(el => el.textContent?.trim(), el)
    }

    const imageResult = await page.$eval(image, el => el.getAttribute('src'))

    await browser.close()

    await supabase.from('products').insert({
      store: store,
      set: set,
      lang: lang,
      url:url,
      currency: currency,
      category: category,
      regular_price: parsePrice(regularPriceResult),
      original_price: parsePrice(original_price_result),
      discounted_price: parsePrice(discounted_price_result),
      image_url: imageResult,
      last_update: new Date()
    })
    broadcastEvent('scraping_product_success', { set: setName, store: storeName })

    const end = Date.now()
    const ramEnd = process.memoryUsage().heapUsed / 1024 / 1024

    broadcastEvent('scraping_completed', {
      url,
      duration: Math.round((end - start) / 1000),
      ramUsed: Math.round((ramEnd - ramStart) * 100) / 100
    })
    
  } catch (err) {
    await browser.close()
    broadcastEvent('scraping_product_error', { setName, storeName, error: err.message })
  }
}

export async function scrapeProduct({ id, url, regular_price, original_price, discounted_price, image, set, store }) {
  broadcastEvent('scraping_started', { url })

  const start = Date.now()
  const ramStart = process.memoryUsage().heapUsed / 1024 / 1024

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-accelerated-2d-canvas', '--disable-gpu']
  })
  const page = await browser.newPage()

  try {
    await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    })

    if (page.isClosed()) {
      throw new Error({message: 'La pagina si è chiusa dopo il goto'})
    }


    const regularPriceResult = await page.$eval(regular_price, el => el.textContent?.trim())

    let original_price_result = null
    if (original_price) {
      const el = await page.$(original_price)
      if (el) original_price_result = await page.evaluate(el => el.textContent?.trim(), el)
    }

    let discounted_price_result = null
    if (discounted_price) {
      const el = await page.$(discounted_price)
      if (el) discounted_price_result = await page.evaluate(el => el.textContent?.trim(), el)
    }

    const imageResult = await page.$eval(image, el => el.getAttribute('src'))

    await browser.close()

    // Salva su Supabase
    if (id) {
      await supabase.from('products').update({
        regular_price: parsePrice(regularPriceResult),
        original_price: parsePrice(original_price_result),
        discounted_price: parsePrice(discounted_price_result),
        image_url: imageResult,
        last_update: new Date()
      }).eq('id', id)

      broadcastEvent('scraping_product_success', { set, store })

      const end = Date.now()
      const ramEnd = process.memoryUsage().heapUsed / 1024 / 1024
  
      broadcastEvent('scraping_completed', {
        url,
        duration: Math.round((end - start) / 1000),
        ramUsed: Math.round((ramEnd - ramStart) * 100) / 100
      })
    } else {
        broadcastEvent('scraping_product_error', { set, store, error: err.message })
    }
  } catch (err) {
    await browser.close()
    broadcastEvent('scraping_product_error', { set, store, error: err.message })
  }
}

export async function scrapeProductsBatch({ silent = false } = {}) {
    if (!silent) broadcastEvent('scraping_started', {}) // 🔵 Inizio batch

    const timeStartAll = Date.now()
    const ramStartAll = process.memoryUsage().heapUsed / 1024 / 1024

    // 1️⃣ Recupera i prodotti da Supabase
    const { data: products, error } = await supabase
        .from('products')
        .select(`id, url, set:sets(name), store:stores (name, regular_price_selector, original_price_selector, discounted_price_selector, image_selector)`)

    if (error) {
        console.error('❌ Errore nel recupero prodotti:', error.message)
        return
    }

    const productsArray = products.map(product => ({
        id: product.id,
        url: product.url,
        regular_price: product.store.regular_price_selector,
        original_price: product.store.original_price_selector,
        discounted_price: product.store.discounted_price_selector,
        image: product.store.image_selector,
        set: `${product.set.name}`,
        store: product.store.name
    }))

    const browser = await puppeteer.launch({
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--disable-gpu'
        ]
    })

    for (const product of productsArray) {
      const page = await browser.newPage()
  
      try {
        await page.goto(product.url, {
          waitUntil: 'domcontentloaded',
          timeout: 30000
        })

        if (page.isClosed()) {
          throw new Error({message: 'La pagina si è chiusa dopo il goto'})
        }
    
  
        const regularPriceResult = await page.$eval(product.regular_price, el => el.textContent?.trim())
  
        let original_price_result = null
        if (product.original_price) {
          const el = await page.$(product.original_price)
          if (el) original_price_result = await page.evaluate(el => el.textContent?.trim(), el)
        }
  
        let discounted_price_result = null
        if (product.discounted_price) {
          const el = await page.$(product.discounted_price)
          if (el) discounted_price_result = await page.evaluate(el => el.textContent?.trim(), el)
        }
  
        const imageResult = await page.$eval(product.image, el => el.getAttribute('src'))
  
        await supabase.from('products').update({
          regular_price: parsePrice(regularPriceResult),
          original_price: parsePrice(original_price_result),
          discounted_price: parsePrice(discounted_price_result),
          image_url: imageResult,
          last_update: new Date()
        }).eq('id', product.id)
  
        if (!silent) broadcastEvent('scraping_product_success', {
          set: product.set,
          store: product.store
        })
  
      } catch (err) {
        if (!silent) broadcastEvent('scraping_product_error', {
          set: product.set,
          store: product.store,
          error: err.message
        })
      }
  
      await page.close()
    }
  
    await browser.close()
  
    const timeEndAll = Date.now()
    const ramEndAll = process.memoryUsage().heapUsed / 1024 / 1024
  
    if (!silent) broadcastEvent('scraping_completed', {
      duration: Math.round((timeEndAll - timeStartAll) / 1000),
      ramUsed: Math.round((ramEndAll - ramStartAll) * 100) / 100
    })
}
  

function parsePrice(priceString) {
  if (!priceString) return null;
  let cleaned = priceString.replace(/[^\d,\.]/g, '').trim();
  if (cleaned.includes(',')) {
      if (cleaned.includes('.')) {
          cleaned = cleaned.replace(/\./g, '');
      }
      cleaned = cleaned.replace(',', '.');
  }
  let number = parseFloat(cleaned);
  if (isNaN(number)) return 0.00;
  
  return number.toFixed(2);
}


