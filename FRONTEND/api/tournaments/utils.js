export function normalizeString(value) {
  if (typeof value !== "string") return null;
  const trimmedValue = value.trim();
  return trimmedValue || null;
}

export function normalizeUuid(value) {
  const normalizedValue = normalizeString(value);
  if (!normalizedValue) return null;

  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    .test(normalizedValue)
    ? normalizedValue
    : null;
}

export function normalizePositiveInteger(value, fallbackValue = 1) {
  const parsedValue = Number(value);
  if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
    return fallbackValue;
  }
  return parsedValue;
}

export function normalizeNonNegativeInteger(value, fallbackValue = 0) {
  const parsedValue = Number(value);
  if (!Number.isInteger(parsedValue) || parsedValue < 0) {
    return fallbackValue;
  }
  return parsedValue;
}

export function normalizeNumberInRange(value, min, max) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsedValue = Number(value);
  if (!Number.isFinite(parsedValue)) {
    return null;
  }

  if (parsedValue < min || parsedValue > max) {
    return null;
  }

  return parsedValue;
}

export function dedupeStrings(values = []) {
  return [...new Set(
    (Array.isArray(values) ? values : [])
      .map((value) => normalizeString(value))
      .filter(Boolean),
  )];
}

export function normalizeJsonObject(value, fallbackValue = {}) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ...fallbackValue };
  }
  return { ...fallbackValue, ...value };
}

export function nowIso() {
  return new Date().toISOString();
}

export function createPairKey(firstId, secondId) {
  const normalizedFirst = normalizeUuid(firstId);
  const normalizedSecond = normalizeUuid(secondId);

  if (!normalizedFirst || !normalizedSecond) return null;
  if (normalizedFirst === normalizedSecond) return normalizedFirst;

  return [normalizedFirst, normalizedSecond].sort().join("::");
}

export function shuffleArray(values = []) {
  const shuffledValues = Array.isArray(values) ? [...values] : [];

  for (let index = shuffledValues.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffledValues[index], shuffledValues[randomIndex]] = [
      shuffledValues[randomIndex],
      shuffledValues[index],
    ];
  }

  return shuffledValues;
}

export function nextPowerOfTwo(value) {
  const normalizedValue = normalizePositiveInteger(value, 1);
  return 2 ** Math.ceil(Math.log2(normalizedValue));
}

export function getAuthenticatedUserId() {
  return normalizeUuid(useUserAuth()?.userLogged?.id ?? null);
}

export function assertAuthenticatedUserId() {
  const userId = getAuthenticatedUserId();
  if (!userId) {
    throw new Error("Utente non autenticato");
  }
  return userId;
}
