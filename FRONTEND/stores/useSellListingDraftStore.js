import { Condition } from "@/utilities/enums/conditions";

const DEFAULT_QUANTITY = "1";
const DEFAULT_CONDITION = Condition.PERFETTO;

export const useSellListingDraftStore = defineStore(
  "sellListingDraft",
  () => {
    const selectedCard = ref(null);
    const quantity = ref(DEFAULT_QUANTITY);
    const unitPrice = ref("");
    const condition = ref(DEFAULT_CONDITION);

    const hasSelectedCard = computed(() => Boolean(selectedCard.value?.id));

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

    function resetDraft() {
      clearSelectedCard();
      clearDraftForm();
    }

    return {
      selectedCard,
      quantity,
      unitPrice,
      condition,
      hasSelectedCard,
      setSelectedCard,
      clearSelectedCard,
      clearDraftForm,
      resetDraft,
    };
  },
  {
    persist: {
      pick: ["selectedCard", "quantity", "unitPrice", "condition"],
    },
  }
);
