<script setup>
//TODO: NON FUNZIONA BENE IL ROUTER CHE MANDA QUA DOPO IL SAVE, FIXA
import { useDeckStore } from "@/stores/useDeckStore";
import { Icon } from "@iconify/vue";

const route = useRoute();

const decksStore = useDeckStore();
const deckName = ref("");
const leaderChoosen = ref(null);
const router = useRouter();
const { allCards } = await useOnePieceCards();
const mobileFloatMenu = useMobileFloatMenu();
const cardsInDeck = ref([]);

function goToEditDeck() {
  router.push(`/decks/edit/${route.params.slug}`);
}

onMounted(() => {
  mobileFloatMenu.close();
  const existingDeckInStore = decksStore.getDeckBySlug(route.params.slug);
  if (existingDeckInStore) {
    deckName.value = existingDeckInStore.name;
    leaderChoosen.value = allCards.find(
      (c) => c.id === existingDeckInStore.leader
    );
    existingDeckInStore.cards.forEach((cardId) => {
      const card = allCards.find((c) => c.id === cardId);
      if (card) {
        cardsInDeck.value.push(card);
      }
    });
  }
});

provide("cardsInDeck", cardsInDeck);
</script>
<template>
  <Toolbar :label="`Mazzo ${deckName}`">
    <template #info>
      <div
        class="text-lg bg-black border-[1px] p-2 rounded-lg flex text-center font-bold z-0"
      >
        <Card :card="leaderChoosen" class="w-[50px] flex-none" />
        <div class="w-full h-cover flex items-center justify-between">
          <div class="w-4/5 flex flex-col justify-between px-3 truncate">
            <p class="text-left text-xs">Leader</p>
            <p class="w-auto text-left text-xl truncate">
              {{ leaderChoosen.name }}
            </p>
          </div>
          <div class="w-1/5 h-full grow flex gap-1 flex-col">
            <div
              v-for="(color, idx) in leaderChoosen.color"
              :key="idx"
              :class="`bg-${color.toLowerCase()}`"
              class="text-xs px-2 h-full rounded flex items-center justify-center border-[1px] border-white/20"
            >
              {{ color }}
            </div>
          </div>
        </div>
      </div>
    </template>
  </Toolbar>
  <CardViewDeck />
  <MobileFloatMenu :menu-open="mobileFloatMenu.open">
    <template #buttons>
      <DialogsHandleDelete @delete="deleteDeck" />
      <v-btn
        :disabled="cardsInDeck.length != 50"
        class="text-white"
        variant="text"
        @click="exportDeck"
      >
        <span class="text-xs mr-3">Esporta</span>
        <Icon
          class="text-2xl"
          icon="material-symbols:export-notes-outline"
        ></Icon>
      </v-btn>
      <v-btn @click="goToEditDeck()" variant="text">
        <span class="text-xs mr-3">Edit</span>
        <Icon class="text-2xl" icon="iconoir:wrench"></Icon>
      </v-btn>
    </template>
  </MobileFloatMenu>
</template>
