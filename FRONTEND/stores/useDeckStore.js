import { toRaw } from "vue";
export const useDeckStore = defineStore(
  "deckStore",
  () => {
    const decksList = ref([]);

    const addDeck = (name, leader, cards) => {
      debugger;
      const newDeck = {
        name: name,
        slug: name.toLowerCase().replace(/\s+/g, "-"),
        leader: leader ?? null,
        cards: cards ?? [],
      };

      decksList.value.push(newDeck);
    };

    function editDeck(slug, newLeader, newCards) {
      decksList.value = decksList.value.map((deck) =>
        deck.slug === slug
          ? {
              ...deck,
              leader: newLeader,
              cards: newCards,
            }
          : deck
      );
    }

    const removeDeck = (slug) => {
      debugger;
      const index = decksList.value.findIndex((deck) => deck.slug === slug);
      if (index !== -1) {
        decksList.value.splice(index, 1);
      }
    };
    const getDeckBySlug = (slug) => {
      return decksList.value.find((deck) => deck.slug === slug);
    };

    return { decksList, addDeck, editDeck, removeDeck, getDeckBySlug };
  },
  {
    persist: {
      pick: ["decksList"],
    },
    debug: true,
  }
);
