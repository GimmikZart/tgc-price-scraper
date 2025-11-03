import { promises as fs } from 'node:fs'
import path from 'node:path'

export default defineEventHandler(async () => {
  const baseDir = path.resolve(process.cwd(), 'data/cards/one_piece_tgc')
  const files = await fs.readdir(baseDir)
  return files.filter(f => f.endsWith('.json')).sort()
})
