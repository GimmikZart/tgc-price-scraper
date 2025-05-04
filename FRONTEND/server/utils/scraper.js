import puppeteer from 'puppeteer'

export async function scrapeProduct({ url, regular_price, original_price, discounted_price, image }) {
    const browser = await puppeteer.launch({ headless: 'new' })
    const page = await browser.newPage()
    
    await page.goto(url, { waitUntil: 'networkidle2' })

    console.log('scraper data', { url, regular_price, original_price, discounted_price, image });
    
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

    return {
        regularPrice: regularPriceResult,
        originalPrice: original_price_result,
        discountedPrice: discounted_price_result,
        image: imageResult,
    }
}
