<script setup>
import {
  createTournament,
  DEFAULT_TOURNAMENT_GAME,
  TournamentFormat,
  TournamentStatus,
} from "@/api/tournaments";
import TournamentCard from "@/components/Play/TournamentCard.vue";
import TournamentCreateStepper from "@/components/Play/TournamentCreateStepper.vue";
import { useGeoapify } from "@/composables/useGeoapify";
import {
  DEFAULT_USER_LOCATION,
  formatCoordinatesLabel,
  normalizeCoordinates,
  roundCoordinatesPair,
} from "@/utilities/geo";
import {
  TOURNAMENT_FORMAT_OPTIONS,
  getTournamentFormatMeta,
  resolveRoundRobinRounds,
  resolveSingleEliminationRounds,
  resolveSwissRoundsForParticipants,
} from "@/utilities/tournaments";

const CREATE_STEPS = Object.freeze([
  { key: "name", label: "Nome" },
  { key: "format", label: "Tipo" },
  { key: "participants", label: "Partecipanti" },
  { key: "location", label: "Dove" },
  { key: "create", label: "Crea" },
]);

const LAST_STEP_INDEX = CREATE_STEPS.length - 1;

const router = useRouter();
const snackbar = useSnackbar();
const userAuth = useUserAuth();
const geoapify = useGeoapify();

const currentStepIndex = ref(0);
const furthestStepReached = ref(0);
const touchedStepKeys = ref([]);
const isCreatingTournament = ref(false);

const createForm = reactive({
  name: "",
  format: TournamentFormat.SingleElimination,
  game: DEFAULT_TOURNAMENT_GAME,
  maxParticipants: 8,
  location: {
    latitude: null,
    longitude: null,
    label: "",
  },
});

const addressInput = ref("");
const addressSuggestions = ref([]);
const isLoadingSuggestions = ref(false);
const isResolvingAddress = ref(false);
const locationHelperMessage = ref("");
const locationHelperTone = ref("neutral");

let autocompleteTimer = null;
let reverseLookupToken = 0;

const selectedCoordinates = computed(() => normalizeCoordinates({
  lat: createForm.location.latitude,
  lng: createForm.location.longitude,
}));
const selectedFormatMeta = computed(() => getTournamentFormatMeta(createForm.format));
const swissRounds = computed(() => resolveSwissRoundsForParticipants(createForm.maxParticipants));

const isNameValid = computed(() => String(createForm.name ?? "").trim().length > 0);
const isFormatValid = computed(() => Boolean(selectedFormatMeta.value));
const isParticipantsValid = computed(() => {
  const value = Number(createForm.maxParticipants);
  return Number.isInteger(value) && value >= 2 && value <= 2048;
});
const isLocationValid = computed(() => Boolean(selectedCoordinates.value));
const canSubmitTournament = computed(() => (
  isNameValid.value
  && isFormatValid.value
  && isParticipantsValid.value
  && isLocationValid.value
));

const participantsModel = computed({
  get() {
    const parsedValue = Number(createForm.maxParticipants);
    return Number.isInteger(parsedValue) && parsedValue >= 2 ? parsedValue : 8;
  },
  set(value) {
    touchStep("participants");
    const parsedValue = Number(value);
    createForm.maxParticipants = Number.isFinite(parsedValue)
      ? Math.max(2, Math.min(2048, Math.round(parsedValue)))
      : 8;
  },
});

const organizerPreviewProfile = computed(() => {
  const metadata = userAuth.userLogged?.user_metadata ?? {};
  const emailUsername = userAuth.userLogged?.email?.split("@")?.[0] ?? "tu";
  const displayName = metadata.display_name ?? metadata.full_name ?? metadata.name ?? metadata.username ?? emailUsername;
  const username = metadata.username ?? emailUsername;
  const rawUserTag = String(metadata.user_tag ?? username ?? displayName ?? "").trim();

  return {
    display_name: displayName,
    username,
    user_tag: rawUserTag ? (rawUserTag.startsWith("@") ? rawUserTag : `@${rawUserTag}`) : null,
    avatar_url: metadata.avatar_url ?? metadata.picture ?? metadata.photo_url ?? metadata.image_url ?? null,
  };
});

