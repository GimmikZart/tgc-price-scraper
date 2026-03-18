<script setup>
import BaseTabs from "@/components/Tabs/BaseTabs.vue";
import {
  GHOST_INACTIVE_TAB_CLASS,
  ORANGE_ACTIVE_TAB_CLASS,
} from "@/components/Tabs/styles";
import { useGeoapify } from "@/composables/useGeoapify";
import {
  DEFAULT_USER_LOCATION,
  formatCoordinatesLabel,
  normalizeCoordinates,
  roundCoordinatesPair,
} from "@/utilities/geo";

const props = defineProps({
  modelValue: {
    type: Object,
    default: null,
  },
});

const emit = defineEmits(["update:modelValue"]);

const geoapify = useGeoapify();

const ADDRESS_TAB = "address";
const MAP_TAB = "map";
const POSITION_TAB = "position";
const LOCATION_TABS = Object.freeze([
  { label: "Indirizzo", value: ADDRESS_TAB },
  { label: "Mappa", value: MAP_TAB },
  { label: "Posizione", value: POSITION_TAB },
]);

const activeTab = ref(ADDRESS_TAB);
const addressInput = ref("");
const addressSuggestions = ref([]);
const isLoadingSuggestions = ref(false);
const isUsingCurrentPosition = ref(false);
const isResolvingAddress = ref(false);
const helperMessage = ref("");

let autocompleteTimer = null;
let reverseLookupToken = 0;

const selectedCoordinates = computed(() => normalizeCoordinates(props.modelValue));
const hasSelectedLocation = computed(() => Boolean(selectedCoordinates.value));
const isCurrentPositionSelected = computed(() => props.modelValue?.source === POSITION_TAB);
const resolvedLocationLabel = computed(() => {
  const value = typeof props.modelValue?.label === "string" ? props.modelValue.label.trim() : "";
  if (value) return value;
  if (isCurrentPositionSelected.value) return "Posizione attuale inserita per la vendita";
  return hasSelectedLocation.value
    ? `Coordinate selezionate: ${formatCoordinatesLabel(selectedCoordinates.value)}`
    : "";
});
const mapSelectionModel = computed({
  get() {
    return selectedCoordinates.value;
  },
  set(value) {
    if (!value) return;
    void commitCoordinates(value, { source: MAP_TAB });
  },
});

function clearAutocompleteTimer() {
  if (!autocompleteTimer) return;
  clearTimeout(autocompleteTimer);
  autocompleteTimer = null;
}

function syncAddressInputFromModel() {
  if (!props.modelValue) {
    addressInput.value = "";
    return;
  }

  const nextLabel = typeof props.modelValue?.label === "string"
    ? props.modelValue.label.trim()
    : "";

  if (nextLabel) {
    addressInput.value = nextLabel;
    return;
  }

  if (!selectedCoordinates.value) {
    addressInput.value = "";
  }
}

function emitLocation(nextValue) {
  emit("update:modelValue", nextValue);
}

async function resolveAddressFromCoordinates(coordinates) {
  if (!geoapify.isConfigured.value) return null;

  reverseLookupToken += 1;
  const currentToken = reverseLookupToken;
  isResolvingAddress.value = true;

  try {
    const result = await geoapify.reverseGeocode(coordinates.lat, coordinates.lng);
    if (currentToken !== reverseLookupToken) return null;
    return result;
  } catch (error) {
    if (currentToken !== reverseLookupToken) return null;
    helperMessage.value = error?.data?.statusMessage || error?.message || "Impossibile risolvere l'indirizzo";
    return null;
  } finally {
    if (currentToken === reverseLookupToken) {
      isResolvingAddress.value = false;
    }
  }
}

async function commitCoordinates(rawCoordinates, { source, label = null } = {}) {
  const coordinates = roundCoordinatesPair(rawCoordinates);
  if (!coordinates) return;

  helperMessage.value = "";

  let resolvedLabel = typeof label === "string" ? label.trim() : "";
  if (!resolvedLabel) {
    const reverseResult = await resolveAddressFromCoordinates(coordinates);
    resolvedLabel = reverseResult?.formatted ?? reverseResult?.label ?? "";
  }

  emitLocation({
    latitude: coordinates.lat,
    longitude: coordinates.lng,
    label: resolvedLabel || null,
    source,
  });

  if (resolvedLabel) {
    addressInput.value = resolvedLabel;
  }
}

async function loadAddressSuggestions() {
  const searchText = typeof addressInput.value === "string" ? addressInput.value.trim() : "";
  helperMessage.value = "";

  if (searchText.length < 3) {
    addressSuggestions.value = [];
    isLoadingSuggestions.value = false;
    return;
  }

  isLoadingSuggestions.value = true;

  try {
    addressSuggestions.value = await geoapify.fetchAddressSuggestions(searchText, { limit: 5 });
  } catch (error) {
    addressSuggestions.value = [];
    helperMessage.value = error?.data?.statusMessage || error?.message || "Errore durante l'autocomplete";
  } finally {
    isLoadingSuggestions.value = false;
  }
}

