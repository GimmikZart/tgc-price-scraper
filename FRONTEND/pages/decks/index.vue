<script setup>
import { Icon } from "@iconify/vue";

const router = useRouter();
const mobileFloatMenu = useMobileFloatMenu();
const deckStore = useDeckStore();
const deckLists = computed(() => deckStore.decksList);
</script>
<template>
  <section class="relative h-full">
    <Toolbar label="Decks"> </Toolbar>
    <v-container class="flex flex-col justify-start grow relative gap-5">
      <div class="grid grid-cols-2 gap-5">
        <div
          v-for="(deck, idx) in deckLists"
          :key="idx"
          @click="() => router.push(`/decks/edit/${deck.slug}`)"
          class="flex bg-white p-5 flex-col items-center justify-center rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 cursor-pointer"
        >
          <h3 class="text-black font-bold text-2xl">
            {{ deck.name }}
          </h3>
          <h5 class="text-black">{{ deck.cards.length }} cards</h5>
        </div>
      </div>
    </v-container>
    <MobileFloatMenu :menu-open="mobileFloatMenu.open">
      <template #buttons>
        <DialogsHandleDeck />
      </template>
    </MobileFloatMenu>
  </section>
</template>
