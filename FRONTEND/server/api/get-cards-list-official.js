import scrapeCardsOfficial from '~/server/utils/fetch-cards-official'

export default defineEventHandler(async (event) => {
  try {
    const params = await readBody(event)
    
    console.log("bodyyyyyyyyyyyyyyy", params);
    const result = await scrapeCardsOfficial(params)
    return result
  } catch (err) {
    throw createError({
      statusCode: 500,
      statusMessage: err.message || 'Errore interno durante lo scrape'
    })
  }
})
