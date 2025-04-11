import { scrapeProduct } from '~/server/utils/scraper'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  if (!body.url) return { error: 'Missing URL' }

  try {
    const data = await scrapeProduct(body)
    return { data, error: null }
  } catch (err) {
    return { data: null, error: err.message }
  }
})
