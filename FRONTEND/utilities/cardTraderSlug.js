export const CARD_TRADER_SERVICE_NAME = "Card Trader";

export function createCardTraderSlugEntry(overrides = {}) {
  return {
    service: CARD_TRADER_SERVICE_NAME,
    url: "",
    verified: false,
    ...overrides,
  };
}

export function ensureCardTraderSlugEntry(card) {
  if (!card || typeof card !== "object") return card;

  const nextSlugs = Array.isArray(card.slugs) ? [...card.slugs] : [];
  const existingIndex = nextSlugs.findIndex(
    (entry) => String(entry?.service ?? "") === CARD_TRADER_SERVICE_NAME,
  );

  if (existingIndex >= 0) {
    const existingEntry = nextSlugs[existingIndex] ?? {};
    nextSlugs[existingIndex] = {
      ...existingEntry,
      service: CARD_TRADER_SERVICE_NAME,
      url: typeof existingEntry.url === "string" ? existingEntry.url : "",
      verified: Boolean(existingEntry.verified),
    };
  } else {
    nextSlugs.push(createCardTraderSlugEntry());
  }

  return {
    ...card,
    slugs: nextSlugs,
  };
}
