import { defineNuxtPlugin } from "#app";
import { openDB, type DBSchema } from "idb";

console.log("[indexeddb.client.ts] plugin caricato");

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
}

export default defineNuxtPlugin(async (nuxtApp) => {
  console.log("[indexeddb] plugin sta partendo");
  const db = await openDB<DecksDB>("deck-builder", 1, {
    upgrade(db) {
      const store = db.createObjectStore("decks", { keyPath: "slug" });
      store.createIndex("by-slug", "slug");
    },
  });
  // inietto su $deckDb
  nuxtApp.provide("deckLocalDb", db);
  console.log("[indexeddb] plugin ha fornito db:", db);
});