const previewTournament = computed(() => ({
  id: "preview-tournament",
  name: String(createForm.name ?? "").trim() || "Il tuo torneo",
  format: createForm.format,
  game: createForm.game,
  max_participants: participantsModel.value,
  participants_count: 0,
  status: TournamentStatus.Open,
  organizer_profile: organizerPreviewProfile.value,
  latitude: createForm.location.latitude,
  longitude: createForm.location.longitude,
  location_label: String(createForm.location.label ?? "").trim() || null,
}));

const stageFacts = computed(() => {
  if (createForm.format === TournamentFormat.SingleElimination) {
    return [
      `${resolveSingleEliminationRounds(createForm.maxParticipants)} round massimi`,
      "Pareggi non consentiti",
      "Bracket con bye automatici",
    ];
  }

  if (createForm.format === TournamentFormat.Swiss) {
    return [
      `${swissRounds.value} round previsti`,
      "Pairing per classifica",
      "Pareggi consentiti",
    ];
  }

  return [
    `${resolveRoundRobinRounds(createForm.maxParticipants)} round previsti`,
    "Tutti contro tutti",
    "Pareggi consentiti",
  ];
});

const locationStatusLabel = computed(() => {
  const explicitLabel = String(createForm.location.label ?? "").trim();
  if (explicitLabel) return explicitLabel;
  if (selectedCoordinates.value) return `Coordinate selezionate: ${formatCoordinatesLabel(selectedCoordinates.value, 5)}`;
  return "";
});

const stepperSteps = computed(() => {
  return CREATE_STEPS.map((step, index) => ({
    ...step,
    state: resolveStepState(step.key, index),
  }));
});

const canGoBack = computed(() => currentStepIndex.value > 0);
const canGoNext = computed(() => currentStepIndex.value < LAST_STEP_INDEX && isStepValid(CREATE_STEPS[currentStepIndex.value]?.key));

function hasTouchedStep(stepKey) {
  return touchedStepKeys.value.includes(stepKey);
}

function touchStep(stepKey) {
  if (!stepKey || hasTouchedStep(stepKey)) return;
  touchedStepKeys.value = [...touchedStepKeys.value, stepKey];
}

function isStepValid(stepKey) {
  if (stepKey === "name") return isNameValid.value;
  if (stepKey === "format") return isFormatValid.value;
  if (stepKey === "participants") return isParticipantsValid.value;
  if (stepKey === "location") return isLocationValid.value;
  if (stepKey === "create") return canSubmitTournament.value;
  return false;
}

function resolveStepState(stepKey, index) {
  const isCurrentStep = index === currentStepIndex.value;
  const isCompletedBefore = index < furthestStepReached.value;
  const hasError = !isStepValid(stepKey) && (isCompletedBefore || hasTouchedStep(stepKey));

  if (stepKey === "create") {
    if (isCurrentStep && canSubmitTournament.value) return "complete";
    return hasError ? "error" : "pending";
  }

  if (isStepValid(stepKey) && (isCurrentStep || isCompletedBefore)) {
    return "complete";
  }

  return hasError ? "error" : "pending";
}

function moveToStep(nextIndex) {
  const boundedIndex = Math.max(0, Math.min(LAST_STEP_INDEX, Number(nextIndex) || 0));
  currentStepIndex.value = boundedIndex;
  furthestStepReached.value = Math.max(furthestStepReached.value, boundedIndex);
}

function handleGoBack() {
  if (canGoBack.value) {
    currentStepIndex.value -= 1;
  }
}

function handleGoNext() {
  const currentStepKey = CREATE_STEPS[currentStepIndex.value]?.key;
  if (!isStepValid(currentStepKey)) {
    touchStep(currentStepKey);
    return;
  }

  moveToStep(currentStepIndex.value + 1);
}

function clearAutocompleteTimer() {
  if (!autocompleteTimer) return;
  clearTimeout(autocompleteTimer);
  autocompleteTimer = null;
}

function syncAddressInput() {
  const label = String(createForm.location.label ?? "").trim();
  if (label) {
    addressInput.value = label;
    return;
  }

  addressInput.value = selectedCoordinates.value
    ? formatCoordinatesLabel(selectedCoordinates.value, 5)
    : "";
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
    if (currentToken === reverseLookupToken) {
      locationHelperMessage.value = error?.data?.statusMessage || error?.message || "Posizione salvata, ma indirizzo non risolto.";
      locationHelperTone.value = "warning";
    }
    return null;
  } finally {
    if (currentToken === reverseLookupToken) {
      isResolvingAddress.value = false;
    }
  }
}

