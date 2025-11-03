import { promises as fs } from 'node:fs'
import path from 'node:path'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const name = body && body.name ? String(body.name) : ''
  if (!name || name.includes('..') || !name.endsWith('.json')) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid file name' })
  }
  const filePath = path.resolve(process.cwd(), 'data/cards/one_piece_tgc', name)
  const payload = JSON.stringify(body.data, null, 2) + '\n'
  await fs.writeFile(filePath, payload, 'utf-8')
  return { ok: true }
})