function handleAddressInput(value) {
  addressInput.value = typeof value === "string" ? value : "";
  helperMessage.value = "";
  clearAutocompleteTimer();

  autocompleteTimer = setTimeout(() => {
    void loadAddressSuggestions();
  }, 280);
}

async function handleAddressSelection(suggestion) {
  clearAutocompleteTimer();
  addressSuggestions.value = [];

  await commitCoordinates(
    {
      lat: suggestion?.lat,
      lng: suggestion?.lng,
    },
    {
      source: ADDRESS_TAB,
      label: suggestion?.formatted ?? suggestion?.label ?? "",
    },
  );
}

async function handleUseCurrentPosition() {
  if (isUsingCurrentPosition.value) return;

  if (typeof navigator === "undefined" || !navigator?.geolocation) {
    helperMessage.value = "Geolocalizzazione non disponibile su questo dispositivo";
    return;
  }

  helperMessage.value = "";
  isUsingCurrentPosition.value = true;

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      try {
        await commitCoordinates(
          {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          },
          {
            source: POSITION_TAB,
          },
        );
      } finally {
        isUsingCurrentPosition.value = false;
      }
    },
    (error) => {
      isUsingCurrentPosition.value = false;
      helperMessage.value = error?.message || "Impossibile recuperare la posizione attuale";
    },
    {
      enableHighAccuracy: true,
      timeout: 12000,
      maximumAge: 0,
    },
  );
}

watch(
  () => props.modelValue,
  () => {
    syncAddressInputFromModel();
  },
  { immediate: true, deep: true },
);

watch(activeTab, (nextTab) => {
  if (nextTab === ADDRESS_TAB) return;
  addressSuggestions.value = [];
});

onBeforeUnmount(() => {
  clearAutocompleteTimer();
});
</script>

<template>
  <section class="sell-location-picker">
    <div class="sell-location-picker__header">
      <div>
        <p class="sell-location-picker__title">Luogo di vendita</p>
        <p class="sell-location-picker__subtitle">Scegli un indirizzo, una posizione su mappa o la tua posizione attuale.</p>
      </div>

      <v-chip
        v-if="hasSelectedLocation"
        size="small"
        color="green"
        variant="flat"
        label
      >
        Luogo pronto
      </v-chip>
    </div>

    <BaseTabs
      :tabs="LOCATION_TABS"
      :active="activeTab"
      :active-class="ORANGE_ACTIVE_TAB_CLASS"
      :inactive-class="GHOST_INACTIVE_TAB_CLASS"
      @change="activeTab = $event"
    />

    <div class="sell-location-picker__content">
      <template v-if="activeTab === ADDRESS_TAB">
        <div class="relative">
          <InputTextField
            :model-value="addressInput"
            label="Indirizzo"
            placeholder="Es. Via Farini 12, Parma"
            clearable
            autocomplete="off"
            @update:model-value="handleAddressInput"
          />

          <div
            v-if="isLoadingSuggestions || addressSuggestions.length > 0"
            class="sell-location-picker__suggestions"
          >
            <p v-if="isLoadingSuggestions" class="sell-location-picker__suggestion-state">
              Ricerca indirizzi in corso...
            </p>

            <button
              v-for="suggestion in addressSuggestions"
              :key="suggestion.id"
              type="button"
              class="sell-location-picker__suggestion"
              @click="handleAddressSelection(suggestion)"
            >
              <span class="sell-location-picker__suggestion-label">
                {{ suggestion.formatted ?? suggestion.label }}
              </span>
              <span class="sell-location-picker__suggestion-meta">
                {{ formatCoordinatesLabel(suggestion) }}
              </span>
            </button>
          </div>
        </div>

        <p class="sell-location-picker__helper">
          Selezionando un indirizzo verranno salvate automaticamente le coordinate della vendita.
        </p>
      </template>

      <template v-else-if="activeTab === MAP_TAB">
        <p class="sell-location-picker__helper">
          Tocca la mappa per inserire il marcatore, poi trascinalo per rifinire la posizione.
        </p>

        <div class="sell-location-picker__map-shell">
          <MapLeafletMap
            v-model="mapSelectionModel"
            :center="selectedCoordinates ?? DEFAULT_USER_LOCATION"
            :zoom="selectedCoordinates ? 15 : 13"
            :allow-set-marker="true"
            :selected-marker-draggable="true"
            :show-selected-marker="true"
            :min-height="320"
          />
        </div>
      </template>

      <template v-else>
        <div class="sell-location-picker__position-shell">
          <v-btn
            block
            color="orange"
            variant="flat"
            :loading="isUsingCurrentPosition"
            :disabled="isUsingCurrentPosition"
            class="sell-location-picker__position-btn"
            @click="handleUseCurrentPosition"
          >
            Usa la mia posizione attuale
          </v-btn>

          <div
            v-if="isCurrentPositionSelected"
            class="sell-location-picker__position-badge"
          >
            Posizione attuale inserita per la vendita
          </div>
        </div>
      </template>

      <div
        v-if="resolvedLocationLabel || isResolvingAddress || helperMessage"
        class="sell-location-picker__status"
      >
        <p v-if="isResolvingAddress" class="sell-location-picker__status-line">
          Risoluzione indirizzo in corso...
        </p>

        <p v-else-if="resolvedLocationLabel" class="sell-location-picker__status-line">
          {{ resolvedLocationLabel }}
        </p>

        <p
          v-if="hasSelectedLocation"
          class="sell-location-picker__status-coordinates"
        >
          {{ formatCoordinatesLabel(selectedCoordinates) }}
        </p>

        <p
          v-if="helperMessage"
          class="sell-location-picker__status-line sell-location-picker__status-line--warning"
        >
          {{ helperMessage }}
        </p>
      </div>
    </div>
  </section>
