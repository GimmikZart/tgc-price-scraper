<script setup>
import {
  BUY_LISTINGS_RADIUS_METERS,
  DEFAULT_USER_LOCATION,
  formatCoordinatesLabel,
  getListingCoordinates,
  haversineDistanceMeters,
  isWithinRadiusMeters,
} from "@/utilities/geo";
import { createSellListingMarkerHtml } from "@/utilities/mapMarkers";

const props = defineProps({
  listings: {
    type: Array,
    default: () => [],
  },
  center: {
    type: Object,
    default: () => DEFAULT_USER_LOCATION,
  },
  radiusMeters: {
    type: Number,
    default: BUY_LISTINGS_RADIUS_METERS,
  },
  loading: {
    type: Boolean,
    default: false,
  },
  minHeight: {
    type: [Number, String],
    default: 420,
  },
  emptyMessage: {
    type: String,
    default: "Nessuna vendita disponibile nell'area selezionata",
  },
  centerLabel: {
    type: String,
    default: DEFAULT_USER_LOCATION.label,
  },
  showCenterMarker: {
    type: Boolean,
    default: true,
  },
  allowCenterSelection: {
    type: Boolean,
    default: false,
  },
  selectionCoordinates: {
    type: Object,
    default: null,
  },
  selectionDraggable: {
    type: Boolean,
    default: false,
  },
  mapZoom: {
    type: Number,
    default: 13,
  },
});

const emit = defineEmits(["listing-click", "update:selectionCoordinates"]);

const nearbyListings = computed(() => {
  return (Array.isArray(props.listings) ? props.listings : [])
    .map((listing) => {
      const coordinates = getListingCoordinates(listing);
      if (!coordinates) return null;

      return {
        ...listing,
        _mapCoordinates: coordinates,
        _distanceMeters: haversineDistanceMeters(props.center, coordinates),
      };
    })
    .filter(Boolean)
    .filter((listing) => isWithinRadiusMeters(props.center, listing._mapCoordinates, props.radiusMeters))
    .sort((leftListing, rightListing) => leftListing._distanceMeters - rightListing._distanceMeters);
});

const markers = computed(() => {
  return nearbyListings.value.map((listing) => ({
    id: listing.id,
    lat: listing._mapCoordinates.lat,
    lng: listing._mapCoordinates.lng,
    html: createSellListingMarkerHtml(listing),
    className: "app-leaflet-div-icon app-leaflet-div-icon--card",
    iconSize: [52, 84],
    iconAnchor: [26, 84],
    listing,
  }));
});

const selectionModel = computed({
  get() {
    return props.selectionCoordinates;
  },
  set(value) {
    emit("update:selectionCoordinates", value);
  },
});

function handleMarkerClick(marker) {
  emit("listing-click", marker?.listing ?? null);
}

defineExpose({
  nearbyListings,
});
</script>

<template>
  <div class="sell-listings-map">
    <p v-if="loading" class="sell-listings-map__state">
      Caricamento mappa vendite...
    </p>
    <div v-else class="sell-listings-map__map-shell">
      <MapLeafletMap
        v-model="selectionModel"
        :center="center"
        :zoom="mapZoom"
        :markers="markers"
        :show-center-marker="showCenterMarker"
        :center-label="centerLabel"
        :center-radius-meters="radiusMeters"
        :allow-set-marker="allowCenterSelection"
        :selected-marker-draggable="selectionDraggable"
        :show-selected-marker="allowCenterSelection && Boolean(selectionCoordinates)"
        :min-height="minHeight"
        @marker-click="handleMarkerClick"
      />
    </div>
  </div>
</template>

<style scoped>
.sell-listings-map {
  display: grid;
  gap: 0.85rem;
  height: 100%;
  min-height: 0;
}

.sell-listings-map__title,
.sell-listings-map__subtitle,
.sell-listings-map__state,
.sell-listings-map__empty-subtitle {
  text-align: center;
  margin: 0;
}

.sell-listings-map__title {
  color: rgba(255, 245, 235, 0.98);
  font-size: 0.95rem;
  font-weight: 800;
}

.sell-listings-map__subtitle,
.sell-listings-map__state,
.sell-listings-map__empty-subtitle {
  color: rgba(226, 232, 240, 0.78);
  font-size: 0.8rem;
}

.sell-listings-map__map-shell,
.sell-listings-map__empty {
  min-height: 0;
  flex: 1;
}

.sell-listings-map__empty {
  display: grid;
  place-content: center;
  gap: 0.35rem;
  border: 1px dashed rgba(255, 255, 255, 0.14);
  background: rgba(255, 255, 255, 0.03);
  text-align: center;
}
</style>