async function commitCoordinates(rawCoordinates, { label = "" } = {}) {
  const coordinates = roundCoordinatesPair(rawCoordinates);
  if (!coordinates) return;

  locationHelperMessage.value = "";
  locationHelperTone.value = "neutral";
  createForm.location.latitude = coordinates.lat;
  createForm.location.longitude = coordinates.lng;

  let resolvedLabel = String(label ?? "").trim();
  if (!resolvedLabel) {
    const reverseResult = await resolveAddressFromCoordinates(coordinates);
    resolvedLabel = reverseResult?.formatted ?? reverseResult?.label ?? "";
  }

  createForm.location.label = resolvedLabel;
  syncAddressInput();
}

const mapSelectionModel = computed({
  get() {
    return selectedCoordinates.value;
  },
  set(value) {
    if (!value) return;
    touchStep("location");
    addressSuggestions.value = [];
    void commitCoordinates(value);
  },
});

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
    locationHelperMessage.value = "Autocomplete non disponibile: configura Geoapify.";
    locationHelperTone.value = "warning";
    return;
  }

  isLoadingSuggestions.value = true;

  try {
    addressSuggestions.value = await geoapify.fetchAddressSuggestions(searchText, { limit: 5 });
    locationHelperMessage.value = "";
    locationHelperTone.value = "neutral";
  } catch (error) {
    addressSuggestions.value = [];
    locationHelperMessage.value = error?.data?.statusMessage || error?.message || "Errore durante la ricerca indirizzo.";
    locationHelperTone.value = "error";
  } finally {
    isLoadingSuggestions.value = false;
  }
}

function handleAddressInput(event) {
  touchStep("location");
  addressInput.value = String(event?.target?.value ?? "");
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
  touchStep("location");
  clearAutocompleteTimer();
  addressSuggestions.value = [];

  await commitCoordinates(
    { lat: suggestion?.lat, lng: suggestion?.lng },
    { label: suggestion?.formatted ?? suggestion?.label ?? "" },
  );
}

async function handleManualAddressSubmit() {
  touchStep("location");
  clearAutocompleteTimer();

  const searchText = String(addressInput.value ?? "").trim();
  if (searchText.length < 3) {
    locationHelperMessage.value = "Inserisci almeno 3 caratteri per cercare un indirizzo.";
    locationHelperTone.value = "error";
    addressSuggestions.value = [];
    return;
  }

  if (!geoapify.isConfigured.value) {
    locationHelperMessage.value = "Geoapify non configurato: non posso cercare l'indirizzo manualmente.";
    locationHelperTone.value = "error";
    return;
  }

  isLoadingSuggestions.value = true;

  try {
    const results = await geoapify.fetchAddressSuggestions(searchText, { limit: 1 });
    if (!Array.isArray(results) || results.length === 0) {
      locationHelperMessage.value = "Nessun indirizzo trovato. Prova a essere piu specifico.";
      locationHelperTone.value = "error";
      addressSuggestions.value = [];
      return;
    }

    await handleAddressSelection(results[0]);
  } catch (error) {
    locationHelperMessage.value = error?.data?.statusMessage || error?.message || "Errore durante la ricerca indirizzo.";
    locationHelperTone.value = "error";
  } finally {
    isLoadingSuggestions.value = false;
  }
}

async function handleCreateTournament() {
  if (isCreatingTournament.value) return;

  if (!canSubmitTournament.value) {
    const firstInvalidIndex = CREATE_STEPS.findIndex((step) => !isStepValid(step.key));
    if (firstInvalidIndex >= 0) {
      touchStep(CREATE_STEPS[firstInvalidIndex].key);
      currentStepIndex.value = firstInvalidIndex;
    }
    return;
  }

  isCreatingTournament.value = true;

  try {
    const settings = {};
    if (createForm.format === TournamentFormat.Swiss) {
      settings.rounds = swissRounds.value;
    }

    const createdTournament = await createTournament({
      name: String(createForm.name ?? "").trim(),
      format: createForm.format,
      game: createForm.game,
      maxParticipants: participantsModel.value,
      status: TournamentStatus.Open,
      settings,
      latitude: createForm.location.latitude,
      longitude: createForm.location.longitude,
      locationLabel: String(createForm.location.label ?? "").trim() || null,
    });

    snackbar.addMessage("Torneo creato correttamente", "success");
    await router.push(createdTournament?.id ? `/play/tournaments/${createdTournament.id}` : "/play/tournaments");
  } catch (error) {
    snackbar.addMessage(error?.message || "Errore durante la creazione del torneo", "error");
  } finally {
    isCreatingTournament.value = false;
  }
}

