// server/api/scrape-auto.js
import { scrapeProductsBatch } from '~/server/utils/scraper'

export default defineEventHandler(() => {
  try {
    scrapeProductsBatch({ silent: false }) // Silent silenzia le notifiche a frontend
  } catch (err) {
    throw new Error(err)
  }
})
