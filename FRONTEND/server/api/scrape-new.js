// server/api/scrape.js
import { scrapeNewProduct } from '~/server/utils/scraper'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  if (!body?.url) {
    throw new Error('Missing URL or invalid body')
  }

  try {
    const productBody = {
      url: body.url , 
      regular_price: body.store.regular_price_selector, 
      original_price: body.store.original_price_selector, 
      discounted_price:body.store.discounted_price_selector, 
      image: body.store.image_selector,
      set: body.set,
      store: body.store.id,
      storeName: body.store.name,
      setName: body.setName,
      currency: body.currency,
      lang: body.lang
    }
    await scrapeNewProduct(productBody)
  } catch (err) {
    throw new Error(err)
  }
})
