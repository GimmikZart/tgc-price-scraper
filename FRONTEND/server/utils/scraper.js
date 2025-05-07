// scraper.js
import { broadcastEvent } from '../api/scrape-stream'
import puppeteer from 'puppeteer'

export async function scrapeProduct({ url, regular_price, original_price, discounted_price, image, set, store }) {
    broadcastEvent('scraping_started', { url }) // 🔵 Inizio scraping singolo

    const start = Date.now()
    const ramStart = process.memoryUsage().heapUsed / 1024 / 1024
    console.log(`🕒 Inizio scraping per ${set} di ${store}`)

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
    const page = await browser.newPage()

    try {
        await page.goto(url, { 
            waitUntil: 'networkidle2',
            timeout: 0 
        })

        let regularPriceResult = await page.$eval(regular_price, el => el.textContent?.trim())
        let original_price_result = null
        if(original_price) {
            const el = await page.$(original_price)
            if (el) {
                original_price_result = await page.evaluate(el => el.textContent?.trim(), el)
            }
        }
        let discounted_price_result = null
        if(discounted_price) {
            const el = await page.$(discounted_price)
            if (el) {
                discounted_price_result = await page.evaluate(el => el.textContent?.trim(), el)
            }
        }
        let imageResult = await page.$eval(image, el => el.getAttribute('src'))

        await browser.close()

        broadcastEvent('scraping_product_success', { set, store }) // 🟢 Prodotto trovato

        const end = Date.now()
        const ramEnd = process.memoryUsage().heapUsed / 1024 / 1024

        broadcastEvent('scraping_completed', { 
            url, 
            duration: Math.round((end - start) / 1000), 
            ramUsed: Math.round((ramEnd - ramStart) * 100) / 100 
        })

        return {
            regularPrice: regularPriceResult,
            originalPrice: original_price_result,
            discountedPrice: discounted_price_result,
            image: imageResult,
        }
    } catch (err) {
        broadcastEvent('scraping_product_error', { set, store, error: err.message })
        await browser.close()
        throw err // rilancia l'errore per farlo gestire a chi chiama
    }
}

export async function scrapeProductsBatch(productsArray) {
    broadcastEvent('scraping_started', {}) // 🔵 Inizio batch

    const timeStartAll = Date.now()
    const ramStartAll = process.memoryUsage().heapUsed / 1024 / 1024

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

    const results = []

    for (const product of productsArray) {
        const page = await browser.newPage()

        try {
            await page.goto(product.url, { 
                waitUntil: 'networkidle2',
                timeout: 0 
            })

            let regularPriceResult = await page.$eval(product.regular_price, el => el.textContent?.trim())

            let original_price_result = null
            if (product.original_price) {
                const el = await page.$(product.original_price)
                if (el) {
                    original_price_result = await page.evaluate(el => el.textContent?.trim(), el)
                }
            }

            let discounted_price_result = null
            if (product.discounted_price) {
                const el = await page.$(product.discounted_price)
                if (el) {
                    discounted_price_result = await page.evaluate(el => el.textContent?.trim(), el)
                }
            }

            let imageResult = await page.$eval(product.image, el => el.getAttribute('src'))

            broadcastEvent('scraping_product_success', { set: product.set, store: product.store }) // 🟢 Successo singolo prodotto

            results.push({
                id: product.id,
                regularPrice: regularPriceResult,
                originalPrice: original_price_result,
                discountedPrice: discounted_price_result,
                image: imageResult
            })
        } catch (err) {
            broadcastEvent('scraping_product_error', { set: product.set, store: product.store, error: err.message }) // 🔴 Errore singolo
            results.push({
                id: product.id || null,
                error: err.message
            })
        }

        await page.close()
    }

    await browser.close()

    const timeEndAll = Date.now()
    const ramEndAll = process.memoryUsage().heapUsed / 1024 / 1024

    broadcastEvent('scraping_completed', { 
        duration: Math.round((timeEndAll - timeStartAll) / 1000), 
        ramUsed: Math.round((ramEndAll - ramStartAll) * 100) / 100 
    })

    return results
}

