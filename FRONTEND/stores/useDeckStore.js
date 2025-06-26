export const useDeckStore = defineStore(
  "deckStore",
  () => {
    const decksList = ref([]);

    const addDeck = (deck) => {
      decksList.value.push(deck);
    };
    const removeDeck = (deckname) => {
      const index = decksList.value.findIndex((deck) => deck.name === deckname);
      if (index !== -1) {
        decksList.value.splice(index, 1);
      }
    };

    return { decksList, addDeck, removeDeck };
  },
  {
    persist: true,
  }
);
