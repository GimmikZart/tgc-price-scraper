// server/api/scrape-cards-price.post.js
import { defineEventHandler, setResponseStatus } from 'h3'
import { run } from '../utils/run-scrape-cards-price.js'
import { broadcastEvent } from './scrape-stream' 

export default defineEventHandler(async (event) => {
  // Logger “duale”: console + SSE verso il frontend
  const dualLogger = {
    info:    (m) => { console.log(m); return broadcastEvent('generic_info', m) },
    warning: (m) => { console.warn(m); return broadcastEvent('generic_warning', m) },
    error:   (m) => { console.error(m); return broadcastEvent('generic_error', m) },
    success: (m) => { console.log(m); return broadcastEvent('generic_success', m) },
    done:    (m) => { console.log(m); return broadcastEvent('scrape:done', m) },
  }

  try {
    await run({ logger: dualLogger })
  } catch (err) {
    console.error(err)
    await broadcastEvent('scrape:error', { message: String(err?.message || err) })
  }

  setResponseStatus(event, 204)
  return null
})
