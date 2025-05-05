// scraper.js

import puppeteer from 'puppeteer'

export async function scrapeProduct({ url, regular_price, original_price, discounted_price, image }) {
    const start = Date.now()   // ⏱ Inizio tempo
    const ramStart = process.memoryUsage().heapUsed / 1024 / 1024

    const browser = await puppeteer.launch({ headless: 'new' })
    const page = await browser.newPage()

    await page.goto(url, { waitUntil: 'networkidle2' })

    let regularPriceResult = await page.$eval(regular_price, el => el.textContent?.trim())

    let original_price_result = null
    if(original_price) {
        const originalPriceEl = await page.$(original_price)
        if (originalPriceEl) {
            original_price_result = await page.evaluate(el => el.textContent?.trim(), originalPriceEl)
        }
    }
    let discounted_price_result = null
    if(discounted_price) {
        const discountedPriceEl = await page.$(discounted_price)
        if (discountedPriceEl) {
            discounted_price_result = await page.evaluate(el => el.textContent?.trim(), discountedPriceEl)
        }
    }

    let imageResult = await page.$eval(image, el => el.getAttribute('src'))

    await browser.close()

    const end = Date.now()   // ⏱ Fine tempo
    const ramEnd = process.memoryUsage().heapUsed / 1024 / 1024

    console.log(`🕒 Tempo scraping: ${(end - start) / 1000} secondi`)
    console.log(`💾 RAM usata: ${Math.round((ramEnd - ramStart) * 100) / 100} MB`)

    return {
        regularPrice: regularPriceResult,
        originalPrice: original_price_result,
        discountedPrice: discounted_price_result,
        image: imageResult,
    }
}

export async function scrapeProductsBatch(productsArray) {
    const startAll = Date.now()
    const ramStart = process.memoryUsage().heapUsed / 1024 / 1024

    const browser = await puppeteer.launch({ headless: 'new' })
    const results = []

    for (const product of productsArray) {
        const start = Date.now()
        const page = await browser.newPage()

        try {
            await page.goto(product.url, { waitUntil: 'networkidle2' })

            let regularPriceResult = await page.$eval(product.regular_price, el => el.textContent?.trim())

            let original_price_result = null
            if (product.original_price) {
                const originalPriceEl = await page.$(product.original_price)
                if (originalPriceEl) {
                    original_price_result = await page.evaluate(el => el.textContent?.trim(), originalPriceEl)
                }
            }

            let discounted_price_result = null
            if (product.discounted_price) {
                const discountedPriceEl = await page.$(product.discounted_price)
                if (discountedPriceEl) {
                    discounted_price_result = await page.evaluate(el => el.textContent?.trim(), discountedPriceEl)
                }
            }

            let imageResult = await page.$eval(product.image, el => el.getAttribute('src'))

            const end = Date.now()
            console.log(`✅ Scraping completato per ${product.url} in ${(end - start) / 1000} secondi`)

            results.push({
                id: product.id, // se c'è, utile per salvare nel DB dopo
                regularPrice: regularPriceResult,
                originalPrice: original_price_result,
                discountedPrice: discounted_price_result,
                image: imageResult
            })
        } catch (err) {
            console.log(`❌ Errore scraping ${product.url}:`, err.message)
            results.push({
                id: product.id || null,
                error: err.message
            })
        }

        await page.close()
    }

    await browser.close()

    const endAll = Date.now()
    const ramEnd = process.memoryUsage().heapUsed / 1024 / 1024

    console.log(`🕒 Tempo totale batch: ${(endAll - startAll) / 1000} secondi`)
    console.log(`💾 RAM totale consumata: ${Math.round((ramEnd - ramStart) * 100) / 100} MB`)

    return results
}
