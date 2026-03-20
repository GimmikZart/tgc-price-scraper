<script setup>
import { fetchActiveSellListings } from "@/api/sellListings";
import {
  BUY_LISTINGS_RADIUS_METERS,
  DEFAULT_USER_LOCATION,
  areCoordinatesEqual,
  formatCoordinatesLabel,
  getListingCoordinates,
  isWithinRadiusMeters,
  roundCoordinatesPair,
} from "@/utilities/geo";

const snackbar = useSnackbar();
const router = useRouter();

const { sectionTabs, refreshPendingPurchaseOffersCount } = useBuyCardsTabs();

const DEFAULT_RADIUS_OPTION = Object.freeze({
  label: "10 km",
  value: BUY_LISTINGS_RADIUS_METERS,
  icon: "app:radius-10km",
});

const RADIUS_OPTIONS = Object.freeze([
  { label: "5 km", value: 5_000, icon: "app:radius-5km" },
  DEFAULT_RADIUS_OPTION,
  { label: "25 km", value: 25_000, icon: "app:radius-25km" },
]);

const sellListings = ref([]);
const isLoading = ref(true);
const isUsingCurrentPosition = ref(false);
const isChangingPosition = ref(false);
const selectedRadiusMeters = ref(BUY_LISTINGS_RADIUS_METERS);
const searchCenter = ref(createSearchCenter(DEFAULT_USER_LOCATION, {
  label: DEFAULT_USER_LOCATION.label,
  source: "default",
}));
const draftCenter = ref(createSearchCenter(DEFAULT_USER_LOCATION, {
  label: DEFAULT_USER_LOCATION.label,
  source: "default",
}));

let loadToken = 0;

const selectedRadiusOption = computed(() => {
  return RADIUS_OPTIONS.find((option) => option.value === selectedRadiusMeters.value) ?? DEFAULT_RADIUS_OPTION;
});

const activeMapCenter = computed(() => {
  return isChangingPosition.value ? draftCenter.value : searchCenter.value;
});

const activeCenterLabel = computed(() => formatCenterLabel(activeMapCenter.value));
const appliedCenterLabel = computed(() => formatCenterLabel(searchCenter.value));
const centerMarkerLabel = computed(() => {
  if (isChangingPosition.value) return "";
  return appliedCenterLabel.value;
});

const nearbyListingsCount = computed(() => {
  return (Array.isArray(sellListings.value) ? sellListings.value : []).filter((listing) => {
    const listingCoordinates = getListingCoordinates(listing);
    return listingCoordinates && isWithinRadiusMeters(activeMapCenter.value, listingCoordinates, selectedRadiusMeters.value);
  }).length;
});

const nearbyListingsCountLabel = computed(() => {
  if (isLoading.value) return "...";
  return nearbyListingsCount.value === 1
    ? "1 carta"
    : `${nearbyListingsCount.value} carte`;
});

const mapSummaryLine = computed(() => {
  if (isChangingPosition.value) {
    return "Tocca la mappa o trascina il pin per spostare il centro, poi conferma la nuova ricerca.";
  }

  return `Centro: ${appliedCenterLabel.value} | raggio ${selectedRadiusOption.value.label}`;
});

const emptyMessage = computed(() => {
  return `Nessuna carta in vendita entro ${selectedRadiusOption.value.label} da ${activeCenterLabel.value}`;
});

const positionButtonLabel = computed(() => {
  return isChangingPosition.value ? "Conferma" : "Posizione";
});

const positionButtonIcon = computed(() => {
  return isChangingPosition.value ? "mdi:check" : "mdi:map-marker-outline";
});

const isActionLocked = computed(() => isLoading.value || isUsingCurrentPosition.value);
const isDeviceCenterActive = computed(() => searchCenter.value?.source === "device");

function normalizeLabel(value) {
  if (typeof value !== "string") return null;
  const trimmedValue = value.trim();
  return trimmedValue || null;
}

function createSearchCenter(rawCoordinates, { label = null, source = "map" } = {}) {
  const roundedCoordinates = roundCoordinatesPair(rawCoordinates) ?? roundCoordinatesPair(DEFAULT_USER_LOCATION);

  return {
    ...roundedCoordinates,
    label: normalizeLabel(label),
    source,
  };
}

function formatCenterLabel(center) {
  const explicitLabel = normalizeLabel(center?.label);
  if (explicitLabel) return explicitLabel;
  if (areCoordinatesEqual(center, DEFAULT_USER_LOCATION)) return DEFAULT_USER_LOCATION.label;
  return formatCoordinatesLabel(center, 4);
}

function syncDraftCenterWithSearchCenter() {
  draftCenter.value = createSearchCenter(searchCenter.value, {
    label: searchCenter.value?.label,
    source: searchCenter.value?.source ?? "map",
  });
}

async function loadSellListings() {
  const currentLoadToken = ++loadToken;
  isLoading.value = true;

  try {
    const fetchedListings = await fetchActiveSellListings({ excludeLoggedUser: true });
    if (currentLoadToken !== loadToken) return;
    sellListings.value = Array.isArray(fetchedListings) ? fetchedListings : [];
  } catch (error) {
    if (currentLoadToken !== loadToken) return;
    sellListings.value = [];
    snackbar.addMessage(error.message || "Errore durante il recupero delle vendite", "error");
  } finally {
    if (currentLoadToken === loadToken) {
      isLoading.value = false;
    }
  }
}

function openListing(listing) {
  if (!listing?.id) return;
  router.push(`/community/offers/${listing.id}`);
}

function handleDraftCenterUpdate(value) {
  if (!isChangingPosition.value) return;

  draftCenter.value = createSearchCenter(value, {
    label: "Posizione selezionata",
    source: "map",
  });
}

