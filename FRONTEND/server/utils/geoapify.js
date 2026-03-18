function getGeoapifyApiKey() {
  const config = useRuntimeConfig();
  const apiKey = String(config.geoapifyApiKey ?? "").trim();

  if (!apiKey) {
    throw createError({
      statusCode: 500,
      statusMessage: "Geoapify non configurato. Imposta GEOAPIFY_API_KEY.",
    });
  }

  return apiKey;
}

function normalizeFeature(feature) {
  const properties = feature?.properties ?? {};
  const latitude = Number(properties.lat ?? feature?.geometry?.coordinates?.[1]);
  const longitude = Number(properties.lon ?? feature?.geometry?.coordinates?.[0]);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  return {
    id: String(
      properties.place_id
      ?? properties.result_type
      ?? `${latitude}:${longitude}`,
    ),
    label: properties.formatted ?? properties.address_line1 ?? properties.city ?? "Indirizzo",
    formatted: properties.formatted ?? null,
    addressLine1: properties.address_line1 ?? null,
    addressLine2: properties.address_line2 ?? null,
    city: properties.city ?? properties.county ?? properties.state ?? null,
    state: properties.state ?? null,
    country: properties.country ?? null,
    postcode: properties.postcode ?? null,
    lat: latitude,
    lng: longitude,
  };
}

export async function autocompleteGeoapify(text, options = {}) {
  const normalizedText = String(text ?? "").trim();
  if (!normalizedText) return [];

  const apiKey = getGeoapifyApiKey();
  const limit = Math.min(10, Math.max(1, Number(options.limit) || 5));

  const response = await $fetch("https://api.geoapify.com/v1/geocode/autocomplete", {
    query: {
      apiKey,
      text: normalizedText,
      lang: "it",
      format: "json",
      limit,
    },
  });

  return (Array.isArray(response?.results) ? response.results : [])
    .map((result) => normalizeFeature({ properties: result, geometry: { coordinates: [result?.lon, result?.lat] } }))
    .filter(Boolean);
}

export async function reverseGeoapify(latitude, longitude) {
  const parsedLatitude = Number(latitude);
  const parsedLongitude = Number(longitude);

  if (!Number.isFinite(parsedLatitude) || !Number.isFinite(parsedLongitude)) {
    throw createError({
      statusCode: 400,
      statusMessage: "Coordinate non valide",
    });
  }

  const apiKey = getGeoapifyApiKey();
  const response = await $fetch("https://api.geoapify.com/v1/geocode/reverse", {
    query: {
      apiKey,
      lat: parsedLatitude,
      lon: parsedLongitude,
      lang: "it",
      format: "json",
      limit: 1,
    },
  });

  const [firstResult] = Array.isArray(response?.results) ? response.results : [];
  if (!firstResult) return null;

  return normalizeFeature({
    properties: firstResult,
    geometry: { coordinates: [firstResult?.lon, firstResult?.lat] },
  });
}
