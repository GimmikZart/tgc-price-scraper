import { DEFAULT_ONE_PIECE_GAME_SLUG } from "@/utilities/tcgGameConfig.js";
import { loadGamePricesAsset } from "../utils/gameDataAssets.js";

export default defineEventHandler(async (event) => {
  const prices = await loadGamePricesAsset(DEFAULT_ONE_PIECE_GAME_SLUG);
  setHeader(event, "Cache-Control", "s-maxage=60, stale-while-revalidate=120");
  return Array.isArray(prices) ? prices : [];
});