function beginPositionChange() {
  if (isActionLocked.value) return;
  syncDraftCenterWithSearchCenter();
  isChangingPosition.value = true;
}

async function applySearchCenter(nextCenter) {
  searchCenter.value = createSearchCenter(nextCenter, {
    label: nextCenter?.label,
    source: nextCenter?.source ?? "map",
  });
  syncDraftCenterWithSearchCenter();
  isChangingPosition.value = false;
  await loadSellListings();
}

async function handlePositionAction() {
  if (isActionLocked.value) return;

  if (!isChangingPosition.value) {
    beginPositionChange();
    return;
  }

  await applySearchCenter(draftCenter.value);
}

async function handleRadiusChange(radiusMeters) {
  const nextOption = RADIUS_OPTIONS.find((option) => option.value === radiusMeters);
  if (!nextOption) return;
  if (isActionLocked.value) return;
  if (nextOption.value === selectedRadiusMeters.value && !isChangingPosition.value) return;

  selectedRadiusMeters.value = nextOption.value;

  if (isChangingPosition.value) {
    await applySearchCenter(draftCenter.value);
    return;
  }

  await loadSellListings();
}

function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator?.geolocation) {
      reject(new Error("Geolocalizzazione non disponibile su questo dispositivo"));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (error) => {
        reject(new Error(error?.message || "Impossibile recuperare la posizione attuale"));
      },
      {
        enableHighAccuracy: true,
        timeout: 12_000,
        maximumAge: 0,
      },
    );
  });
}

async function handleUseCurrentPosition() {
  if (isActionLocked.value) return;

  isUsingCurrentPosition.value = true;

  try {
    const currentPosition = await getCurrentPosition();

    searchCenter.value = createSearchCenter(currentPosition, {
      label: "Posizione attuale",
      source: "device",
    });
    syncDraftCenterWithSearchCenter();
    isChangingPosition.value = false;
    await loadSellListings();
  } catch (error) {
    snackbar.addMessage(error.message || "Impossibile recuperare la posizione attuale", "error");
  } finally {
    isUsingCurrentPosition.value = false;
  }
}

onMounted(() => {
  void refreshPendingPurchaseOffersCount();
  syncDraftCenterWithSearchCenter();
  void loadSellListings();
});
</script>

<template>
  <section class="relative h-full">
    <Toolbar label="Compra Carte" fixed>
      <template #info>
        <TabsRouteTabs :tabs="sectionTabs" />
      </template>
    </Toolbar>

    <div class="buy-cards-map-page">
      <div class="buy-cards-map-page__map-shell">
        <CommunitySellListingsMap
          :listings="sellListings"
          :center="activeMapCenter"
          :center-label="centerMarkerLabel"
          :show-center-marker="!isChangingPosition"
          :selection-coordinates="isChangingPosition ? draftCenter : null"
          :allow-center-selection="isChangingPosition"
          :selection-draggable="isChangingPosition"
          :radius-meters="selectedRadiusMeters"
          :loading="isLoading"
          :min-height="520"
          :empty-message="emptyMessage"
          @update:selection-coordinates="handleDraftCenterUpdate"
          @listing-click="openListing"
        />
      </div>
    </div>

    <MobileFloatMenu :cols="3">
      <template #buttons>
        <ButtonMenu
          :icon="positionButtonIcon"
          :label="positionButtonLabel"
          transition
          :delay="100"
          :disabled="isActionLocked"
          :icon-color="isChangingPosition ? 'green' : null"
          @click="handlePositionAction"
        />

        <ButtonMenu
          :icon="selectedRadiusOption.icon"
          label="Raggio"
          multi
          transition
          :delay="150"
          :disabled="isActionLocked"
          :icon-color="selectedRadiusMeters !== BUY_LISTINGS_RADIUS_METERS ? 'blue' : null"
        >
          <template #buttons>
            <ButtonMenu
              v-for="radiusOption in RADIUS_OPTIONS"
              :key="radiusOption.value"
              :icon="radiusOption.icon"
              :label="radiusOption.label"
              transition
              :icon-color="selectedRadiusMeters === radiusOption.value ? 'orange' : null"
              @click="handleRadiusChange(radiusOption.value)"
            />
          </template>
        </ButtonMenu>

        <ButtonMenu
          icon="mdi:crosshairs-gps"
          label="Mia pos."
          transition
          :delay="200"
          :disabled="isActionLocked"
          :icon-color="isDeviceCenterActive ? 'blue' : null"
          @click="handleUseCurrentPosition"
        />
      </template>
    </MobileFloatMenu>
  </section>
</template>

<style scoped>
.buy-cards-map-page {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
  min-height: 0;
  height: 100%;
  padding: 0.35rem 0.75rem 0.75rem;
}

.buy-cards-map-page__summary {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.9rem;
}

.buy-cards-map-page__summary-copy {
  display: grid;
  gap: 0.22rem;
}

.buy-cards-map-page__summary-title,
.buy-cards-map-page__summary-subtitle {
  margin: 0;
}

.buy-cards-map-page__summary-title {
  color: rgba(255, 245, 235, 0.98);
  font-size: 1rem;
  font-weight: 800;
}

.buy-cards-map-page__summary-subtitle {
  color: rgba(226, 232, 240, 0.8);
  font-size: 0.82rem;
  line-height: 1.45;
}

.buy-cards-map-page__count-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 4.7rem;
  border-radius: 0.75rem;
  background: rgba(255, 170, 20, 0.96);
  color: rgba(36, 15, 0, 0.96);
  font-size: 0.75rem;
  font-weight: 900;
  letter-spacing: 0.01em;
  padding: 0.44rem 0.7rem;
}

.buy-cards-map-page__map-shell {
  min-height: 0;
  flex: 1;
}
</style>
