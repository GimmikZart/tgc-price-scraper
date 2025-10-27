<script setup>
import { Icon } from "@iconify/vue";
import { fetchUserDecks } from "@/api/decks";

const router = useRouter();
const gs = useGlobalSettings();
const { getAllLocal, getAllCloud } = useDeckManager();

const cloudDecks = ref([]);
const localDecks = ref([]);

function goToDeck(deck) {
  router.push(`/decks/edit/${deck.slug}`);
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
          @click="goToDeck(deck)"
        />
        <DecksItem
          v-for="(deck, idx) in localDecks"
          :key="idx"
          :leader-id="deck.leader"
          :current-deck="deck"
          @click="goToDeck(deck)"
        />
      </div>
    </v-container>
    <MobileFloatMenu :cols="1">
      <template #buttons>
        <DialogsHandleDeck />
      </template>
    </MobileFloatMenu>
  </section>
</template>