onBeforeUnmount(() => {
  clearAutocompleteTimer();
});

definePageMeta({
  middleware: "auth",
  ssr: false,
});
</script>

<template>
  <section class="relative flex h-full min-h-0 flex-col overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(255,122,24,0.22),_transparent_26%),radial-gradient(circle_at_82%_12%,_rgba(56,189,248,0.12),_transparent_22%),linear-gradient(180deg,_rgba(8,12,20,0.98),_rgba(3,6,13,1))]">
    <Toolbar label="Crea torneo" fixed back-button>
      <template #info>
        <TournamentCreateStepper :steps="stepperSteps" :active-step="currentStepIndex" />
      </template>
    </Toolbar>

    <div class="relative min-h-0 flex-1 overflow-hidden">
      <div class="tournament-create-track" :style="{ transform: `translateX(-${currentStepIndex * 100}%)` }">
        <section class="tournament-create-pane bg-[radial-gradient(circle_at_20%_22%,_rgba(255,122,24,0.12),_transparent_28%)] px-4 pb-28 pt-4">
          <div class="mx-auto flex min-h-full w-full max-w-3xl flex-col justify-center gap-6">
            <div class="space-y-3">
              <p class="text-xs font-black uppercase tracking-[0.18em] text-[#ffb77c]">Step 1</p>
              <h1 class="text-[clamp(2rem,6vw,2.8rem)] font-black leading-none text-slate-50">Inserisci il nome del torneo</h1>
              <p class="max-w-xl text-[0.96rem] leading-7 text-slate-300/80">Dagli un'identita forte: sara il primo dettaglio che i giocatori vedranno.</p>
            </div>

            <div class="rounded-[30px] border border-white/10 bg-[linear-gradient(145deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01)),rgba(5,9,16,0.74)] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_24px_40px_rgba(0,0,0,0.3)] md:p-8">
              <input
                v-model="createForm.name"
                type="text"
                placeholder="Es. Parma Grand Clash"
                class="tournament-create-name-field"
                @blur="touchStep('name')"
                @keydown.enter.prevent="handleGoNext"
              >

              <p
                v-if="!isNameValid && hasTouchedStep('name')"
                class="mt-4 text-center text-sm font-bold text-red-200"
              >
                Inserisci un nome torneo per continuare.
              </p>
            </div>
          </div>
        </section>

        <section class="tournament-create-pane bg-[radial-gradient(circle_at_16%_18%,_rgba(16,185,129,0.1),_transparent_24%),radial-gradient(circle_at_82%_22%,_rgba(59,130,246,0.1),_transparent_20%)] px-4 pb-28 pt-4">
          <div class="mx-auto flex min-h-full w-full max-w-3xl flex-col justify-center gap-6">
            <div class="space-y-3">
              <p class="text-xs font-black uppercase tracking-[0.18em] text-[#ffb77c]">Step 2</p>
              <h1 class="text-[clamp(2rem,6vw,2.8rem)] font-black leading-none text-slate-50">Scegli il tipo di torneo</h1>
              <p class="max-w-xl text-[0.96rem] leading-7 text-slate-300/80">Ogni formato cambia ritmo, pairing e sensazione competitiva.</p>
            </div>

            <div class="grid grid-cols-2 gap-3 max-[420px]:grid-cols-1">
              <button
                v-for="(option, index) in TOURNAMENT_FORMAT_OPTIONS"
                :key="option.value"
                type="button"
                class="rounded-[22px] border px-4 py-4 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_16px_28px_rgba(0,0,0,0.22)] transition-all duration-200"
                :class="[
                  createForm.format === option.value
                    ? 'border-[#ffb27d]/50 bg-[radial-gradient(circle_at_top_right,rgba(255,122,24,0.18),transparent_42%),linear-gradient(145deg,rgba(22,31,51,0.98),rgba(7,11,18,0.98))]'
                    : 'border-white/10 bg-[linear-gradient(145deg,rgba(14,20,34,0.94),rgba(6,10,18,0.98))]',
                  index === TOURNAMENT_FORMAT_OPTIONS.length - 1 && TOURNAMENT_FORMAT_OPTIONS.length % 2 === 1 ? 'col-span-2 max-[420px]:col-span-1' : '',
                ]"
                @click="createForm.format = option.value"
              >
                <span class="block text-base font-black text-slate-50">{{ option.label }}</span>
                <span class="mt-2 block text-sm leading-6 text-slate-300/80">{{ option.summary }}</span>
              </button>
            </div>

            <div class="rounded-[26px] border border-[#ffb27d]/15 bg-[radial-gradient(circle_at_top_left,rgba(255,122,24,0.16),transparent_36%),linear-gradient(145deg,rgba(9,14,24,0.96),rgba(5,9,15,0.98))] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_18px_32px_rgba(0,0,0,0.24)]">
              <p class="text-base font-black text-[#fff4e7]">{{ selectedFormatMeta?.label ?? 'Formato torneo' }}</p>
              <div class="mt-3 flex flex-wrap gap-2">
                <span
                  v-for="fact in stageFacts"
                  :key="fact"
                  class="inline-flex min-h-[1.9rem] items-center rounded-full border border-[#ffd6b3]/20 bg-[#ff7a18]/10 px-3 py-1 text-[0.74rem] font-extrabold text-[#ffebd8]"
                >
                  {{ fact }}
                </span>
              </div>
              <ul class="mt-4 grid gap-2 pl-4 text-sm leading-6 text-slate-200/85">
                <li v-for="rule in selectedFormatMeta?.rules ?? []" :key="rule">{{ rule }}</li>
              </ul>
            </div>
          </div>
        </section>

        <section class="tournament-create-pane bg-[radial-gradient(circle_at_22%_24%,_rgba(250,204,21,0.12),_transparent_28%),radial-gradient(circle_at_80%_18%,_rgba(255,122,24,0.1),_transparent_22%)] px-4 pb-28 pt-4">
          <div class="mx-auto flex min-h-full w-full max-w-3xl flex-col justify-center gap-6">
            <div class="space-y-3">
              <p class="text-xs font-black uppercase tracking-[0.18em] text-[#ffb77c]">Step 3</p>
              <h1 class="text-[clamp(2rem,6vw,2.8rem)] font-black leading-none text-slate-50">Indica numero massimo partecipanti</h1>
              <p class="max-w-xl text-[0.96rem] leading-7 text-slate-300/80">Parti da 8 e regola il cap dei posti con un controllo grande e comodo anche da mobile.</p>
            </div>

            <div class="rounded-[30px] border border-white/10 bg-[linear-gradient(145deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01)),rgba(5,9,16,0.74)] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_24px_40px_rgba(0,0,0,0.3)] md:p-8">
              <div class="mx-auto grid max-w-sm place-items-center gap-4">
                <v-number-input
                  v-model="participantsModel"
                  :min="2"
                  :max="2048"
                  :step="1"
                  :precision="0"
                  control-variant="stacked"
                  hide-details
                  inset
                  variant="outlined"
                  density="comfortable"
                  class="tournament-create-number"
                />

                <div class="flex flex-wrap justify-center gap-2">
                  <span
                    v-for="fact in stageFacts.slice(0, 2)"
                    :key="fact"
                    class="inline-flex min-h-[1.9rem] items-center rounded-full border border-[#ffd6b3]/20 bg-[#ff7a18]/10 px-3 py-1 text-[0.74rem] font-extrabold text-[#ffebd8]"
                  >
                    {{ fact }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section class="tournament-create-pane px-3 pb-28 pt-3">
          <div class="relative h-full min-h-full overflow-hidden rounded-[28px] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_24px_40px_rgba(0,0,0,0.28)]">
            <MapLeafletMap
              v-model="mapSelectionModel"
              :center="selectedCoordinates ?? DEFAULT_USER_LOCATION"
              :zoom="selectedCoordinates ? 15 : 13"
              :allow-set-marker="true"
              :selected-marker-draggable="true"
              :show-selected-marker="true"
              min-height="100%"
              class="h-full"
            />

            <div class="pointer-events-none absolute inset-x-0 top-4 z-10 px-4">
              <div class="max-w-md rounded-[24px] border border-white/10 bg-slate-950/80 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_16px_28px_rgba(0,0,0,0.26)] backdrop-blur-xl">
                <p class="text-xs font-black uppercase tracking-[0.18em] text-[#ffb77c]">Step 4</p>
                <h1 class="mt-2 text-[clamp(2rem,5.5vw,2.55rem)] font-black leading-none text-slate-50">Scegli posizione</h1>
                <p class="mt-2 text-sm leading-6 text-slate-300/80">Tocca la mappa o sposta il marker per definire il punto esatto del torneo.</p>
              </div>
            </div>

            <div class="absolute inset-x-0 bottom-4 z-10 px-4">
              <div class="relative grid gap-2">
                <form class="flex items-center gap-2" @submit.prevent="handleManualAddressSubmit">
                  <input
                    :value="addressInput"
                    type="text"
                    placeholder="Cerca indirizzo specifico"
                    class="tournament-create-address-field"
                    @input="handleAddressInput"
                  >
                  <button
                    type="submit"
                    class="inline-flex h-12 shrink-0 items-center justify-center rounded-2xl border border-[#ffb27d]/35 bg-[#ff7a18]/20 px-4 text-sm font-extrabold text-[#ffe0c2] shadow-[0_0_18px_rgba(255,122,24,0.18)] backdrop-blur-xl"
                  >
                    Cerca
                  </button>
                </form>

                <div
                  v-if="isLoadingSuggestions || addressSuggestions.length > 0"
                  class="absolute bottom-[calc(100%+0.55rem)] left-0 right-0 grid gap-1 rounded-2xl border border-white/12 bg-slate-950/95 p-2 shadow-[0_18px_34px_rgba(0,0,0,0.42)]"
                >
                  <p v-if="isLoadingSuggestions" class="px-2 py-1 text-sm text-slate-300/80">Ricerca indirizzi in corso...</p>
                  <button
                    v-for="suggestion in addressSuggestions"
                    :key="suggestion.id"
                    type="button"
                    class="rounded-2xl border border-white/8 bg-white/5 px-3 py-3 text-left"
                    @click="handleAddressSelection(suggestion)"
                  >
                    <span class="block text-sm font-bold text-slate-50">{{ suggestion.formatted ?? suggestion.label }}</span>
                    <span class="mt-1 block text-xs font-bold text-slate-400">{{ formatCoordinatesLabel(suggestion, 5) }}</span>
                  </button>
                </div>

                <div
                  v-if="locationStatusLabel || locationHelperMessage || isResolvingAddress || (!isLocationValid && hasTouchedStep('location'))"
                  class="rounded-2xl border bg-slate-950/85 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_16px_28px_rgba(0,0,0,0.24)] backdrop-blur-xl"
                  :class="[
                    locationHelperTone === 'error'
                      ? 'border-red-300/25'
                      : locationHelperTone === 'warning'
                        ? 'border-yellow-300/25'
                        : selectedCoordinates
                          ? 'border-emerald-300/25'
                          : 'border-white/10',
                  ]"
                >
                  <p v-if="isResolvingAddress" class="text-sm text-slate-200/85">Posizione selezionata, recupero indirizzo...</p>
                  <p v-else-if="locationStatusLabel" class="text-sm text-slate-200/85">{{ locationStatusLabel }}</p>
                  <p v-if="selectedCoordinates" class="mt-1 text-xs font-bold text-slate-400">{{ formatCoordinatesLabel(selectedCoordinates, 5) }}</p>
                  <p v-if="locationHelperMessage" class="mt-1 text-sm text-slate-200/85">{{ locationHelperMessage }}</p>
                  <p v-if="!isLocationValid && hasTouchedStep('location')" class="mt-1 text-sm font-bold text-red-200">Seleziona la posizione del torneo per continuare.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section class="tournament-create-pane bg-[radial-gradient(circle_at_18%_16%,_rgba(22,163,74,0.12),_transparent_24%),radial-gradient(circle_at_80%_20%,_rgba(255,122,24,0.08),_transparent_22%)] px-4 pb-28 pt-4">
          <div class="mx-auto flex min-h-full w-full max-w-3xl flex-col justify-center gap-6">
            <div class="space-y-3">
              <p class="text-xs font-black uppercase tracking-[0.18em] text-[#ffb77c]">Step 5</p>
              <h1 class="text-[clamp(2rem,6vw,2.8rem)] font-black leading-none text-slate-50">Pronto a creare</h1>
              <p class="max-w-xl text-[0.96rem] leading-7 text-slate-300/80">Controlla il riepilogo finale e pubblica il torneo quando ti convince davvero.</p>
            </div>

            <div class="grid gap-4">
              <TournamentCard :tournament="previewTournament" />

              <div class="flex flex-wrap gap-2">
                <span
                  v-for="fact in stageFacts"
                  :key="fact"
                  class="inline-flex min-h-[1.9rem] items-center rounded-full border border-[#ffd6b3]/20 bg-[#ff7a18]/10 px-3 py-1 text-[0.74rem] font-extrabold text-[#ffebd8]"
                >
                  {{ fact }}
                </span>
              </div>

              <v-btn
                block
                size="x-large"
                variant="flat"
                color="green"
                class="!min-h-[3.7rem] !rounded-[1.2rem] !text-[0.98rem] !font-black !normal-case !tracking-[0.02em]"
                :loading="isCreatingTournament"
                :disabled="isCreatingTournament || !canSubmitTournament"
                @click="handleCreateTournament"
              >
                Crea Torneo
              </v-btn>
            </div>
          </div>
        </section>
      </div>
    </div>

    <MobileFloatMenu :cols="2">
      <template #buttons>
        <ButtonMenu icon="mdi:arrow-left" label="Indietro" :disabled="!canGoBack" transition :delay="80" @click="handleGoBack" />
        <ButtonMenu icon="mdi:arrow-right" label="Avanti" :disabled="!canGoNext" transition :delay="120" @click="handleGoNext" />
      </template>
    </MobileFloatMenu>
  </section>
