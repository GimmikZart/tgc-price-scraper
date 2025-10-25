import { useNuxtApp } from "#app";
import {
  fetchUserDecks,
  fetchUserDeckCards,
  saveDeckOnCloud,
  deleteDeckFromCloud
} from "~/api/decks";
import { toRaw } from "vue";

export function useDeckManager() {
  const nuxt = useNuxtApp();
  const db = nuxt.$deckLocalDb; // viene iniettato dal plugin client-only
  console.log("DeckManager initialized with db:", db);

  const userAuth = useUserAuth();
  const userUuid = userAuth.userLogged.id;

  //
  // LOCAL (IndexedDB via db)
  //
  const saveLocal = async (deck) => {
    console.log("save local:", deck);
    const plainDeck = JSON.parse(JSON.stringify(deck));
    return db.put("decks", plainDeck);
  };

  const getAllLocal = async () => {
    const decks = await db.getAll("decks");
    decks.forEach((deck) => {
      deck.isLocal = true; // Aggiungo un flag per identificare i mazzi locali
    });
    return decks;
  };

  const getLocal = async (slug) => {
    const deck = await db.get("decks", slug);
    if (!deck) return;
    deck.isLocal = true; // Aggiungo un flag per identificare i mazzi locali
    return deck;
  };

  const removeLocal = async (slug) => {
    return db.delete("decks", slug);
  };

  //
  // CLOUD (Supabase via le tue API)
  //
  const getAllCloud = () => fetchUserDecks();
  const getCloud = (slug) => fetchUserDeckCards(userUuid, slug);
  const saveCloud = (deck) => saveDeckOnCloud(deck);
  const deleteCloud = (slug) => deleteDeckFromCloud(userUuid, slug);

  //
  // LOGICA DI PUBBLICAZIONE / EDIT
  //
  const publish = async (deck) => {
    await saveCloud(deck);
    await removeLocal(deck.slug);
  };

  const createDraftFromCloud = async (slug) => {
    const deck = await getCloud(slug);
    await saveLocal(deck);
    return deck;
  };

  const deleteDeck = async (slug) => {
    // Rimuovo sia localmente che sul cloud
    await removeLocal(slug);
    await deleteCloud(slug);
  }

  return {
    getAllLocal,
    getAllCloud,
    getLocal,
    getCloud,
    saveLocal,
    saveCloud,
    publish,
    createDraftFromCloud,
    removeLocal,
    deleteDeck
  };
}
