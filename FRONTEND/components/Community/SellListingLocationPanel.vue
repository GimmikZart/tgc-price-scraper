<script setup>
import { formatCoordinatesLabel, getListingCoordinates } from "@/utilities/geo";
import { createSellListingMarkerHtml } from "@/utilities/mapMarkers";

const props = defineProps({
  listing: {
    type: Object,
    default: null,
  },
});

const listingCoordinates = computed(() => getListingCoordinates(props.listing));
const markers = computed(() => {
  if (!listingCoordinates.value || !props.listing) return [];

  return [{
    id: props.listing.id,
    lat: listingCoordinates.value.lat,
    lng: listingCoordinates.value.lng,
    html: createSellListingMarkerHtml(props.listing),
    className: "app-leaflet-div-icon app-leaflet-div-icon--card",
    iconSize: [56, 88],
    iconAnchor: [28, 88],
  }];
});
</script>

<template>
  <div class="sell-listing-location-panel">
    <div v-if="!listingCoordinates" class="sell-listing-location-panel__empty">
      <p class="sell-listing-location-panel__state">Posizione non disponibile per questa vendita</p>
    </div>

    <template v-else>
      <div class="sell-listing-location-panel__header">
        <p class="sell-listing-location-panel__title">Posizione della carta</p>
        <p class="sell-listing-location-panel__coordinates">
          {{ formatCoordinatesLabel(listingCoordinates) }}
        </p>
      </div>

      <div class="sell-listing-location-panel__map-shell">
        <MapLeafletMap
          :center="listingCoordinates"
          :zoom="15"
          :markers="markers"
          :min-height="360"
        />
      </div>
    </template>
  </div>
</template>

<style scoped>
.sell-listing-location-panel {
  display: grid;
  gap: 0.8rem;
  min-height: 0;
}

.sell-listing-location-panel__header,
.sell-listing-location-panel__empty {
  border-radius: 1rem;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.03);
  padding: 0.8rem 0.85rem;
}

.sell-listing-location-panel__title,
.sell-listing-location-panel__coordinates,
.sell-listing-location-panel__state {
  margin: 0;
}

.sell-listing-location-panel__title {
  color: rgba(255, 245, 235, 0.98);
  font-size: 0.92rem;
  font-weight: 800;
}

.sell-listing-location-panel__coordinates,
.sell-listing-location-panel__state {
  color: rgba(226, 232, 240, 0.8);
  font-size: 0.8rem;
}

.sell-listing-location-panel__coordinates {
  margin-top: 0.2rem;
}

.sell-listing-location-panel__map-shell {
  min-height: 360px;
}
</style>
