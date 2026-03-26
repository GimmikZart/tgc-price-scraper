<script setup>
import { fetchUserCollection } from "@/api/collection";
import { createSellListing, fetchLoggedUserSellListings } from "@/api/sellListings";
import CommunitySellCardSelectionStep from "@/components/Community/SellCardSelectionStep.vue";
import CommunitySellDraftCardSummary from "@/components/Community/SellDraftCardSummary.vue";
import DialogsGeneric from "@/components/dialogs/Generic.vue";
import TournamentCreateStepper from "@/components/Play/TournamentCreateStepper.vue";
import WizardLocationStep from "@/components/Wizard/LocationStep.vue";
import {
  Condition,
  conditionOptions,
  getConditionMeta,
} from "@/utilities/enums/conditions";

const SELL_STEPS = Object.freeze([
  { key: "card", label: "Carta" },
  { key: "quantity", label: "Quantita" },
  { key: "price", label: "Prezzo" },
  { key: "condition", label: "Condizione" },
  { key: "location", label: "Luogo" },
  { key: "confirm", label: "Conferma" },
]);

const CONDITION_SUMMARIES = Object.freeze({
  [Condition.Perfect]: "Carta molto curata, ideale per chi cerca copie pulite da collezione.",
  [Condition.Used]: "Qualche segno leggero, ma ancora ottima per giocare e raccogliere.",
  [Condition.Worn]: "Usura visibile: dichiarala bene e tieni il prezzo piu competitivo.",
  [Condition.Damaged]: "Danni evidenti: massima trasparenza nel riepilogo finale.",
});

const LAST_STEP_INDEX = SELL_STEPS.length - 1;
const SELL_CARDS_BASE_PATH = "/community/sell-cards";

const router = useRouter();
const snackbar = useSnackbar();
const userAuth = useUserAuth();
const globalSettings = useGlobalSettings();
const sellListingDraftStore = useSellListingDraftStore();

const {
  selectedCard,
  hasSelectedCard,
  quantity,
  unitPrice,
  condition,
  location,
  hasLocation,
} = storeToRefs(sellListingDraftStore);

const currentStepIndex = ref(0);
const furthestStepReached = ref(0);
const touchedStepKeys = ref([]);
const isSubmitting = ref(false);
const cardSelectionStepRef = ref(null);
const stepViewportRef = ref(null);
const stepPaneRefs = ref([]);
const wizardViewportHeight = ref(null);
const saleDialogRef = ref(null);
const cardSelectionSortKey = ref("publish_date");
const cardSelectionSortDir = ref("desc");

const {
  data: collectionCards,
  pending: isLoadingCollection,
  error: collectionError,
  refresh: refreshCollection,
} = await useAsyncData(
  `sell-listing-collection-${userAuth.userLogged.id}`,
  () => fetchUserCollection(userAuth.userLogged.id),
);

const {
  data: activeSellListingsData,
  error: activeSellListingsError,
  refresh: refreshActiveSellListings,
} = await useAsyncData(
  `sell-listing-active-listings-${userAuth.userLogged.id}`,
  () => fetchLoggedUserSellListings(),
);

