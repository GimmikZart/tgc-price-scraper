export const DEFAULT_ONE_PIECE_CARD_IMAGES_BUCKET = "tcg-images";

export function normalizeCardImagePathSegment(value, fallback = "unknown") {
  const normalizedValue = String(value ?? "").trim();
  if (!normalizedValue) return fallback;

  const asciiValue = normalizedValue
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "");

  const safeValue = asciiValue
    .replace(/[\\/]+/g, "_")
    .replace(/[^A-Za-z0-9._-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^[_\-.]+|[_\-.]+$/g, "");

  return safeValue || fallback;
}

export function normalizeCardImageSetFolderName(setName) {
  return normalizeCardImagePathSegment(setName, "unknown_set");
}

export function normalizeCardImageFileName(cardId) {
  return normalizeCardImagePathSegment(cardId, "unknown_card");
}

export function getLegacyCardImageObjectPath(card) {
  const cardId = typeof card?.id === "string" ? card.id.trim() : "";
  const setName = typeof card?.setName === "string" ? card.setName.trim() : "";

  if (!cardId || !setName) return null;

  const folderName = String(setName)
    .trim()
    .replace(/[\\/]+/g, "_")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .replace(/[. ]+$/g, "");

  return `${folderName}/${cardId}.webp`;
}

export function getCardImageObjectPath(card) {
  const cardId = typeof card?.id === "string" ? card.id.trim() : "";
  const setName = typeof card?.setName === "string" ? card.setName.trim() : "";

  if (!cardId || !setName) return null;

  const folderName = normalizeCardImageSetFolderName(setName);
  const fileName = normalizeCardImageFileName(cardId);
  return `${folderName}/${fileName}.webp`;
}

export function getCardImageObjectPathCandidates(card, options = {}) {
  const includeCanonical = options.includeCanonical !== false;
  const includeLegacy = options.includeLegacy !== false;
  const includeLowercase = Boolean(options.includeLowercase);
  const candidates = [];

  if (includeCanonical) {
    candidates.push(getCardImageObjectPath(card));
  }

  if (includeLegacy) {
    candidates.push(getLegacyCardImageObjectPath(card));
  }

  if (includeLowercase) {
    const canonicalPath = getCardImageObjectPath(card);
    const legacyPath = getLegacyCardImageObjectPath(card);

    if (canonicalPath) candidates.push(canonicalPath.toLowerCase());
    if (legacyPath) candidates.push(legacyPath.toLowerCase());
  }

  return [...new Set(candidates.filter(Boolean))];
}

export function getPrefixedCardImageObjectPath(card, options = {}) {
  const imageObjectPath = getCardImageObjectPath(card);
  const pathPrefix = String(options.pathPrefix ?? "").trim().replace(/^\/+|\/+$/g, "");

  if (!imageObjectPath) return null;
  if (!pathPrefix) return imageObjectPath;

  return `${pathPrefix}/${imageObjectPath}`;
}

export function getPrefixedCardImageObjectPathCandidates(card, options = {}) {
  const pathPrefix = String(options.pathPrefix ?? "").trim().replace(/^\/+|\/+$/g, "");

  return getCardImageObjectPathCandidates(card, options).map((objectPath) =>
    pathPrefix ? `${pathPrefix}/${objectPath}` : objectPath
  );
}

export function buildSupabaseStoragePublicUrl(supabaseUrl, bucketName, objectPath) {
  const normalizedBaseUrl = String(supabaseUrl ?? "").trim().replace(/\/+$/g, "");
  const normalizedBucketName = String(bucketName ?? "").trim();
  const normalizedObjectPath = String(objectPath ?? "").trim();

  if (!normalizedBaseUrl || !normalizedBucketName || !normalizedObjectPath) {
    return null;
  }

  const encodedBucketName = encodeURIComponent(normalizedBucketName);
  const encodedObjectPath = normalizedObjectPath
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");

  return `${normalizedBaseUrl}/storage/v1/object/public/${encodedBucketName}/${encodedObjectPath}`;
}

export function getCardSupabaseImageUrl(card, options = {}) {
  const objectPath = getPrefixedCardImageObjectPath(card, options);
  if (!objectPath) return null;

  return buildSupabaseStoragePublicUrl(
    options.supabaseUrl,
    options.bucketName ?? DEFAULT_ONE_PIECE_CARD_IMAGES_BUCKET,
    objectPath,
  );
}

export function withStoredCardImage(card, options = {}) {
  if (!card || typeof card !== "object") return card;

  const imageOfficial = typeof card.image === "string" ? card.image.trim() || null : null;
  const imageObjectPath = getPrefixedCardImageObjectPath(card, options);
  const imageBucketUrl = imageObjectPath
    ? buildSupabaseStoragePublicUrl(
      options.supabaseUrl,
      options.bucketName ?? DEFAULT_ONE_PIECE_CARD_IMAGES_BUCKET,
      imageObjectPath,
    )
    : null;

  return {
    ...card,
    imageOfficial,
    imageObjectPath,
    imageBucketUrl,
    image: imageBucketUrl ?? imageOfficial,
  };
}
