import { useNuxtApp } from "#app";
import { DeckLocation } from "~/enums/deckLocation";
import { useSnackbar } from "@/stores/useSnackbar";

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

  const userAuth = useUserAuth();
  const userUuid = userAuth.userLogged.id;

  //
  // BOZZA (IndexedDB via db)
  //
  const saveLocal = async (deck) => {
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
    const deck = await db.get("decks", slug);
    if (!deck) return;
    return db.delete("decks", slug);
  };

  //
  // CLOUD (Supabase via le tue API)
  //
  const getAllCloud = () => fetchUserDecks();
  const getCloud = (slug) => {
    const deck = fetchUserDeckCards(userUuid, slug);
    if(!deck){
      const snackbar = useSnackbar();
      snackbar.addMessage(
        "Deck non trovato sul cloud.",
        "error"
      );
    }

    return deck;
  }
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

  const deleteDeck = async (slug, deckLocation) => {
    // Rimuovo sia localmente che sul cloud
    
    if (deckLocation === DeckLocation.CLOUD) {
      await deleteCloud(slug);
      return;
    } else if (deckLocation === DeckLocation.BOZZA) {
      await removeLocal(slug);
      return;
    }
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