const collectionItems = computed(() => (Array.isArray(collectionCards.value) ? collectionCards.value : []));
const activeSellListings = computed(() => (
  Array.isArray(activeSellListingsData.value) ? activeSellListingsData.value : []
));
const collectionErrorMessage = computed(() => collectionError.value?.message || "");
const viewerCards = computed(() => (hasSelectedCard.value ? [selectedCard.value] : []));
const selectedCardPrice = computed(() => {
  const parsedValue = Number(selectedCard.value?.price);
  if (!Number.isFinite(parsedValue) || parsedValue <= 0) return null;
  return parsedValue.toFixed(2);
});
const selectedConditionMeta = computed(() => getConditionMeta(condition.value));
const conditionCards = computed(() => {
  return conditionOptions.map((option) => ({
    ...option,
    summary: CONDITION_SUMMARIES[option.value] ?? "",
  }));
});
const copiesInCollection = computed(() => {
  const parsedCopies = Number(selectedCard.value?.copiesInCollection);
  if (!Number.isInteger(parsedCopies) || parsedCopies < 0) return 0;
  return parsedCopies;
});
const activeListedCopiesForSelectedCard = computed(() => getActiveListedQuantityForCard(selectedCard.value?.id));
const availableCopiesForSale = computed(() => {
  return Math.max(0, copiesInCollection.value - activeListedCopiesForSelectedCard.value);
});
const maxQuantity = computed(() => Math.max(1, availableCopiesForSale.value));
const locationModel = computed({
  get() {
    return location.value;
  },
  set(value) {
    sellListingDraftStore.setLocation(value);
  },
});
const locationSummaryLabel = computed(() => {
  const explicitLabel = String(location.value?.label ?? "").trim();
  if (explicitLabel) return explicitLabel;

  if (location.value?.latitude != null && location.value?.longitude != null) return "Posizione selezionata";
  return "Luogo non selezionato";
});
const putOnSalePriceValue = computed(() => {
  const parsedValue = Number(unitPrice.value);
  if (!Number.isFinite(parsedValue) || parsedValue <= 0) return null;
  return parsedValue.toFixed(2);
});
const quantityValue = computed(() => {
  const parsedQuantity = Number(quantity.value);
  return Number.isInteger(parsedQuantity) && parsedQuantity > 0 ? parsedQuantity : 0;
});
const totalPriceValue = computed(() => {
  const parsedUnitPrice = Number(unitPrice.value);
  if (!Number.isFinite(parsedUnitPrice) || parsedUnitPrice <= 0) return null;
  if (!Number.isInteger(quantityValue.value) || quantityValue.value <= 0) return null;
  return (parsedUnitPrice * quantityValue.value).toFixed(2);
});
const quantityModel = computed({
  get() {
    const parsedQuantity = Number(quantity.value);
    if (!Number.isInteger(parsedQuantity) || parsedQuantity < 1) return 1;
    return Math.min(parsedQuantity, maxQuantity.value);
  },
  set(newValue) {
    touchStep("quantity");
    const parsedQuantity = Number(newValue);
    const nextQuantity = !Number.isInteger(parsedQuantity) || parsedQuantity < 1 ? 1 : parsedQuantity;
    quantity.value = String(Math.min(nextQuantity, maxQuantity.value));
  },
});
const isCardValid = computed(() => hasSelectedCard.value && availableCopiesForSale.value > 0);
const isQuantityValid = computed(() => {
  const parsedQuantity = Number(quantityModel.value);
  return Number.isInteger(parsedQuantity) && parsedQuantity > 0 && parsedQuantity <= availableCopiesForSale.value;
});
const isUnitPriceValid = computed(() => {
  const parsedUnitPrice = Number(unitPrice.value);
  return Number.isFinite(parsedUnitPrice) && parsedUnitPrice > 0;
});
const isConditionValid = computed(() => Boolean(selectedConditionMeta.value));
const hasAllRequiredFields = computed(() => {
  return (
    isCardValid.value
    && isQuantityValid.value
    && isUnitPriceValid.value
    && isConditionValid.value
    && hasLocation.value
  );
});
const canPutOnSale = computed(() => !isSubmitting.value && hasAllRequiredFields.value);
const stepperSteps = computed(() => {
  return SELL_STEPS.map((step, index) => ({
    ...step,
    state: resolveStepState(step.key, index),
  }));
});
const canGoBack = computed(() => currentStepIndex.value > 0);
const canGoNext = computed(() => {
  return currentStepIndex.value < LAST_STEP_INDEX && isStepValid(SELL_STEPS[currentStepIndex.value]?.key);
});
const canJumpToCardStep = computed(() => {
  return hasSelectedCard.value && currentStepIndex.value !== 0 && !isSubmitting.value;
});
const isCardStep = computed(() => currentStepIndex.value === 0);
const isCardStepSelectionMode = computed(() => isCardStep.value && !hasSelectedCard.value);
const isCardStepSummaryMode = computed(() => isCardStep.value && hasSelectedCard.value);
const floatMenuCols = computed(() => {
  if (isCardStepSummaryMode.value) return 3;
  return 4;
});
const primaryActionLabel = computed(() => (
  currentStepIndex.value === LAST_STEP_INDEX ? "Vendi" : "Avanti"
));
const primaryActionIcon = computed(() => (
  currentStepIndex.value === LAST_STEP_INDEX ? "mdi:tag-check-outline" : "mdi:arrow-right"
));
const primaryActionDisabled = computed(() => {
  if (isSubmitting.value) return true;
  if (currentStepIndex.value === LAST_STEP_INDEX) return !canPutOnSale.value;
  return !canGoNext.value;
});
const contentPaneStyle = computed(() => ({
  paddingBottom: "1rem",
}));
const stepViewportStyle = computed(() => {
  if (!Number.isFinite(wizardViewportHeight.value) || wizardViewportHeight.value <= 0) {
    return {};
  }

  const resolvedHeight = `${Math.round(wizardViewportHeight.value)}px`;
  return {
    height: resolvedHeight,
    minHeight: resolvedHeight,
    maxHeight: resolvedHeight,
  };
});
const saleDialogPrice = computed(() => putOnSalePriceValue.value ?? "-");

const { show: viewerOpen, index: viewerIndex, open: openViewer } = useCardViewer(viewerCards);

if (!getConditionMeta(condition.value)) {
  condition.value = Condition.Perfect;
}

function hasTouchedStep(stepKey) {
  return touchedStepKeys.value.includes(stepKey);
}

function touchStep(stepKey) {
  if (!stepKey || hasTouchedStep(stepKey)) return;
  touchedStepKeys.value = [...touchedStepKeys.value, stepKey];
}

