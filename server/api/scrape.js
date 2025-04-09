import puppeteer from 'puppeteer'

export default defineEventHandler(async (event) => {
  //console.log('PUPPYYYY');
  //console.log({event});
  const body = await readBody(event)
  //console.log({body});
  const url = body.url
  const priceSelector = body.price
  const imageSelector = body.image

  //console.log({url}, {priceSelector}, {imageSelector});

  if (!url) {
    return { error: 'Missing URL' }
  }
  try {
    const browser = await puppeteer.launch({ headless: 'new' })
    //console.log({browser});
    const page = await browser.newPage()
    //console.log({page});
    await page.goto(url, { waitUntil: 'networkidle2' })

    const priceResult = await page.$eval(priceSelector, el => el.textContent) //const price = await page.$eval('.price', el => el.textContent)
    //console.log({priceResult});
    const imageResult = await page.$eval(imageSelector, el => el.getAttribute('src'))
    //console.log({imageResult});
    //console.log('PRICE RESUUUUULT', priceResult);
    //console.log('IMAGE RESUUUUULT', imageResult);
    await browser.close()
    console.log({ data: {price: priceResult, image:imageResult }, error: null });
    return { data: {price: priceResult, image:imageResult }, error: null }
  } catch (err) {
    return { data: null, error: err }
  }
})
