// scripts/run-scrape-prices.mjs
import { run } from '../server/utils/run-scrape-cards-price.js'

const consoleLogger = {
  info:    (m) => console.log(m),
  warning: (m) => console.warn(m),
  error:   (m) => console.error(m),
  success: (m) => console.log(m),
  done:    (m) => console.log(m),
}

try {
  const res = await run({ logger: consoleLogger })
  // opzionale: exit code “non zero” se niente aggiornato
  process.exit(0)
} catch (err) {
  console.error('Scrape failed:', err)
  process.exit(1)
}
