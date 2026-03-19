import {
  DEFAULT_ONE_PIECE_GAME_SLUG,
  DEFAULT_TCG_DATA_BUCKET,
} from "@/utilities/tcgGameConfig.js";
import {
  createSupabaseServiceClientFromEnv,
  downloadJsonObject,
} from "@/utilities/gameStorageSync.js";
import { getGameRawSetObjectPath } from "@/utilities/tcgStorage.js";

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const name = String(query.name || "")

  if (!name || name.includes("..") || !name.endsWith(".json")) {
    throw createError({ statusCode: 400, statusMessage: "Invalid file name" })
  }

  const client = createSupabaseServiceClientFromEnv()
  const bucketName = process.env.TCG_DATA_BUCKET || DEFAULT_TCG_DATA_BUCKET
  const payload = await downloadJsonObject(
    client,
    bucketName,
    getGameRawSetObjectPath(DEFAULT_ONE_PIECE_GAME_SLUG, name),
  )

  if (payload == null) {
    throw createError({ statusCode: 404, statusMessage: "File not found" })
  }

  return payload
})
