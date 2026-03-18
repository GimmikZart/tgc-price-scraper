function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatMarkerPrice(value) {
  const parsedValue = Number(value);
  if (!Number.isFinite(parsedValue) || parsedValue <= 0) return null;
  return parsedValue.toFixed(2);
}

export function createSellListingMarkerHtml(listing) {
  const imageUrl = escapeHtml(listing?.card?.image ?? "");
  const cardName = escapeHtml(listing?.card?.name ?? "Carta in vendita");
  const priceLabel = formatMarkerPrice(listing?.price);

  return `
    <div class="app-card-map-marker" aria-label="${cardName}">
      <div class="app-card-map-marker__frame">
        <img
          class="app-card-map-marker__image"
          src="${imageUrl}"
          alt="${cardName}"
          loading="lazy"
          decoding="async"
        />
      </div>
      ${priceLabel ? `<span class="app-card-map-marker__price">${priceLabel}&nbsp;&euro;</span>` : ""}
    </div>
  `;
}
