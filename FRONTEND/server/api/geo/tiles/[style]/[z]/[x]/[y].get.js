export default defineEventHandler(async (event) => {
  const { style, z, x, y } = event.context.params ?? {};
  const config = useRuntimeConfig(event);
  const apiKey = String(config.geoapifyApiKey ?? "").trim();

  if (!apiKey) {
    throw createError({
      statusCode: 500,
      statusMessage: "Geoapify non configurato. Imposta GEOAPIFY_API_KEY.",
    });
  }

  const tileStyle = String(style ?? "").trim() || "osm-carto";
  const zoom = Number(z);
  const tileX = Number(x);
  const tileY = Number(y);

  if (![zoom, tileX, tileY].every((value) => Number.isInteger(value) && value >= 0)) {
    throw createError({
      statusCode: 400,
      statusMessage: "Coordinate tile non valide",
    });
  }

  const tileUrl = `https://maps.geoapify.com/v1/tile/${tileStyle}/${zoom}/${tileX}/${tileY}.png?apiKey=${apiKey}`;

  const response = await fetch(tileUrl, {
    headers: {
      Accept: "image/png,image/*;q=0.8,*/*;q=0.5",
    },
  });

  if (!response.ok) {
    throw createError({
      statusCode: response.status,
      statusMessage: `Geoapify tile error (${response.status})`,
    });
  }

  const contentType = response.headers.get("content-type") || "image/png";
  const cacheControl = response.headers.get("cache-control") || "public, max-age=3600, s-maxage=3600";

  setHeader(event, "Content-Type", contentType);
  setHeader(event, "Cache-Control", cacheControl);

  return new Uint8Array(await response.arrayBuffer());
});
