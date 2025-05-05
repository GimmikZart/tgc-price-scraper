import { scrapeProduct, scrapeProductsBatch } from '~/server/utils/scraper'

export default defineEventHandler(async (event) => {
    const body = await readBody(event)

    if (Array.isArray(body)) {
        // Se arriva una lista → usa il batch
        try {
            const data = await scrapeProductsBatch(body)
            return { data, error: null }
        } catch (err) {
            return { data: null, error: err.message }
        }
    } else if (body.url) {
        // Compatibilità con scraping singolo
        try {
            const data = await scrapeProduct(body)
            return { data, error: null }
        } catch (err) {
            return { data: null, error: err.message }
        }
    } else {
        return { error: 'Missing URL or product array' }
    }
})