function isStepValid(stepKey) {
  if (stepKey === "card") return isCardValid.value;
  if (stepKey === "quantity") return isQuantityValid.value;
  if (stepKey === "price") return isUnitPriceValid.value;
  if (stepKey === "condition") return isConditionValid.value;
  if (stepKey === "location") return hasLocation.value;
  if (stepKey === "confirm") return hasAllRequiredFields.value;
  return false;
}

function resolveStepState(stepKey, index) {
  const isCurrentStep = index === currentStepIndex.value;
  const isCompletedBefore = index < furthestStepReached.value;
  const hasError = !isStepValid(stepKey) && (isCompletedBefore || hasTouchedStep(stepKey));

  if (stepKey === "confirm") {
    if (isCurrentStep && hasAllRequiredFields.value) return "complete";
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

function setStepPaneRef(index, element) {
  stepPaneRefs.value[index] = element ?? null;
}

function resetElementScroll(element) {
  if (!element) return;

  if (typeof element.scrollTo === "function") {
    element.scrollTo({
      top: 0,
      left: 0,
      behavior: "auto",
    });
    return;
  }

  element.scrollTop = 0;
  element.scrollLeft = 0;
}

function resetStepScrollPosition() {
  resetElementScroll(stepViewportRef.value);
  stepPaneRefs.value.forEach((element) => {
    resetElementScroll(element);
  });

  if (typeof window !== "undefined") {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "auto",
    });
  }
}

function updateWizardViewportHeight() {
  if (typeof window === "undefined" || !stepViewportRef.value) return;

  const visualViewport = window.visualViewport;
  const viewportHeight = Number(visualViewport?.height ?? window.innerHeight ?? 0);
  const viewportOffsetTop = Number(visualViewport?.offsetTop ?? 0);
  const stepViewportTop = stepViewportRef.value.getBoundingClientRect().top;
  const reservedBottom = Math.max(
    Number(globalSettings.navbarHeight ?? 0) + Number(globalSettings.floatMenuHeight ?? 0),
    0,
  );
  const nextHeight = Math.floor(viewportHeight + viewportOffsetTop - stepViewportTop - reservedBottom);

  wizardViewportHeight.value = Math.max(nextHeight, 240);
}

function handleGoBack() {
  if (!canGoBack.value) return;
  currentStepIndex.value -= 1;
}

function handleGoNext() {
  const currentStepKey = SELL_STEPS[currentStepIndex.value]?.key;
  if (!isStepValid(currentStepKey)) {
    touchStep(currentStepKey);
    return;
  }

  moveToStep(currentStepIndex.value + 1);
}

function handlePrimaryAction() {
  if (currentStepIndex.value === LAST_STEP_INDEX) {
    handleSellClick();
    return;
  }

  handleGoNext();
}

function handleGoToCardStep() {
  if (!canJumpToCardStep.value) return;
  moveToStep(0);
}

function handleCancel() {
  sellListingDraftStore.resetDraft();
  router.push(SELL_CARDS_BASE_PATH);
}

function handleSelectedCardOpen(card) {
  openViewer(card);
}

function getActiveListedQuantityForCard(cardId) {
  const normalizedCardId = String(cardId ?? "").trim();
  if (!normalizedCardId) return 0;

  return activeSellListings.value.reduce((total, listing) => {
    const listingCardId = String(listing?.card?.id ?? listing?.card_id ?? "").trim();
    if (!listingCardId || listingCardId !== normalizedCardId) return total;

    const parsedQuantity = Number(listing?.quantity);
    return total + (Number.isInteger(parsedQuantity) && parsedQuantity > 0 ? parsedQuantity : 0);
  }, 0);
}

function getAvailableCopiesForCard(cardId, ownedCopies = 0) {
  const parsedOwnedCopies = Number(ownedCopies);
  const safeOwnedCopies = Number.isInteger(parsedOwnedCopies) && parsedOwnedCopies > 0 ? parsedOwnedCopies : 0;
  return Math.max(0, safeOwnedCopies - getActiveListedQuantityForCard(cardId));
}

async function refreshActiveSellListingsOrThrow() {
  await refreshActiveSellListings();

  if (activeSellListingsError.value) {
    throw activeSellListingsError.value;
  }
}

function handleCardSelection({ card, copiesInCollection }) {
  sellListingDraftStore.setSelectedCard(card, copiesInCollection);
  touchStep("card");

  if (getAvailableCopiesForCard(card?.id, copiesInCollection) < 1) {
    snackbar.addMessage("Questa carta ha gia tutte le copie impegnate in vendite attive", "warning");
    moveToStep(0);
    return;
  }

  moveToStep(1);
}

function handleConditionSelection(nextCondition) {
  touchStep("condition");
  condition.value = nextCondition;
}

function handleChangeCard() {
  sellListingDraftStore.clearSelectedCard();
  sellListingDraftStore.clearDraftForm();
  moveToStep(0);
}

function handleOpenCardFilter() {
  cardSelectionStepRef.value?.openFilterPanel?.();
}

