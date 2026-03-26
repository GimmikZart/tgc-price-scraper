export const DEFAULT_CARD_EFFECT_LANGUAGE = "en";
export const FALLBACK_CARD_EFFECT_LANGUAGES = Object.freeze(["en", "it"]);

function normalizeLanguageKey(language) {
  return String(language ?? "").trim().toLowerCase();
}

function normalizeText(value) {
  if (typeof value !== "string") return null;

  const trimmedValue = value.trim();
  return trimmedValue ? trimmedValue : null;
}

function orderLocalizedEffect(effectByLanguage) {
  const normalizedEntries = Object.entries(effectByLanguage ?? {})
    .map(([language, text]) => [normalizeLanguageKey(language), normalizeText(text)])
    .filter(([language, text]) => language && text);

  if (!normalizedEntries.length) return null;

  const prioritizedLanguages = [
    ...FALLBACK_CARD_EFFECT_LANGUAGES,
    ...normalizedEntries.map(([language]) => language),
  ];
  const orderedLanguages = [...new Set(prioritizedLanguages)];
  const orderedEffect = {};

  for (const language of orderedLanguages) {
    const foundEntry = normalizedEntries.find(([entryLanguage]) => entryLanguage === language);
    if (!foundEntry) continue;

    orderedEffect[language] = foundEntry[1];
  }

  return Object.keys(orderedEffect).length ? orderedEffect : null;
}

export function normalizeCardEffect(effect, options = {}) {
  const fallbackLanguage = normalizeLanguageKey(
    options.fallbackLanguage ?? DEFAULT_CARD_EFFECT_LANGUAGE,
  );

  if (effect == null) return null;

  if (typeof effect === "string") {
    const normalizedEffect = normalizeText(effect);
    return normalizedEffect ? { [fallbackLanguage || DEFAULT_CARD_EFFECT_LANGUAGE]: normalizedEffect } : null;
  }

  if (typeof effect !== "object" || Array.isArray(effect)) return null;
  return orderLocalizedEffect(effect);
}

export function getCardEffectText(effect, language = DEFAULT_CARD_EFFECT_LANGUAGE, options = {}) {
  const normalizedEffect = normalizeCardEffect(effect, options);
  if (!normalizedEffect) return null;

  const preferredLanguages = [
    normalizeLanguageKey(language),
    normalizeLanguageKey(options.fallbackLanguage ?? DEFAULT_CARD_EFFECT_LANGUAGE),
    ...FALLBACK_CARD_EFFECT_LANGUAGES,
    ...Object.keys(normalizedEffect),
  ].filter(Boolean);

  for (const currentLanguage of [...new Set(preferredLanguages)]) {
    const text = normalizeText(normalizedEffect[currentLanguage]);
    if (text) return text;
  }

  return null;
}

export function getCardEffectEntries(effect, options = {}) {
  const normalizedEffect = normalizeCardEffect(effect, options);
  if (!normalizedEffect) return [];

  return Object.entries(normalizedEffect)
    .map(([language, text]) => ({
      language,
      text,
    }))
    .filter((entry) => normalizeText(entry.text));
}

export function getCardEffectSearchTexts(effect, options = {}) {
  return getCardEffectEntries(effect, options).map((entry) => entry.text);
}

export function getCardEffectSearchContent(effect, options = {}) {
  return getCardEffectSearchTexts(effect, options).join("\n");
}

export function cardEffectContains(effect, query, options = {}) {
  const normalizedQuery = normalizeText(query)?.toLowerCase();
  if (!normalizedQuery) return true;

  return getCardEffectSearchTexts(effect, options).some((text) =>
    text.toLowerCase().includes(normalizedQuery),
  );
}

export function mergeCardEffects(existingEffect, nextEffect, options = {}) {
  const normalizedExistingEffect = normalizeCardEffect(existingEffect, options) ?? {};
  const normalizedNextEffect = normalizeCardEffect(nextEffect, options);

  if (!normalizedNextEffect) return null;

  return orderLocalizedEffect({
    ...normalizedExistingEffect,
    ...normalizedNextEffect,
  });
}
