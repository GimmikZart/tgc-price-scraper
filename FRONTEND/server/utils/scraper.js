import puppeteer from 'puppeteer'

export async function scrapeProduct({ url, price, discount, image }) {
    const browser = await puppeteer.launch({ headless: 'new' })
    const page = await browser.newPage()
    await page.goto(url, { waitUntil: 'networkidle2' })

    console.log('scraper data', { url, price, discount, image });
    
    const priceResult = await page.$eval(price, el => el.textContent?.trim())
    
    let discountResult = null
    if(discount) {
        const discountEl = await page.$(discount)
        if (discountEl) {
            discountResult = await page.evaluate(el => el.textContent?.trim(), discountEl)
        }
    }

    const imageResult = await page.$eval(image, el => el.getAttribute('src'))

    await browser.close()

    return {
        price: priceResult,
        discount_price: discountResult,
        image: imageResult,
    }
}
