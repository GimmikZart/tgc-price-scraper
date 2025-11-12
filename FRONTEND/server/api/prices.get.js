// server/api/prices.get.js
import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  const {
    supabaseUrl,
    supabaseServiceRoleKey,
    pricesBucket,
    pricesObject,
  } = useRuntimeConfig()

  const sb = createClient(supabaseUrl, supabaseServiceRoleKey)

  const { data, error } = await sb
    .storage
    .from(pricesBucket)
    .download(pricesObject)

  if (error) {
    throw createError({ statusCode: 500, statusMessage: `Storage error: ${error.message}` })
  }

  const text = await data.text()
  try {
    const arr = JSON.parse(text)
    // caching lato CDN/server (se usi rendering SSR su hosting tipo Vercel/Render)
    setHeader(event, 'Cache-Control', 's-maxage=60, stale-while-revalidate=30')
    return Array.isArray(arr) ? arr : []
  } catch {
    throw createError({ statusCode: 500, statusMessage: 'Invalid price JSON' })
  }
})
