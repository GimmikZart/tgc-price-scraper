import puppeteer from 'puppeteer'

export default defineEventHandler(async (event) => {

  const body = await readBody(event)

  const url = body.url
  const priceSelector = body.price
  const imageSelector = body.image



  if (!url) {
    return { error: 'Missing URL' }
  }
  try {
    const browser = await puppeteer.launch({ headless: 'new' })
    const page = await browser.newPage()
    await page.goto(url, { waitUntil: 'networkidle2' })

    const priceResult = await page.$eval(priceSelector, el => el.textContent) 
    const imageResult = await page.$eval(imageSelector, el => el.getAttribute('src'))
    
    await browser.close()
    
    return { data: {price: priceResult, image:imageResult }, error: null }
  } catch (err) {
    return { data: null, error: err }
  }
})
