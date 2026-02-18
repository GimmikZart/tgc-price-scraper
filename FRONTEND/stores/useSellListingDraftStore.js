export const useSellListingDraftStore = defineStore(
  "sellListingDraft",
  () => {
    const selectedCard = ref(null);
    const quantity = ref("");
    const unitPrice = ref("");
    const condition = ref("");

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
        quantity.value = "1";
        return;
      }

      if (!quantity.value) {
        quantity.value = "1";
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
      quantity.value = "";
      unitPrice.value = "";
      condition.value = "";
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
    };
  },
  {
    persist: {
      pick: ["selectedCard", "quantity", "unitPrice", "condition"],
    },
  }
);
