<script setup>
import { useGeoapify } from "@/composables/useGeoapify";
import { useMyBreakpoints } from "@/composables/useMyBreakpoints";
import {
  DEFAULT_USER_LOCATION,
  areCoordinatesEqual,
  normalizeCoordinates,
  roundCoordinatesPair,
} from "@/utilities/geo";

const props = defineProps({
  modelValue: {
    type: Object,
    default: null,
  },
  eyebrow: {
    type: String,
    default: "",
  },
  title: {
    type: String,
    default: "Seleziona posizione",
  },
  description: {
    type: String,
    default: "",
  },
  searchPlaceholder: {
    type: String,
    default: "Cerca indirizzo",
  },
  currentPositionLabel: {
    type: String,
    default: "Mia posizione",
  },
  currentPositionLoadingLabel: {
    type: String,
    default: "Posizione...",
  },
  readyLabel: {
    type: String,
    default: "Posizione pronta",
  },
  invalid: {
    type: Boolean,
    default: false,
  },
  invalidMessage: {
    type: String,
    default: "Seleziona una posizione.",
  },
  maxPanelWidth: {
    type: String,
    default: "20.75rem",
  },
  autoUseCurrentPosition: {
    type: Boolean,
    default: true,
  },
});

const emit = defineEmits(["update:modelValue", "interact"]);

const geoapify = useGeoapify();
const { isMobile } = useMyBreakpoints();

const addressInput = ref("");
const addressSuggestions = ref([]);
const isLoadingSuggestions = ref(false);
const isResolvingAddress = ref(false);
const isUsingCurrentPosition = ref(false);
const helperMessage = ref("");
const helperTone = ref("neutral");
const isSearchAccordionOpen = ref(false);
const hasAttemptedAutoLocation = ref(false);

let autocompleteTimer = null;
let reverseLookupToken = 0;
let isDisposed = false;

const selectedCoordinates = computed(() => normalizeCoordinates(props.modelValue));
const hasSelectedLocation = computed(() => Boolean(selectedCoordinates.value));
const explicitLocationLabel = computed(() => {
  const explicitLabel = typeof props.modelValue?.label === "string"
    ? props.modelValue.label.trim()
    : "";

  if (explicitLabel) return explicitLabel;
  return "";
});
const currentAddressLabel = computed(() => {
  if (explicitLocationLabel.value) return explicitLocationLabel.value;
  if (isUsingCurrentPosition.value || isResolvingAddress.value) return "Recupero indirizzo...";
  if (hasSelectedLocation.value) return "Indirizzo selezionato";
  return "Posizione attuale non disponibile";
});
const showStatus = computed(() => {
  return Boolean(helperMessage.value || props.invalid);
});
const statusClass = computed(() => {
  if (props.invalid) return "location-wizard-step__status--error";
  if (helperTone.value === "error") return "location-wizard-step__status--error";
  if (helperTone.value === "warning") return "location-wizard-step__status--warning";
  return "";
});
const panelStyle = computed(() => ({
  "--location-wizard-panel-width": props.maxPanelWidth,
}));
const currentAddressClass = computed(() => (
  explicitLocationLabel.value
    ? ""
    : "location-wizard-step__current-address--placeholder"
));

const mapSelectionModel = computed({
  get() {
    return selectedCoordinates.value;
  },
  set(value) {
    if (!value) return;
    markInteracted();
    closeSearchAccordion();
    void commitCoordinates(value, { source: "map" });
  },
});

function markInteracted() {
  emit("interact");
}

function emitLocation(nextValue) {
  emit("update:modelValue", nextValue);
}

function closeSearchAccordion() {
  isSearchAccordionOpen.value = false;
  addressSuggestions.value = [];
}

function toggleSearchAccordion() {
  isSearchAccordionOpen.value = !isSearchAccordionOpen.value;

  if (!isSearchAccordionOpen.value) {
    clearAutocompleteTimer();
    addressSuggestions.value = [];
  }
}

function clearAutocompleteTimer() {
  if (!autocompleteTimer) return;
  clearTimeout(autocompleteTimer);
  autocompleteTimer = null;
}

