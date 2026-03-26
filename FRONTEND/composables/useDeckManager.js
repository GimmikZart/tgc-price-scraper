import { DeckLocation, normalizeDeckLocation } from "~/enums/deckLocation";
import { useSnackbar } from "@/stores/useSnackbar";
import {
  getDeckLocalDb,
  isDeckLocalDbClosingError,
  resetDeckLocalDb
} from "@/utilities/deckLocalDb";

import {
  fetchUserDecks,
  fetchUserDeckCards,
  saveDeckOnCloud,
  deleteDeckFromCloud
} from "~/api/decks";

export function useDeckManager() {
  const userAuth = useUserAuth();
  const userUuid = userAuth.userLogged.id;

  const withLocalDb = async (operation) => {
    try {
      const db = await getDeckLocalDb();
      return await operation(db);
    } catch (error) {
      if (!isDeckLocalDbClosingError(error)) {
        throw error;
      }

      console.warn("[deckLocalDb] connection was closing, retrying operation once");
      resetDeckLocalDb();

      const reopenedDb = await getDeckLocalDb();
      return operation(reopenedDb);
    }
  };

  //
  // DEVICE (IndexedDB via db)
  //
  const saveLocal = async (deck) => {
    const plainDeck = JSON.parse(JSON.stringify(deck));
    return withLocalDb((db) => db.put("decks", plainDeck));
  };

  const getAllLocal = async () => {
    const decks = await withLocalDb((db) => db.getAll("decks"));
    decks.forEach((deck) => {
      deck.isLocal = true; // Aggiungo un flag per identificare i mazzi locali
    });
    return decks;
  };

  const getLocal = async (slug) => {
    const deck = await withLocalDb((db) => db.get("decks", slug));
    if (!deck) return;
    deck.isLocal = true; // Aggiungo un flag per identificare i mazzi locali
    return deck;
  };

  const removeLocal = async (slug) => {
    const deck = await withLocalDb((db) => db.get("decks", slug));
    if (!deck) return;
    return withLocalDb((db) => db.delete("decks", slug));
  };

  //
  // CLOUD (Supabase via le tue API)
  //
  const getAllCloud = () => fetchUserDecks();
  const getCloud = (slug) => {
    const deck = fetchUserDeckCards(userUuid, slug);
    if (!deck) {
      const snackbar = useSnackbar();
      snackbar.addMessage(
        "Deck non trovato sul cloud.",
        "error"
      );
    }

    return deck;
  };
  const saveCloud = (deck) => saveDeckOnCloud(deck);
  const deleteCloud = (slug) => deleteDeckFromCloud(userUuid, slug);

  //
  // LOGICA DI PUBBLICAZIONE / EDIT
  //
  const publish = async (deck) => {
    await saveCloud(deck);
    await removeLocal(deck.slug);
  };

  const createDeviceCopyFromCloud = async (slug) => {
    const deck = await getCloud(slug);
    await saveLocal(deck);
    return deck;
  };

  const deleteDeck = async (slug, deckLocation) => {
    const normalizedDeckLocation = normalizeDeckLocation(deckLocation);

    if (normalizedDeckLocation === DeckLocation.CLOUD) {
      await deleteCloud(slug);
      return;
    }

    if (normalizedDeckLocation === DeckLocation.DEVICE) {
      await removeLocal(slug);
      return;
    }
  };

  return {
    getAllLocal,
    getAllCloud,
    getLocal,
    getCloud,
    saveLocal,
    saveCloud,
    publish,
    createDeviceCopyFromCloud,
    removeLocal,
    deleteDeck
  };
}