function handleChangeCardSort({ key, dir }) {
  cardSelectionSortKey.value = key;
  cardSelectionSortDir.value = dir;
}

async function handlePutOnSale() {
  if (isSubmitting.value) return;

  try {
    await refreshActiveSellListingsOrThrow();
  } catch (error) {
    snackbar.addMessage("Impossibile verificare le tue vendite attive", "error", error?.message);
    return;
  }

  if (!hasSelectedCard.value) {
    snackbar.addMessage("Seleziona una carta prima di continuare", "error");
    moveToStep(0);
    return;
  }

  if (availableCopiesForSale.value < 1) {
    snackbar.addMessage("Questa carta non ha copie libere: sono gia tutte in vendite attive", "error");
    moveToStep(0);
    return;
  }

  const parsedQuantity = Number(quantityModel.value);
  if (!Number.isInteger(parsedQuantity) || parsedQuantity <= 0) {
    snackbar.addMessage("Inserisci una quantita valida", "error");
    moveToStep(1);
    return;
  }

  if (parsedQuantity > availableCopiesForSale.value) {
    snackbar.addMessage(`Quantita massima ancora disponibile: ${availableCopiesForSale.value}`, "error");
    moveToStep(1);
    return;
  }

  const parsedUnitPrice = Number(unitPrice.value);
  if (!Number.isFinite(parsedUnitPrice) || parsedUnitPrice <= 0) {
    snackbar.addMessage("Inserisci un prezzo valido", "error");
    moveToStep(2);
    return;
  }

  if (!getConditionMeta(condition.value)) {
    snackbar.addMessage("Seleziona la condizione della carta", "error");
    moveToStep(3);
    return;
  }

  if (!hasLocation.value) {
    snackbar.addMessage("Inserisci il luogo di vendita", "error");
    moveToStep(4);
    return;
  }

  isSubmitting.value = true;

  try {
    await createSellListing({
      cardId: selectedCard.value.id,
      quantity: parsedQuantity,
      price: parsedUnitPrice,
      latitude: location.value.latitude,
      longitude: location.value.longitude,
      condition: condition.value,
    });

    snackbar.addMessage("Carta messa in vendita con successo", "success");
    sellListingDraftStore.resetDraft();
    await router.push(SELL_CARDS_BASE_PATH);
  } catch (error) {
    const errorMessage = String(error?.message || "");

    if (errorMessage.includes("Active listings quantity")) {
      try {
        await refreshActiveSellListingsOrThrow();
      } catch {}

      if (availableCopiesForSale.value > 0) {
        snackbar.addMessage(
          `Disponibilita aggiornata: puoi vendere ancora ${availableCopiesForSale.value} copie di questa carta`,
          "error",
        );
        moveToStep(1);
        return;
      }

      snackbar.addMessage("Nel frattempo tutte le copie disponibili sono gia finite in annunci attivi", "error");
      moveToStep(0);
      return;
    }

    snackbar.addMessage(error?.message || "Errore durante la creazione della vendita", "error");
  } finally {
    isSubmitting.value = false;
  }
}

function handleSellClick() {
  if (isSubmitting.value) return;

  if (!hasAllRequiredFields.value) {
    const firstInvalidIndex = SELL_STEPS.findIndex((step) => !isStepValid(step.key));
    if (firstInvalidIndex >= 0) {
      touchStep(SELL_STEPS[firstInvalidIndex].key);
      moveToStep(firstInvalidIndex);
    }
    snackbar.addMessage("Bisogna completare tutti gli step prima di vendere", "warning");
    return;
  }

  saleDialogRef.value?.openDialog();
}

onBeforeUnmount(() => {
  if (typeof window !== "undefined") {
    window.removeEventListener("resize", updateWizardViewportHeight);
    window.visualViewport?.removeEventListener("resize", updateWizardViewportHeight);
    window.visualViewport?.removeEventListener("scroll", updateWizardViewportHeight);
  }
});

onMounted(async () => {
  await nextTick();
  updateWizardViewportHeight();

  if (typeof window !== "undefined") {
    window.addEventListener("resize", updateWizardViewportHeight);
    window.visualViewport?.addEventListener("resize", updateWizardViewportHeight);
    window.visualViewport?.addEventListener("scroll", updateWizardViewportHeight);
  }
});

watch(
  currentStepIndex,
  async () => {
    await nextTick();
    const scheduleScrollReset = typeof window !== "undefined" && typeof window.requestAnimationFrame === "function"
      ? window.requestAnimationFrame.bind(window)
      : (callback) => callback();

    scheduleScrollReset(() => {
      updateWizardViewportHeight();
      resetStepScrollPosition();
    });
  },
  { flush: "post", immediate: true },
);

watch(
  () => [globalSettings.navbarHeight, globalSettings.floatMenuHeight],
  async () => {
    await nextTick();
    updateWizardViewportHeight();
  },
  { flush: "post" },
);

definePageMeta({
  middleware: "auth",
  ssr: false,
});
</script>

