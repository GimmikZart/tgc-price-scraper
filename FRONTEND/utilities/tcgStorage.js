import {
  getCardImageObjectPath,
  getPrefixedCardImageObjectPathCandidates,
} from "./cardImageStorage.js";
import { getSupportedGameConfig } from "./tcgGameConfig.js";

export function joinStoragePath(...segments) {
  return segments
    .flatMap((segment) => String(segment ?? "").split("/"))
    .map((segment) => segment.trim())
    .filter(Boolean)
    .join("/");
}

export function getGameCatalogObjectPath(gameSlug) {
  const config = getSupportedGameConfig(gameSlug);
  return joinStoragePath(config.storagePrefix, config.catalogObjectName);
}

export function getGamePricesObjectPath(gameSlug) {
  const config = getSupportedGameConfig(gameSlug);
  return joinStoragePath(config.storagePrefix, config.pricesObjectName);
}

export function getGameMetaObjectPath(gameSlug) {
  const config = getSupportedGameConfig(gameSlug);
  return joinStoragePath(config.storagePrefix, config.metaObjectName);
}

export function getGameRawSetObjectPath(gameSlug, fileName) {
  const config = getSupportedGameConfig(gameSlug);
  return joinStoragePath(config.storagePrefix, config.rawSetsFolderName, fileName);
}

export function getGameCardImageObjectPath(gameSlug, card) {
  const config = getSupportedGameConfig(gameSlug);
  const imageObjectPath = getCardImageObjectPath(card);

  if (!imageObjectPath) return null;

  return joinStoragePath(config.imagePathPrefix, imageObjectPath);
}

export function getGameCardImageObjectPathCandidates(gameSlug, card, options = {}) {
  const config = getSupportedGameConfig(gameSlug);

  return getPrefixedCardImageObjectPathCandidates(card, {
    ...options,
    pathPrefix: config.imagePathPrefix,
  });
}
