import { getSupportedGameConfig } from "@/utilities/tcgGameConfig.js";
import { loadGameCatalogAsset } from "../../../utils/gameDataAssets.js";

export default defineEventHandler(async (event) => {
  const gameSlug = String(getRouterParam(event, "game") || "").trim();
  getSupportedGameConfig(gameSlug);

  const catalog = await loadGameCatalogAsset(gameSlug);
  setHeader(event, "Cache-Control", "s-maxage=300, stale-while-revalidate=600");
  return Array.isArray(catalog) ? catalog : [];
});