</template>

<style scoped>
.tournament-create-track {
  display: flex;
  width: 100%;
  height: 100%;
  transition: transform 320ms cubic-bezier(0.22, 1, 0.36, 1);
}

.tournament-create-pane {
  flex: 0 0 100%;
  min-width: 100%;
  min-height: 100%;
  overflow-y: auto;
}

.tournament-create-name-field,
.tournament-create-address-field {
  width: 100%;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 1.35rem;
  background:
    radial-gradient(circle at top left, rgba(255, 122, 24, 0.12), transparent 36%),
    linear-gradient(135deg, rgba(14, 20, 34, 0.94), rgba(6, 10, 18, 0.98));
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.07),
    0 20px 34px rgba(0, 0, 0, 0.24);
  color: rgba(255, 248, 241, 0.98);
}

.tournament-create-name-field {
  min-height: 5rem;
  padding: 0 1.5rem;
  text-align: center;
  font-size: clamp(1.4rem, 4.6vw, 2.15rem);
  font-weight: 900;
}

.tournament-create-address-field {
  min-height: 3rem;
  padding: 0 1rem;
  font-size: 0.95rem;
  font-weight: 700;
  backdrop-filter: blur(16px);
}

.tournament-create-name-field::placeholder,
.tournament-create-address-field::placeholder {
  color: rgba(203, 213, 225, 0.52);
}

.tournament-create-name-field:focus,
.tournament-create-address-field:focus {
  outline: none;
  border-color: rgba(255, 157, 82, 0.54);
  box-shadow:
    0 0 0 1px rgba(255, 157, 82, 0.28),
    0 18px 34px rgba(0, 0, 0, 0.28);
}

:deep(.tournament-create-number .v-field) {
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 1.6rem;
  background:
    radial-gradient(circle at top, rgba(250, 204, 21, 0.16), transparent 40%),
    linear-gradient(140deg, rgba(14, 20, 34, 0.96), rgba(6, 10, 18, 0.98));
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.06),
    0 22px 34px rgba(0, 0, 0, 0.26);
}

:deep(.tournament-create-number .v-field__outline),
:deep(.tournament-create-number .v-field__overlay) {
  opacity: 0;
}

:deep(.tournament-create-number input) {
  text-align: center;
  color: rgba(255, 248, 241, 0.98);
  font-size: clamp(2.1rem, 9vw, 3.6rem);
  font-weight: 900;
  min-height: 5.5rem;
}

:deep(.tournament-create-number .v-btn) {
  color: rgba(255, 236, 215, 0.95);
}
</style>
