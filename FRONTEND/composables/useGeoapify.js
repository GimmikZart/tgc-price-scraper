export function useGeoapify() {
  const config = useRuntimeConfig();

  const isEnabled = computed(() => Boolean(config.public?.geoapifyEnabled));
  const publicApiKey = computed(() => String(config.public?.geoapifyApiKey ?? "").trim());
  const mapStyle = computed(() => String(config.public?.geoapifyMapStyle ?? "osm-carto").trim() || "osm-carto");
  const isConfigured = computed(() => isEnabled.value);
  const tileUrl = computed(() => {
    if (!isConfigured.value) return null;
    return `/api/geo/tiles/${mapStyle.value}/{z}/{x}/{y}`;
  });

  async function fetchAddressSuggestions(text, options = {}) {
    const normalizedText = String(text ?? "").trim();
    if (!normalizedText) return [];

    const response = await $fetch("/api/geo/autocomplete", {
      query: {
        text: normalizedText,
        limit: Number(options.limit) || 5,
      },
    });

    return Array.isArray(response?.results) ? response.results : [];
  }

  async function reverseGeocode(latitude, longitude) {
    const response = await $fetch("/api/geo/reverse", {
      query: {
        lat: latitude,
        lng: longitude,
      },
    });

    return response?.result ?? null;
  }

  return {
    isEnabled,
    publicApiKey,
    mapStyle,
    isConfigured,
    tileUrl,
    tileAttribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, ' +
      'powered by <a href="https://www.geoapify.com/">Geoapify</a>',
    fetchAddressSuggestions,
    reverseGeocode,
  };
}