function syncAddressInputFromModel() {
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

async function resolveAddressFromCoordinates(coordinates) {
  if (isDisposed || !geoapify.isConfigured.value) return null;

  reverseLookupToken += 1;
  const currentToken = reverseLookupToken;
  isResolvingAddress.value = true;

  try {
    const result = await geoapify.reverseGeocode(coordinates.lat, coordinates.lng);
    if (isDisposed || currentToken !== reverseLookupToken) return null;
    return result;
  } catch (error) {
    if (!isDisposed && currentToken === reverseLookupToken) {
      helperMessage.value = error?.data?.statusMessage || error?.message || "Posizione salvata, ma indirizzo non risolto.";
      helperTone.value = "warning";
    }
    return null;
  } finally {
    if (!isDisposed && currentToken === reverseLookupToken) {
      isResolvingAddress.value = false;
    }
  }
}

async function commitCoordinates(rawCoordinates, { source = null, label = "" } = {}) {
  const coordinates = roundCoordinatesPair(rawCoordinates);
  if (!coordinates || isDisposed) return;

  helperMessage.value = "";
  helperTone.value = "neutral";

  let resolvedLabel = String(label ?? "").trim();
  emitLocation({
    latitude: coordinates.lat,
    longitude: coordinates.lng,
    label: resolvedLabel || null,
    source,
  });

  if (resolvedLabel) {
    addressInput.value = resolvedLabel;
  } else if (source !== "address") {
    addressInput.value = "";
  }

  if (!resolvedLabel) {
    const reverseResult = await resolveAddressFromCoordinates(coordinates);
    if (isDisposed) return;
    resolvedLabel = reverseResult?.formatted ?? reverseResult?.label ?? "";
  }

  if (!resolvedLabel) return;

  const currentCoordinates = normalizeCoordinates(props.modelValue) ?? coordinates;
  if (!areCoordinatesEqual(currentCoordinates, coordinates)) return;

  emitLocation({
    latitude: coordinates.lat,
    longitude: coordinates.lng,
    label: resolvedLabel,
    source,
  });

  addressInput.value = resolvedLabel;
}

async function loadAddressSuggestions() {
  const searchText = String(addressInput.value ?? "").trim();
  if (searchText.length < 3) {
    addressSuggestions.value = [];
    isLoadingSuggestions.value = false;
    return;
  }

  if (!geoapify.isConfigured.value) {
    addressSuggestions.value = [];
    isLoadingSuggestions.value = false;
    helperMessage.value = "Autocomplete non disponibile: configura Geoapify.";
    helperTone.value = "warning";
    return;
  }

  isLoadingSuggestions.value = true;

  try {
    addressSuggestions.value = await geoapify.fetchAddressSuggestions(searchText, { limit: 5 });
    helperMessage.value = "";
    helperTone.value = "neutral";
  } catch (error) {
    addressSuggestions.value = [];
    helperMessage.value = error?.data?.statusMessage || error?.message || "Errore durante la ricerca indirizzo.";
    helperTone.value = "error";
  } finally {
    isLoadingSuggestions.value = false;
  }
}

function handleAddressInput(value) {
  markInteracted();
  addressInput.value = String(value ?? "");
  clearAutocompleteTimer();

  if (String(addressInput.value ?? "").trim().length < 3) {
    addressSuggestions.value = [];
    return;
  }

  autocompleteTimer = setTimeout(() => {
    void loadAddressSuggestions();
  }, 260);
}

async function handleAddressSelection(suggestion) {
  markInteracted();
  clearAutocompleteTimer();
  closeSearchAccordion();

  await commitCoordinates(
    { lat: suggestion?.lat, lng: suggestion?.lng },
    { source: "address", label: suggestion?.formatted ?? suggestion?.label ?? "" },
  );
}

async function handleManualAddressSubmit() {
  markInteracted();
  clearAutocompleteTimer();

  const searchText = String(addressInput.value ?? "").trim();
  if (searchText.length < 3) {
    helperMessage.value = "Inserisci almeno 3 caratteri per cercare un indirizzo.";
    helperTone.value = "error";
    addressSuggestions.value = [];
    return;
  }

  if (!geoapify.isConfigured.value) {
    helperMessage.value = "Geoapify non configurato: non posso cercare l'indirizzo manualmente.";
    helperTone.value = "error";
    return;
  }

  isLoadingSuggestions.value = true;

  try {
    const results = await geoapify.fetchAddressSuggestions(searchText, { limit: 1 });
    if (!Array.isArray(results) || results.length === 0) {
      helperMessage.value = "Nessun indirizzo trovato. Prova a essere piu specifico.";
      helperTone.value = "error";
      addressSuggestions.value = [];
      return;
    }

    await handleAddressSelection(results[0]);
  } catch (error) {
    helperMessage.value = error?.data?.statusMessage || error?.message || "Errore durante la ricerca indirizzo.";
    helperTone.value = "error";
  } finally {
    isLoadingSuggestions.value = false;
  }
}

function resolveGeolocationErrorMessage(error) {
  if (error?.code === 1) return "Permesso posizione non concesso.";
  if (error?.code === 2) return "Posizione non disponibile in questo momento.";
  if (error?.code === 3) return "Richiesta posizione scaduta.";
  return "Impossibile recuperare la posizione attuale.";
}

async function handleUseCurrentPosition({ markAsInteracted = true, closeAccordionOnStart = true } = {}) {
  if (isDisposed || isUsingCurrentPosition.value) return;

  if (typeof navigator === "undefined" || !navigator?.geolocation) {
    helperMessage.value = "Geolocalizzazione non disponibile su questo dispositivo.";
    helperTone.value = "error";
    return;
  }

  if (markAsInteracted) {
    markInteracted();
  }

  if (closeAccordionOnStart) {
    closeSearchAccordion();
  }

  clearAutocompleteTimer();
  helperMessage.value = "";
  helperTone.value = "neutral";
  isUsingCurrentPosition.value = true;

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      if (isDisposed) return;

      try {
        await commitCoordinates(
          {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          },
          {
            source: "position",
          },
        );
      } catch (error) {
        if (isDisposed) return;
        helperMessage.value = error?.message || "Impossibile usare la posizione attuale.";
        helperTone.value = "error";
      } finally {
        if (isDisposed) return;
        isUsingCurrentPosition.value = false;
      }
    },
    (error) => {
      if (isDisposed) return;
      isUsingCurrentPosition.value = false;
      helperMessage.value = resolveGeolocationErrorMessage(error);
      helperTone.value = "error";
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

watch(
  () => props.invalid,
  (nextValue) => {
    if (!nextValue) return;
    helperTone.value = helperTone.value === "error" ? "error" : helperTone.value;
  },
);

onMounted(() => {
  if (!props.autoUseCurrentPosition || hasSelectedLocation.value || hasAttemptedAutoLocation.value) return;
  hasAttemptedAutoLocation.value = true;
  void handleUseCurrentPosition({
    markAsInteracted: false,
    closeAccordionOnStart: false,
  });
});

onBeforeUnmount(() => {
  isDisposed = true;
  reverseLookupToken += 1;
  clearAutocompleteTimer();
});
</script>

<template>
  <div class="location-wizard-step">
    <div class="location-wizard-step__map-shell">
      <MapLeafletMap
        v-model="mapSelectionModel"
        :center="selectedCoordinates ?? DEFAULT_USER_LOCATION"
        :zoom="selectedCoordinates ? 15 : 13"
        :zoom-control="!isMobile"
        :zoom-control-position="'topright'"
        :allow-set-marker="true"
        :selected-marker-draggable="true"
        :show-selected-marker="true"
        :selected-marker-viewport-anchor-y="0.6"
        :min-height="320"
        class="location-wizard-step__map"
      />

      <div class="location-wizard-step__overlay">
        <div class="location-wizard-step__top">
          <div class="location-wizard-step__panel" :style="panelStyle">
            <div class="location-wizard-step__header">
              <div class="location-wizard-step__headline">
                <div class="location-wizard-step__header-line">
                  <p v-if="eyebrow" class="location-wizard-step__eyebrow">{{ eyebrow }}</p>

                  <v-chip
                    v-if="hasSelectedLocation"
                    size="x-small"
                    color="green"
                    variant="flat"
                    label
                  >
                    {{ readyLabel }}
                  </v-chip>
                </div>

                <p class="location-wizard-step__title">{{ title }}</p>
                <p v-if="description" class="location-wizard-step__description">{{ description }}</p>
                <p class="location-wizard-step__current-address" :class="currentAddressClass">
                  {{ currentAddressLabel }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div class="location-wizard-step__dock">
          <v-expand-transition>
            <div
              v-show="isSearchAccordionOpen"
              class="location-wizard-step__search-shell"
            >
              <div class="location-wizard-step__search-actions">
                <button
                  type="button"
                  class="location-wizard-step__position-button"
                  :disabled="isUsingCurrentPosition"
                  @click="handleUseCurrentPosition"
                >
                  <v-icon size="15">{{ isUsingCurrentPosition ? "mdi-loading mdi-spin" : "mdi-crosshairs-gps" }}</v-icon>
                  <span>{{ isUsingCurrentPosition ? currentPositionLoadingLabel : currentPositionLabel }}</span>
                </button>

                <form class="location-wizard-step__search-form" @submit.prevent="handleManualAddressSubmit">
                  <input
                    :value="addressInput"
                    type="text"
                    :placeholder="searchPlaceholder"
                    class="location-wizard-step__search-field"
                    autocomplete="off"
                    @input="handleAddressInput($event?.target?.value)"
                  >
                  <button
                    type="submit"
                    aria-label="Cerca indirizzo"
                    class="location-wizard-step__search-button"
                  >
                    <v-icon size="17">mdi-magnify</v-icon>
                  </button>
                </form>
              </div>

              <div
                v-if="isLoadingSuggestions || addressSuggestions.length > 0"
                class="location-wizard-step__suggestions"
              >
                <p v-if="isLoadingSuggestions" class="location-wizard-step__suggestion-state">
                  Ricerca indirizzi...
                </p>
                <button
                  v-for="suggestion in addressSuggestions"
                  :key="suggestion.id"
                  type="button"
                  class="location-wizard-step__suggestion"
                  @click="handleAddressSelection(suggestion)"
                >
                  <span class="location-wizard-step__suggestion-label">
                    {{ suggestion.formatted ?? suggestion.label }}
                  </span>
                </button>
              </div>

              <div
                v-if="showStatus"
                class="location-wizard-step__status"
                :class="statusClass"
              >
                <p v-if="helperMessage" class="location-wizard-step__status-line">
                  {{ helperMessage }}
                </p>
                <p v-if="invalid" class="location-wizard-step__status-line location-wizard-step__status-line--error">
                  {{ invalidMessage }}
                </p>
              </div>
            </div>
          </v-expand-transition>

          <button
            type="button"
            class="location-wizard-step__search-trigger"
            :aria-expanded="isSearchAccordionOpen ? 'true' : 'false'"
            @click="toggleSearchAccordion"
          >
            <span>Cerca</span>
            <v-icon size="15">
              {{ isSearchAccordionOpen ? "mdi-chevron-down" : "mdi-chevron-up" }}
            </v-icon>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.location-wizard-step {
  height: 100%;
  min-height: 100%;
}

.location-wizard-step__map-shell {
  position: relative;
  isolation: isolate;
  height: 100%;
  min-height: 100%;
  overflow: hidden;
  border-radius: 1.75rem;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.08),
    0 24px 40px rgba(0, 0, 0, 0.28);
}

.location-wizard-step__map {
  height: 100%;
}

.location-wizard-step__overlay {
  position: absolute;
  inset: 0;
  z-index: 650;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 0.5rem 0.75rem 0.75rem;
  pointer-events: none;
}

.location-wizard-step__top,
.location-wizard-step__dock {
  pointer-events: auto;
}

.location-wizard-step__panel {
  width: 100%;
  max-width: var(--location-wizard-panel-width);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 1.15rem;
  background: linear-gradient(155deg, rgba(6, 9, 15, 0.92), rgba(2, 5, 10, 0.95));
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.08),
    0 14px 22px rgba(0, 0, 0, 0.28);
  padding: 0.75rem 0.8rem;
  backdrop-filter: blur(20px);
}

.location-wizard-step__header {
  display: block;
}

.location-wizard-step__headline {
  min-width: 0;
}

.location-wizard-step__header-line {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.location-wizard-step__eyebrow {
  margin: 0;
  color: #ffb77c;
  font-size: 0.64rem;
  font-weight: 900;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.location-wizard-step__title {
  margin: 0.2rem 0 0;
  color: rgba(248, 250, 252, 0.98);
  font-size: 0.96rem;
  font-weight: 900;
  line-height: 1.15;
}

.location-wizard-step__description {
  margin: 0.2rem 0 0;
  color: rgba(226, 232, 240, 0.82);
  font-size: 0.72rem;
  line-height: 1.35;
}

.location-wizard-step__current-address {
  margin: 0.42rem 0 0;
  color: rgba(248, 250, 252, 0.97);
  font-size: 0.82rem;
  font-weight: 700;
  line-height: 1.4;
}

.location-wizard-step__current-address--placeholder {
  color: rgba(226, 232, 240, 0.76);
}

.location-wizard-step__dock {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.55rem;
  margin-bottom: 1rem;
}

.location-wizard-step__position-button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  width: 100%;
  min-height: 2.15rem;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.05);
  color: rgba(248, 250, 252, 0.96);
  font-size: 0.72rem;
  font-weight: 800;
  padding: 0.45rem 0.75rem;
  transition:
    border-color 160ms ease,
    background-color 160ms ease,
    color 160ms ease;
}

.location-wizard-step__position-button:hover:not(:disabled) {
  border-color: rgba(255, 178, 125, 0.35);
  background: rgba(255, 122, 24, 0.1);
  color: #ffebd8;
}

.location-wizard-step__position-button:disabled {
  cursor: wait;
  opacity: 0.75;
}

.location-wizard-step__search-shell {
  width: min(100%, 24rem);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 1rem;
  background: linear-gradient(160deg, rgba(8, 12, 20, 0.95), rgba(2, 5, 10, 0.98));
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.08),
    0 12px 18px rgba(0, 0, 0, 0.24);
  padding: 0.5rem;
}

