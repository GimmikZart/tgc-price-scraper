// server/api/scrape-batch.js
import { scrapeProductsBatch } from '~/server/utils/scraper'

export default defineEventHandler(async () => {
  try {
    await scrapeProductsBatch() // con SSE attivo
  } catch (err) {
    throw new Error(err)
  }
})
