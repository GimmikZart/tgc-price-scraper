export const useSellListingDraftStore = defineStore(
  "sellListingDraft",
  () => {
    const selectedCard = ref(null);

    const hasSelectedCard = computed(() => Boolean(selectedCard.value?.id));

    function setSelectedCard(card, copiesInCollection = 0) {
      if (!card?.id) return;

      selectedCard.value = {
        ...card,
        copiesInCollection: Number(copiesInCollection) || 0,
      };
    }

    function clearSelectedCard() {
      selectedCard.value = null;
    }

    return { selectedCard, hasSelectedCard, setSelectedCard, clearSelectedCard };
  },
  {
    persist: {
      pick: ["selectedCard"],
    },
  }
);