.location-wizard-step__search-actions {
  display: grid;
  gap: 0.5rem;
}

.location-wizard-step__search-form {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.location-wizard-step__search-field {
  width: 100%;
  min-height: 2.7rem;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 0.95rem;
  background:
    radial-gradient(circle at top left, rgba(255, 157, 82, 0.1), transparent 34%),
    linear-gradient(140deg, rgba(8, 12, 20, 0.98), rgba(3, 6, 12, 0.98));
  color: rgba(255, 248, 241, 0.98);
  font-size: 0.84rem;
  font-weight: 700;
  padding: 0 0.85rem;
}

.location-wizard-step__search-field::placeholder {
  color: rgba(226, 232, 240, 0.7);
}

.location-wizard-step__search-field:focus {
  outline: none;
  border-color: rgba(255, 157, 82, 0.54);
  box-shadow:
    0 0 0 1px rgba(255, 157, 82, 0.28),
    0 18px 34px rgba(0, 0, 0, 0.28);
}

.location-wizard-step__search-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.7rem;
  height: 2.7rem;
  flex-shrink: 0;
  border: 1px solid rgba(255, 178, 125, 0.35);
  border-radius: 0.95rem;
  background: rgba(255, 122, 24, 0.2);
  color: #ffe0c2;
  box-shadow: 0 0 18px rgba(255, 122, 24, 0.18);
  backdrop-filter: blur(18px);
}

