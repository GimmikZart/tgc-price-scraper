import {
  DEFAULT_ONE_PIECE_GAME_SLUG,
  DEFAULT_TCG_DATA_BUCKET,
} from "@/utilities/tcgGameConfig.js";
import {
  buildGameCatalogFromSetFiles,
  createSupabaseServiceClientFromEnv,
  readGameCardsFromStorage,
  syncGameStorage,
  upsertSetFileEntry,
} from "@/utilities/gameStorageSync.js";

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const name = body && body.name ? String(body.name) : ""

  if (!name || name.includes("..") || !name.endsWith(".json")) {
    throw createError({ statusCode: 400, statusMessage: "Invalid file name" })
  }

  const cards = Array.isArray(body?.data)
    ? body.data
    : (Array.isArray(body?.data?.cards) ? body.data.cards : [])
  const client = createSupabaseServiceClientFromEnv()
  const dataBucket = process.env.TCG_DATA_BUCKET || DEFAULT_TCG_DATA_BUCKET
  const storageData = await readGameCardsFromStorage(DEFAULT_ONE_PIECE_GAME_SLUG, {
    client,
    dataBucket,
  })
  const nextSetFiles = upsertSetFileEntry(storageData.setFiles, {
    fileName: name,
    cards,
  })
  const nextCards = buildGameCatalogFromSetFiles(nextSetFiles)

  await syncGameStorage(DEFAULT_ONE_PIECE_GAME_SLUG, {
    client,
    dataBucket,
    setFiles: nextSetFiles,
    setFileNames: [name],
    cards: nextCards,
    syncCatalog: true,
    syncRawSets: true,
    syncPrices: false,
    syncImages: false,
  })

  return { ok: true }
})