</template>

<style scoped>
.sell-location-picker {
  display: grid;
  gap: 0.9rem;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 1.1rem;
  background:
    radial-gradient(circle at top right, rgba(255, 122, 24, 0.12), transparent 38%),
    linear-gradient(140deg, rgba(11, 18, 32, 0.96), rgba(7, 11, 18, 0.98));
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.08),
    0 18px 32px rgba(0, 0, 0, 0.22);
  padding: 0.95rem;
}

.sell-location-picker__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.8rem;
}

.sell-location-picker__title {
  margin: 0;
  color: rgba(255, 245, 235, 0.98);
  font-size: 0.98rem;
  font-weight: 800;
}

.sell-location-picker__subtitle {
  margin: 0.24rem 0 0;
  color: rgba(226, 232, 240, 0.76);
  font-size: 0.79rem;
  line-height: 1.45;
}

.sell-location-picker__content {
  display: grid;
  gap: 0.8rem;
}

.sell-location-picker__suggestions {
  position: absolute;
  z-index: 15;
  top: calc(100% + 0.45rem);
  left: 0;
  right: 0;
  display: grid;
  gap: 0.35rem;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 1rem;
  background: rgba(6, 10, 16, 0.98);
  box-shadow: 0 18px 36px rgba(0, 0, 0, 0.45);
  padding: 0.5rem;
}

.sell-location-picker__suggestion-state,
.sell-location-picker__helper,
.sell-location-picker__status-line,
.sell-location-picker__status-coordinates {
  margin: 0;
}

.sell-location-picker__suggestion-state,
.sell-location-picker__helper,
.sell-location-picker__status-line {
  color: rgba(226, 232, 240, 0.8);
  font-size: 0.8rem;
  line-height: 1.45;
}

.sell-location-picker__suggestion {
  display: grid;
  gap: 0.18rem;
  text-align: left;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 0.85rem;
  background: rgba(255, 255, 255, 0.03);
  padding: 0.65rem 0.7rem;
  transition:
    border-color 160ms ease,
    background-color 160ms ease,
    transform 160ms ease;
}

.sell-location-picker__suggestion:hover {
  border-color: rgba(255, 183, 124, 0.32);
  background: rgba(255, 122, 24, 0.1);
  transform: translateY(-1px);
}

.sell-location-picker__suggestion-label {
  color: rgba(255, 245, 235, 0.98);
  font-size: 0.85rem;
  font-weight: 700;
  line-height: 1.35;
}

.sell-location-picker__suggestion-meta,
.sell-location-picker__status-coordinates {
  color: rgba(148, 163, 184, 0.9);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.02em;
}

.sell-location-picker__map-shell {
  min-height: 320px;
  height: 320px;
}

.sell-location-picker__position-shell {
  display: grid;
  gap: 0.7rem;
}

.sell-location-picker__position-btn {
  color: #fff7f0 !important;
  font-weight: 800 !important;
  letter-spacing: 0.01em !important;
  text-transform: none !important;
}

.sell-location-picker__position-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: fit-content;
  border: 1px solid rgba(74, 222, 128, 0.32);
  border-radius: 999px;
  background: rgba(22, 163, 74, 0.16);
  color: rgba(220, 252, 231, 0.96);
  font-size: 0.77rem;
  font-weight: 800;
  padding: 0.46rem 0.8rem;
}

.sell-location-picker__status {
  display: grid;
  gap: 0.16rem;
  border-radius: 0.95rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.04);
  padding: 0.72rem 0.82rem;
}

.sell-location-picker__status-line--warning {
  color: rgba(253, 224, 71, 0.92);
}
</style>
