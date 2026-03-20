<script setup>
import { getConditionMeta } from "@/utilities/enums/conditions";
import { formatCoordinatesLabel, getListingCoordinates } from "@/utilities/geo";
import { createSellListingMarkerHtml } from "@/utilities/mapMarkers";

const LOCATION_MAP_MODES = Object.freeze({
  hidden: "hidden",
  expanded: "expanded",
  collapsible: "collapsible",
});

const props = defineProps({
  listing: {
    type: Object,
    required: true,
  },
  priceLabel: {
    type: String,
    default: "Prezzo vendita x 1",
  },
  currency: {
    type: String,
    default: "EUR",
  },
  showCopies: {
    type: Boolean,
    default: true,
  },
  showPrice: {
    type: Boolean,
    default: true,
  },
  locationMapMode: {
    type: String,
    default: "hidden",
    validator: (value) => ["hidden", "expanded", "collapsible"].includes(value),
  },
  locationMapMinHeight: {
    type: [Number, String],
    default: 220,
  },
});
const emit = defineEmits(["open-card"]);

const hasListingCard = computed(() => Boolean(props.listing?.card));
const listingCoordinates = computed(() => getListingCoordinates(props.listing));
const hasEmbeddedLocationMap = computed(() => props.locationMapMode !== LOCATION_MAP_MODES.hidden);
const isEmbeddedLocationMapCollapsible = computed(() => props.locationMapMode === LOCATION_MAP_MODES.collapsible);
const isLocationMapExpanded = ref(false);

const copiesInSale = computed(() => {
  const parsedValue = Number(props.listing?.quantity);
  if (!Number.isInteger(parsedValue) || parsedValue < 0) return 0;
  return parsedValue;
});

const listingPriceValue = computed(() => {
  const parsedValue = Number(props.listing?.price);
  if (!Number.isFinite(parsedValue) || parsedValue <= 0) return null;
  return parsedValue.toFixed(2);
});

const conditionMeta = computed(() => getConditionMeta(props.listing?.condition));
const conditionColor = computed(() => conditionMeta.value?.color ?? "#607d8b");
const conditionLabel = computed(() => {
  if (conditionMeta.value?.label) return conditionMeta.value.label;

  const fallbackValue = props.listing?.condition;
  if (typeof fallbackValue === "string" && fallbackValue.trim()) {
    return fallbackValue.trim();
  }

  return "N/D";
});