.location-wizard-step__search-trigger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.32rem;
  min-height: 2rem;
  border: 1px solid rgba(255, 178, 125, 0.34);
  border-radius: 999px;
  background: rgba(8, 12, 20, 0.86);
  color: #ffe7d1;
  font-size: 0.74rem;
  font-weight: 800;
  padding: 0.42rem 0.95rem;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.08),
    0 10px 18px rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(16px);
}

.location-wizard-step__search-trigger:hover {
  border-color: rgba(255, 178, 125, 0.46);
  background: rgba(255, 122, 24, 0.16);
}

.location-wizard-step__suggestions {
  display: grid;
  gap: 0.25rem;
  max-height: 18vh;
  overflow-y: auto;
  margin-top: 0.45rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 0.9rem;
  background: rgba(2, 6, 13, 0.88);
  padding: 0.4rem;
}

.location-wizard-step__suggestion-state,
.location-wizard-step__status-line {
  margin: 0;
}

.location-wizard-step__suggestion-state,
.location-wizard-step__status-line {
  color: rgba(226, 232, 240, 0.85);
  font-size: 0.76rem;
  line-height: 1.35;
}

.location-wizard-step__suggestion {
  display: grid;
  gap: 0.18rem;
  text-align: left;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 0.75rem;
  background: rgba(255, 255, 255, 0.05);
  padding: 0.6rem 0.7rem;
  transition:
    border-color 160ms ease,
    background-color 160ms ease;
}

.location-wizard-step__suggestion:hover {
  border-color: rgba(255, 178, 125, 0.3);
  background: rgba(255, 122, 24, 0.1);
}

.location-wizard-step__suggestion-label {
  color: rgba(248, 250, 252, 0.98);
  font-size: 0.8rem;
  font-weight: 800;
  line-height: 1.3;
}

.location-wizard-step__status {
  display: grid;
  gap: 0.2rem;
  margin-top: 0.45rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 0.9rem;
  background: linear-gradient(160deg, rgba(10, 14, 24, 0.9), rgba(3, 6, 12, 0.92));
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.06),
    0 10px 18px rgba(0, 0, 0, 0.22);
  padding: 0.65rem 0.75rem;
}

.location-wizard-step__status--success {
  border-color: rgba(110, 231, 183, 0.28);
}

.location-wizard-step__status--warning {
  border-color: rgba(253, 224, 71, 0.22);
}

.location-wizard-step__status-line--error {
  color: rgba(254, 202, 202, 0.96);
  font-weight: 700;
}

.location-wizard-step__status--error {
  border-color: rgba(252, 165, 165, 0.26);
}
</style>