<template>
  <section class="relative flex h-full min-h-0 flex-col overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(255,122,24,0.18),_transparent_24%),radial-gradient(circle_at_84%_14%,_rgba(56,189,248,0.12),_transparent_22%),linear-gradient(180deg,_rgba(8,12,20,0.98),_rgba(3,6,13,1))]">
    <Toolbar label="Nuova Vendita" fixed>
      <template #info>
        <TournamentCreateStepper :steps="stepperSteps" :active-step="currentStepIndex" />
      </template>
    </Toolbar>

    <div ref="stepViewportRef" class="relative min-h-0 flex-1 overflow-hidden" :style="stepViewportStyle">
      <div class="sell-create-track" :style="{ transform: `translateX(-${currentStepIndex * 100}%)` }">
        <section
          :ref="(element) => setStepPaneRef(0, element)"
          class="sell-create-pane bg-[radial-gradient(circle_at_20%_22%,_rgba(255,122,24,0.12),_transparent_28%)] px-4 pt-4"
          :style="contentPaneStyle"
        >
          <div class="sell-create-pane-content">
            <CommunitySellCardSelectionStep
              ref="cardSelectionStepRef"
              :cards="collectionItems"
              :loading="isLoadingCollection"
              :sort-key="cardSelectionSortKey"
              :sort-dir="cardSelectionSortDir"
              :error-message="collectionErrorMessage"
              :selected-card="selectedCard"
              :selected-card-id="selectedCard?.id"
              :available-copies="availableCopiesForSale"
              :active-listed-copies="activeListedCopiesForSelectedCard"
              :invalid="!isCardValid && hasTouchedStep('card')"
              @retry="refreshCollection"
              @select="handleCardSelection"
            />
          </div>
        </section>

        <section
          :ref="(element) => setStepPaneRef(1, element)"
          class="sell-create-pane bg-[radial-gradient(circle_at_18%_18%,_rgba(250,204,21,0.12),_transparent_26%),radial-gradient(circle_at_84%_16%,_rgba(255,122,24,0.08),_transparent_24%)] px-4 pt-4"
          :style="contentPaneStyle"
        >
          <div class="sell-create-pane-content">
            <div class="space-y-3">
              <p class="text-xs font-black uppercase tracking-[0.18em] text-[#ffb77c]">Step 2</p>
              <h1 class="text-[clamp(2rem,6vw,2.8rem)] font-black leading-none text-slate-50">Decidi quante copie vendere</h1>
              <p class="max-w-xl text-[0.96rem] leading-7 text-slate-300/80">
                Imposta la quantita partendo dalle copie che possiedi davvero in collezione.
              </p>
            </div>

            <div class="sell-create-panel">
              <CommunitySellDraftCardSummary
                v-if="selectedCard"
                :card="selectedCard"
                @open="handleSelectedCardOpen"
              />

              <div class="sell-create-counter-shell">
                <p class="sell-create-label">Quantita da mettere sul mercato</p>
                <CardCounter
                  v-model="quantityModel"
                  :min="1"
                  :max="maxQuantity"
                  :outer-padding="false"
                />
                <p class="sell-create-helper">
                  Hai {{ copiesInCollection }} copie in collezione, {{ activeListedCopiesForSelectedCard }} gia in vendita e
                  {{ availableCopiesForSale }} ancora disponibili per questa nuova inserzione.
                </p>
                <p
                  v-if="!isQuantityValid && hasTouchedStep('quantity')"
                  class="sell-create-error"
                >
                  Inserisci una quantita valida entro il limite disponibile.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section
          :ref="(element) => setStepPaneRef(2, element)"
          class="sell-create-pane bg-[radial-gradient(circle_at_16%_16%,_rgba(59,130,246,0.12),_transparent_26%),radial-gradient(circle_at_84%_18%,_rgba(255,122,24,0.08),_transparent_24%)] px-4 pt-4"
          :style="contentPaneStyle"
        >
          <div class="sell-create-pane-content">
            <div class="space-y-3">
              <p class="text-xs font-black uppercase tracking-[0.18em] text-[#ffb77c]">Step 3</p>
              <h1 class="text-[clamp(2rem,6vw,2.8rem)] font-black leading-none text-slate-50">Imposta il prezzo per copia</h1>
              <p class="max-w-xl text-[0.96rem] leading-7 text-slate-300/80">
                Definisci il prezzo di vendita per singola carta e confrontalo con il riferimento di mercato.
              </p>
            </div>

            <div class="sell-create-panel space-y-4">
              <CommunitySellDraftCardSummary
                v-if="selectedCard"
                :card="selectedCard"
                @open="handleSelectedCardOpen"
              />

              <div class="sell-create-price-box">
                <div class="sell-create-price-meta">
                  <div>
                    <p class="sell-create-label">Prezzo di vendita per singola copia</p>
                    <p class="sell-create-helper">Il valore finale dell'annuncio sara quantita x prezzo unitario.</p>
                  </div>

                  <div v-if="selectedCardPrice" class="sell-create-market-price">
                    CardTrader: {{ selectedCardPrice }} euro
                  </div>
                </div>

                <InputTextField
                  v-model="unitPrice"
                  class="sell-create-price-field"
                  label="Prezzo singola copia"
                  placeholder="Es. 8.50"
                  type="number"
                  min="0.01"
                  step="0.01"
                  @blur="touchStep('price')"
                />

                <p
                  v-if="putOnSalePriceValue"
                  class="sell-create-helper"
                >
                  Totale inserzione: {{ totalPriceValue }} euro
                </p>
                <p
                  v-if="!isUnitPriceValid && hasTouchedStep('price')"
                  class="sell-create-error"
                >
                  Inserisci un prezzo valido maggiore di zero.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section
          :ref="(element) => setStepPaneRef(3, element)"
          class="sell-create-pane bg-[radial-gradient(circle_at_16%_18%,_rgba(16,185,129,0.1),_transparent_24%),radial-gradient(circle_at_82%_22%,_rgba(255,122,24,0.08),_transparent_22%)] px-4 pt-4"
          :style="contentPaneStyle"
        >
          <div class="sell-create-pane-content">
            <div class="space-y-3">
              <p class="text-xs font-black uppercase tracking-[0.18em] text-[#ffb77c]">Step 4</p>
              <h1 class="text-[clamp(2rem,6vw,2.8rem)] font-black leading-none text-slate-50">Indica la condizione della carta</h1>
              <p class="max-w-xl text-[0.96rem] leading-7 text-slate-300/80">
                Scegli una condizione chiara e coerente: aiuta chi compra a fidarsi dell'inserzione.
              </p>
            </div>

            <div class="space-y-4">
              <div class="sell-create-panel">
                <CommunitySellDraftCardSummary
                  v-if="selectedCard"
                  :card="selectedCard"
                  @open="handleSelectedCardOpen"
                />
              </div>

              <div class="grid gap-3 sm:grid-cols-2">
                <article
                  v-for="option in conditionCards"
                  :key="option.value"
                  class="sell-condition-card"
                  :class="{ 'sell-condition-card--active': condition === option.value }"
                >
                  <button
                    type="button"
                    class="sell-condition-card__button"
                    @click="handleConditionSelection(option.value)"
                  >
                    <div class="sell-condition-card__top">
                      <v-chip
                        :color="option.color"
                        size="small"
                        variant="flat"
                        label
                      >
                        {{ option.label }}
                      </v-chip>
                      <v-icon size="18" class="text-slate-300/80">
                        {{ condition === option.value ? "mdi-check-circle" : "mdi-circle-outline" }}
                      </v-icon>
                    </div>

                    <p class="sell-condition-card__summary">{{ option.summary }}</p>
                  </button>
                </article>
              </div>

              <p
                v-if="!isConditionValid && hasTouchedStep('condition')"
                class="sell-create-error"
              >
                Seleziona la condizione della carta per continuare.
              </p>
            </div>
          </div>
        </section>

        <section :ref="(element) => setStepPaneRef(4, element)" class="sell-create-pane sell-create-pane--map px-3 pt-3">
          <WizardLocationStep
            v-model="locationModel"
            eyebrow="STEP 5"
            title="Indica il luogo per la vendita"
            description="tocca, trascina o cerca un indirizzo"
            ready-label="Luogo pronto"
            current-position-label="Mia posizione"
            :invalid="!hasLocation && hasTouchedStep('location')"
            invalid-message="Seleziona il luogo di vendita."
            @interact="touchStep('location')"
          />
        </section>

        <section
          :ref="(element) => setStepPaneRef(5, element)"
          class="sell-create-pane bg-[radial-gradient(circle_at_18%_16%,_rgba(22,163,74,0.12),_transparent_24%),radial-gradient(circle_at_80%_20%,_rgba(255,122,24,0.08),_transparent_22%)] px-4 pt-4"
          :style="contentPaneStyle"
        >
          <div class="sell-create-pane-content">
            <div class="space-y-3">
              <p class="text-xs font-black uppercase tracking-[0.18em] text-[#ffb77c]">Step 6</p>
              <h1 class="text-[clamp(2rem,6vw,2.8rem)] font-black leading-none text-slate-50">Riepilogo e conferma</h1>
              <p class="max-w-xl text-[0.96rem] leading-7 text-slate-300/80">
                Controlla gli ultimi dettagli prima di mettere la carta sul mercato.
              </p>
            </div>

            <div class="space-y-4">
              <div class="sell-create-panel">
                <CommunitySellDraftCardSummary
                  v-if="selectedCard"
                  :card="selectedCard"
                  @open="handleSelectedCardOpen"
                />
              </div>

              <div class="grid gap-3 sm:grid-cols-2">
                <article class="sell-summary-tile">
                  <p class="sell-summary-tile__label">Quantita</p>
                  <p class="sell-summary-tile__value">{{ quantityModel }}</p>
                </article>
                <article class="sell-summary-tile">
                  <p class="sell-summary-tile__label">Prezzo per copia</p>
                  <p class="sell-summary-tile__value">{{ saleDialogPrice }} euro</p>
                </article>
                <article class="sell-summary-tile">
                  <p class="sell-summary-tile__label">Totale inserzione</p>
                  <p class="sell-summary-tile__value">{{ totalPriceValue ?? "-" }} euro</p>
                </article>
                <article class="sell-summary-tile">
                  <p class="sell-summary-tile__label">Condizione</p>
                  <p class="sell-summary-tile__value">{{ selectedConditionMeta?.label ?? "-" }}</p>
                </article>
                <article class="sell-summary-tile sm:col-span-2">
                  <p class="sell-summary-tile__label">Luogo di vendita</p>
                  <p class="sell-summary-tile__value sell-summary-tile__value--wrap">{{ locationSummaryLabel }}</p>
                </article>
              </div>

              <DialogsGeneric
                ref="saleDialogRef"
                accept-label="Procedi"
                accept-color="green"
                :disabled="isSubmitting"
                @confirm="handlePutOnSale"
              >
                <template #button>
                  <v-btn
                    block
                    size="x-large"
                    variant="flat"
                    color="green"
                    class="sell-create-confirm-btn"
                    :loading="isSubmitting"
                    :disabled="isSubmitting || !canPutOnSale"
                  >
                    Conferma messa a mercato
                  </v-btn>
                </template>

                <template #title>Conferma vendita</template>
                <template #content>
                  <p class="sell-confirm-text">
                    Stai per mettere sul mercato {{ quantityModel }} copie a {{ saleDialogPrice }} euro ciascuna.
                  </p>
                  <p class="sell-confirm-subtitle">
                    Totale inserzione: {{ totalPriceValue ?? "-" }} euro. Vuoi procedere?
                  </p>
                </template>
              </DialogsGeneric>
            </div>
          </div>
        </section>
      </div>
    </div>

    <FullscreenCardViewer
      v-model:show="viewerOpen"
      v-model:index="viewerIndex"
      :cards="viewerCards"
      @close="viewerOpen = false"
    />

    <MobileFloatMenu :cols="floatMenuCols">
      <template #buttons>
        <ButtonMenu
          icon="mdi:close"
          label="Annulla"
          color="red"
          transition
          :delay="80"
          :disabled="isSubmitting"
          @click="handleCancel"
        />

        <template v-if="isCardStepSelectionMode">
          <ButtonSortMenu
            :model-key="cardSelectionSortKey"
            :model-dir="cardSelectionSortDir"
            @change="handleChangeCardSort"
          />
          <ButtonMenu
            icon="material-symbols:search-rounded"
            label="Filtra"
            transition
            :delay="160"
            @click="handleOpenCardFilter"
          />
          <ButtonMenu
            :icon="primaryActionIcon"
            :label="primaryActionLabel"
            color="orange"
            transition
            :delay="200"
            :disabled="primaryActionDisabled"
            @click="handlePrimaryAction"
          />
        </template>

        <template v-else-if="isCardStepSummaryMode">
          <ButtonMenu
            icon="mdi:cards-playing-outline"
            label="Cambia"
            transition
            :delay="140"
            :disabled="isSubmitting"
            @click="handleChangeCard"
          />
          <ButtonMenu
            :icon="primaryActionIcon"
            :label="primaryActionLabel"
            color="orange"
            transition
            :delay="200"
            :disabled="primaryActionDisabled"
            @click="handlePrimaryAction"
          />
        </template>

        <template v-else>
          <ButtonMenu
            icon="mdi:cards-playing-outline"
            label="Carta"
            transition
            :delay="120"
            :disabled="!canJumpToCardStep"
            @click="handleGoToCardStep"
          />
          <ButtonMenu
            icon="mdi:arrow-left"
            label="Indietro"
            transition
            :delay="160"
            :disabled="!canGoBack || isSubmitting"
            @click="handleGoBack"
          />
          <ButtonMenu
            :icon="primaryActionIcon"
            :label="primaryActionLabel"
            color="orange"
            transition
            :delay="200"
            :disabled="primaryActionDisabled"
            :class="{ 'sell-float-button--green-glow': currentStepIndex === LAST_STEP_INDEX && canPutOnSale }"
            @click="handlePrimaryAction"
          />
        </template>
      </template>
    </MobileFloatMenu>
  </section>
