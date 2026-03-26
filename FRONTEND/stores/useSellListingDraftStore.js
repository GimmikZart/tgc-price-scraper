import { Condition } from "@/utilities/enums/conditions";
import { hasValidCoordinates, normalizeCoordinates } from "@/utilities/geo";

const DEFAULT_QUANTITY = "1";
const DEFAULT_CONDITION = Condition.Perfect;
const DEFAULT_LOCATION = Object.freeze({
  latitude: null,
  longitude: null,
  label: null,
  source: null,
});

function createEmptyLocation() {
  return { ...DEFAULT_LOCATION };
}

function normalizeLocationPayload(value) {
  const coordinates = normalizeCoordinates(value);
  const label = typeof value?.label === "string" ? value.label.trim() : "";
  const source = typeof value?.source === "string" ? value.source.trim() : "";

  if (!coordinates) {
    return createEmptyLocation();
  }

  return {
    latitude: coordinates.lat,
    longitude: coordinates.lng,
    label: label || null,
    source: source || null,
  };
}

export const useSellListingDraftStore = defineStore(
  "sellListingDraft",
  () => {
    const selectedCard = ref(null);
    const quantity = ref(DEFAULT_QUANTITY);
    const unitPrice = ref("");
    const condition = ref(DEFAULT_CONDITION);
    const location = ref(createEmptyLocation());

    const hasSelectedCard = computed(() => Boolean(selectedCard.value?.id));
    const hasLocation = computed(() => hasValidCoordinates(location.value));

    function setSelectedCard(card, copiesInCollection = 0) {
      if (!card?.id) return;

      const previousCardId = selectedCard.value?.id;
      const hasCardChanged = previousCardId !== card.id;

      selectedCard.value = {
        ...card,
        copiesInCollection: Number(copiesInCollection) || 0,
      };

      if (hasCardChanged) {
        clearDraftForm();
        return;
      }

      if (!quantity.value) {
        quantity.value = DEFAULT_QUANTITY;
      }

      if (!condition.value) {
        condition.value = DEFAULT_CONDITION;
      }

      const parsedCardPrice = Number(card.price);
      if (!unitPrice.value && Number.isFinite(parsedCardPrice) && parsedCardPrice > 0) {
        unitPrice.value = String(parsedCardPrice);
      }
    }

    function clearSelectedCard() {
      selectedCard.value = null;
    }

    function clearDraftForm() {
      quantity.value = DEFAULT_QUANTITY;
      unitPrice.value = "";
      condition.value = DEFAULT_CONDITION;
    }

    function setLocation(nextLocation) {
      location.value = normalizeLocationPayload(nextLocation);
    }

    function clearLocation() {
      location.value = createEmptyLocation();
    }

    function resetDraft() {
      clearSelectedCard();
      clearDraftForm();
      clearLocation();
    }

    return {
      selectedCard,
      quantity,
      unitPrice,
      condition,
      location,
      hasSelectedCard,
      hasLocation,
      setSelectedCard,
      setLocation,
      clearSelectedCard,
      clearDraftForm,
      clearLocation,
      resetDraft,
    };
  },
  {
    persist: {
      pick: ["selectedCard", "quantity", "unitPrice", "condition", "location"],
    },
  }
);
