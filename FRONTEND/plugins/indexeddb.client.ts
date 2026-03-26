import { defineNuxtPlugin } from "#app";
import { getDeckLocalDb } from "@/utilities/deckLocalDb";

export default defineNuxtPlugin(async (nuxtApp) => {
  const db = await getDeckLocalDb();
  nuxtApp.provide("deckLocalDb", db);
  nuxtApp.provide("getDeckLocalDb", getDeckLocalDb);
});
