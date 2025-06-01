import fetchCardsList from '~/server/utils/fetch-cards'

export default defineEventHandler(async (event) => {
  try {
    const result = await fetchCardsList()
    return result
  } catch (err) {
    throw createError({
      statusCode: 500,
      statusMessage: err.message || 'Errore interno durante lo scrape'
    })
  }
})
