import { getSupportedGameConfig } from "@/utilities/tcgGameConfig.js";
import { loadGamePricesAsset } from "../../../utils/gameDataAssets.js";

export default defineEventHandler(async (event) => {
  const gameSlug = String(getRouterParam(event, "game") || "").trim();
  getSupportedGameConfig(gameSlug);

  const prices = await loadGamePricesAsset(gameSlug);
  setHeader(event, "Cache-Control", "s-maxage=60, stale-while-revalidate=120");
  return Array.isArray(prices) ? prices : [];
});