</template>

<style scoped>
.sell-create-track {
  display: flex;
  width: 100%;
  height: 100%;
  transition: transform 320ms cubic-bezier(0.22, 1, 0.36, 1);
}

.sell-create-pane {
  flex: 0 0 100%;
  min-width: 100%;
  height: 100%;
  min-height: 100%;
  box-sizing: border-box;
  overflow-y: auto;
}

.sell-create-pane--map {
  overflow: hidden;
}

.sell-create-pane-content {
  display: flex;
  min-height: 100%;
  width: 100%;
  max-width: 48rem;
  margin: 0 auto;
  flex-direction: column;
  justify-content: flex-start;
  gap: 1.5rem;
  box-sizing: border-box;
}

.sell-create-panel {
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 1.85rem;
  background:
    radial-gradient(circle at top right, rgba(255, 122, 24, 0.12), transparent 34%),
    linear-gradient(145deg, rgba(14, 20, 34, 0.94), rgba(6, 10, 18, 0.98));
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.08),
    0 24px 40px rgba(0, 0, 0, 0.28);
  padding: 1rem;
}

.sell-create-counter-shell,
.sell-create-price-box {
  display: grid;
  gap: 0.85rem;
  margin-top: 1rem;
}

.sell-create-price-meta {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.9rem;
}

