import { promises as fs } from 'node:fs'
import path from 'node:path'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const name = String(query.name || '')
  if (!name || name.includes('..') || !name.endsWith('.json')) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid file name' })
  }
  const filePath = path.resolve(process.cwd(), 'data/cards/one_piece_tgc', name)
  const content = await fs.readFile(filePath, 'utf-8')
  return JSON.parse(content)
})
