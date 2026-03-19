import { getSupportedGameConfig } from "@/utilities/tcgGameConfig.js";
import { loadGameMetaAsset } from "../../../utils/gameDataAssets.js";

export default defineEventHandler(async (event) => {
  const gameSlug = String(getRouterParam(event, "game") || "").trim();
  getSupportedGameConfig(gameSlug);

  const meta = await loadGameMetaAsset(gameSlug);
  setHeader(event, "Cache-Control", "s-maxage=60, stale-while-revalidate=60");
  return meta;
});