.sell-create-label,
.sell-create-helper,
.sell-create-error,
.sell-create-market-price,
.sell-confirm-text,
.sell-confirm-subtitle,
.sell-summary-tile__label,
.sell-summary-tile__value {
  margin: 0;
}

.sell-create-label {
  color: rgba(248, 250, 252, 0.96);
  font-size: 0.84rem;
  font-weight: 800;
}

.sell-create-helper {
  color: rgba(203, 213, 225, 0.78);
  font-size: 0.78rem;
  line-height: 1.5;
}

.sell-create-market-price {
  flex-shrink: 0;
  border: 1px solid rgba(255, 183, 124, 0.22);
  border-radius: 999px;
  background: rgba(255, 122, 24, 0.1);
  color: #ffe4cb;
  font-size: 0.73rem;
  font-weight: 800;
  padding: 0.4rem 0.75rem;
}

.sell-create-error {
  color: rgba(254, 202, 202, 0.96);
  font-size: 0.78rem;
  font-weight: 800;
}

.sell-condition-card {
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 1.5rem;
  background: linear-gradient(145deg, rgba(14, 20, 34, 0.94), rgba(6, 10, 18, 0.98));
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.06),
    0 16px 28px rgba(0, 0, 0, 0.22);
  transition:
    border-color 180ms ease,
    box-shadow 180ms ease,
    transform 180ms ease;
}

