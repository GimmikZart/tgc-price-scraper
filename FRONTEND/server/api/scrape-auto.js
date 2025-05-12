// server/api/scrape-auto.js
import { scrapeProductsBatch } from '~/server/utils/scraper'

export default defineEventHandler(async () => {
  try {
    await scrapeProductsBatch({ silent: true }) // SENZA SSE
  } catch (err) {
    throw new Error(err)
  }
})
