import { defineNuxtPlugin } from "#app";
import { openDB, type DBSchema } from "idb";

/** Definisci qui il tuo schema */
interface DecksDB extends DBSchema {
  decks: {
    key: string;
    value: {
      name: string;
      slug: string;
      leader: string | null;
      cards: string[];
      visibility: string;
      location: string;
    };
    indexes: {
      "by-slug": string;
    };
  };
  gameAssets: {
    key: string;
    value: {
      key: string;
      game: string;
      asset: string;
      version: string | number | null;
      updatedAt: number;
      payload: unknown;
    };
    indexes: {
      "by-game": string;
    };
  };
}

export default defineNuxtPlugin(async (nuxtApp) => {
  const db = await openDB<DecksDB>("deck-builder", 2, {
    upgrade(db, oldVersion) {
      if (oldVersion < 1 && !db.objectStoreNames.contains("decks")) {
        const store = db.createObjectStore("decks", { keyPath: "slug" });
        store.createIndex("by-slug", "slug");
      }

      if (oldVersion < 2 && !db.objectStoreNames.contains("gameAssets")) {
        const store = db.createObjectStore("gameAssets", { keyPath: "key" });
        store.createIndex("by-game", "game");
      }
    },
  });
  // inietto su $deckDb
  nuxtApp.provide("deckLocalDb", db);
});