.sell-condition-card--active {
  border-color: rgba(255, 178, 125, 0.55);
  box-shadow:
    0 0 0 1px rgba(255, 178, 125, 0.18),
    inset 0 1px 0 rgba(255, 255, 255, 0.08),
    0 24px 36px rgba(0, 0, 0, 0.26);
  transform: translateY(-1px);
}

.sell-condition-card__button {
  display: grid;
  gap: 0.8rem;
  width: 100%;
  text-align: left;
  padding: 1rem;
}

.sell-condition-card__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.sell-condition-card__summary {
  margin: 0;
  color: rgba(226, 232, 240, 0.84);
  font-size: 0.85rem;
  line-height: 1.5;
}

.sell-summary-tile {
  display: grid;
  gap: 0.28rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 1.3rem;
  background: rgba(255, 255, 255, 0.04);
  padding: 0.9rem 1rem;
}

.sell-summary-tile__label {
  color: rgba(203, 213, 225, 0.72);
  font-size: 0.74rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.sell-summary-tile__value {
  color: rgba(248, 250, 252, 0.98);
  font-size: 1rem;
  font-weight: 800;
  line-height: 1.35;
}

.sell-summary-tile__value--wrap {
  line-height: 1.5;
}

.sell-create-confirm-btn {
  min-height: 3.7rem !important;
  border-radius: 1.2rem !important;
  font-size: 0.98rem !important;
  font-weight: 900 !important;
  letter-spacing: 0.02em !important;
  text-transform: none !important;
}

.sell-float-button--green-glow ::v-deep button > span {
  box-shadow:
    inset 0 0 6px rgba(34, 197, 94, 0.7),
    0 0 16px rgba(34, 197, 94, 0.35),
    0 0 28px rgba(16, 185, 129, 0.45);
}

.sell-confirm-text {
  font-size: 0.95rem;
  color: rgba(255, 255, 255, 0.9);
}

.sell-confirm-subtitle {
  margin-top: 0.45rem;
  font-size: 0.86rem;
  color: rgba(203, 213, 225, 0.92);
}

:deep(.sell-create-price-field .v-field) {
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 1.1rem;
  background:
    radial-gradient(circle at top left, rgba(255, 122, 24, 0.12), transparent 34%),
    linear-gradient(145deg, rgba(14, 20, 34, 0.94), rgba(6, 10, 18, 0.98));
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.07),
    0 20px 34px rgba(0, 0, 0, 0.24);
}

:deep(.sell-create-price-field .v-field__outline),
:deep(.sell-create-price-field .v-field__overlay) {
  opacity: 0;
}

:deep(.sell-create-price-field input) {
  color: rgba(255, 248, 241, 0.98);
  font-weight: 800;
}

@media (max-width: 639px) {
  .sell-create-price-meta {
    flex-direction: column;
  }
}
</style>
