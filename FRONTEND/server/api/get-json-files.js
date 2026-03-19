import { DEFAULT_ONE_PIECE_GAME_SLUG } from "@/utilities/tcgGameConfig.js";
import { listGameRawSetFileNamesFromStorage } from "@/utilities/gameStorageSync.js";

export default defineEventHandler(async () => {
  return listGameRawSetFileNamesFromStorage(DEFAULT_ONE_PIECE_GAME_SLUG);
})