const cardName = computed(() => props.listing?.card?.name ?? "Carta in vendita");
const cardRarity = computed(() => props.listing?.card?.rarity ?? "N/D");
const cardIllustration = computed(() => props.listing?.card?.illustration || "Base");
const cardSetName = computed(() => props.listing?.card?.setName ?? "Set non disponibile");
const locationMarkers = computed(() => {
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
const shouldShowLocationMap = computed(() => {
  if (!hasEmbeddedLocationMap.value) return false;
  if (!isEmbeddedLocationMapCollapsible.value) return true;
  return isLocationMapExpanded.value;
});
const canToggleLocationMap = computed(() => {
  return hasEmbeddedLocationMap.value
    && isEmbeddedLocationMapCollapsible.value
    && Boolean(listingCoordinates.value);
});
const locationMapCoordinatesLabel = computed(() => formatCoordinatesLabel(listingCoordinates.value));
const locationMapToggleLabel = computed(() => {
  return isLocationMapExpanded.value ? "Chiudi mappa" : "Mostra su mappa";
});
const locationMapToggleIcon = computed(() => {
  return isLocationMapExpanded.value ? "mdi-chevron-up" : "mdi-chevron-down";
});

function handleCardOpen(card) {
  emit("open-card", card);
}

function toggleLocationMap() {
  if (!canToggleLocationMap.value) return;
  isLocationMapExpanded.value = !isLocationMapExpanded.value;
}

function stopCardNavigation(event) {
  event?.stopPropagation?.();
}

watch(
  () => [props.locationMapMode, props.listing?.id],
  () => {
    isLocationMapExpanded.value = props.locationMapMode === LOCATION_MAP_MODES.expanded;
  },
  { immediate: true },
);
</script>

<template>
  <div v-if="hasListingCard" class="sell-listing-info-card">
    <div class="sell-listing-info-card__summary">
      <div class="w-2/5 min-w-[100px]">
        <Card :card="listing.card" @open="handleCardOpen" />
      </div>

      <div class="w-full flex-1 flex flex-col justify-between gap-1">
        <div class="sell-card-summary">
          <p class="sell-card-name line-clamp-2">{{ cardName }}</p>
          <p v-if="showCopies" class="sell-card-copies mb-1 text-xs">{{ copiesInSale }} copie in vendita</p>
          <v-chip size="x-small" variant="flat" label :color="conditionColor" class="w-fit font-bold">
            {{ conditionLabel }}
          </v-chip>
        </div>

        <p class="text-xs font-bold">{{ cardRarity }} | {{ cardIllustration }}</p>
        <p class="text-xs font-thin line-clamp-2">{{ cardSetName }}</p>

        <CardPriceLink
          v-if="showPrice"
          class="mt-1 pb-0"
          :price="listingPriceValue"
          :show-outer-padding="false"
          :link-enabled="false"
          :label="priceLabel"
          :currency="currency"
        />
      </div>
    </div>
    <button
      v-if="canToggleLocationMap"
      type="button"
      class="sell-card-location__toggle"
      :aria-expanded="shouldShowLocationMap"
      @click.stop="toggleLocationMap"
      @keydown.enter.stop
      @keydown.space.stop
    >
      <span>{{ locationMapToggleLabel }}</span>
      <v-icon size="15">{{ locationMapToggleIcon }}</v-icon>
    </button>
    <div
      v-if="shouldShowLocationMap"
      class="sell-card-location"
      @click.stop="stopCardNavigation"
    >
      <template v-if="listingCoordinates">
        <div class="sell-card-location__map-shell">
          <MapLeafletMap
            :center="listingCoordinates"
            :zoom="15"
            :markers="locationMarkers"
            :min-height="locationMapMinHeight"
          />
        </div>
      </template>

      <div v-else class="sell-card-location__empty">
        <p class="sell-card-location__state">Posizione non disponibile per questa vendita</p>
      </div>
    </div>

    
  </div>
</template>

<style scoped>
.sell-listing-info-card {
  display: grid;
  gap: 0.75rem;
  width: 100%;
}

.sell-listing-info-card__summary {
  display: flex;
  gap: 0.75rem;
  width: 100%;
}

.sell-card-name {
  color: rgba(248, 250, 252, 0.98);
  font-weight: 700;
  line-height: 1.2;
}

.sell-card-copies {
  color: orange;
  font-weight: 600;
}

.sell-card-location {
  display: grid;
  gap: 0.7rem;
}

.sell-card-location__meta,
.sell-card-location__empty {
  border-radius: 0.95rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.03);
  padding: 0.75rem 0.8rem;
}

.sell-card-location__title,
.sell-card-location__coordinates,
.sell-card-location__state {
  margin: 0;
}

.sell-card-location__title {
  color: rgba(255, 245, 235, 0.98);
  font-size: 0.84rem;
  font-weight: 800;
}

.sell-card-location__coordinates,
.sell-card-location__state {
  color: rgba(226, 232, 240, 0.78);
  font-size: 0.76rem;
}

.sell-card-location__coordinates {
  margin-top: 0.18rem;
}

.sell-card-location__map-shell {
  width: 100%;
}

.sell-card-location__toggle {
  align-self: flex-center;
  display: block;
  text-align: center;
  align-items: center;
  gap: 0.2rem;
  border: 0;
  background: transparent;
  color: rgba(226, 232, 240, 0.76);
  font-size: 0.76rem;
  font-weight: 600;
  line-height: 1;
  padding: 0;
  transition: color 180ms ease, opacity 180ms ease;
}

.sell-card-location__toggle:hover {
  color: rgba(255, 245, 235, 0.92);
}
</style>
