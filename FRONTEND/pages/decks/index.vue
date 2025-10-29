<script setup>
import { Icon } from "@iconify/vue";
import { fetchUserDecks } from "@/api/decks";
import { DeckLocation } from "~/enums/deckLocation";
const router = useRouter();
const gs = useGlobalSettings();
const { getAllLocal, getAllCloud } = useDeckManager();

const cloudDecks = ref([]);
const localDecks = ref([]);

function goToDeck(deck, location) {
  router.push(`/decks/${deck.slug}?location=${location}`);
}

definePageMeta({
  ssr: false,
});

onMounted(async () => {
  cloudDecks.value = await getAllCloud();
  localDecks.value = await getAllLocal();
});
</script>
<template>
  <section class="relative h-full">
    <Toolbar label="Mazzi"> </Toolbar>
    <v-container class="flex flex-col justify-start grow relative gap-5">
      <div class="grid grid-cols-1 gap-5">
        <DecksItem
          v-for="(deck, idx) in cloudDecks"
          :key="idx"
          :leader-id="deck.leader"
          :current-deck="deck"
          @click="goToDeck(deck, DeckLocation.CLOUD)"
        />
        <DecksItem
          v-for="(deck, idx) in localDecks"
          :key="idx"
          :leader-id="deck.leader"
          :current-deck="deck"
          @click="goToDeck(deck, DeckLocation.BOZZA)"
        />
      </div>
    </v-container>
    <MobileFloatMenu :cols="2">
      <template #buttons>
        <DialogsImportDeck />
        <DialogsHandleDeck />
      </template>
    </MobileFloatMenu>
  </section>
</template>
