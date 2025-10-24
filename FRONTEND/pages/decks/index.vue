<script setup>
import { Icon } from "@iconify/vue";
import { fetchUserDecks } from "@/api/decks";

const router = useRouter();
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
      <div class="p-5 text-center border-[2px] border-white rounded-lg">
        I TUOI MAZZI
      </div>
      <div class="grid grid-cols-2 gap-5">
        <div
          class="flex bg-white p-5 flex-col items-center justify-center rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 cursor-pointer"
        >
          <DialogsHandleDeck />
        </div>
        <div
          v-for="(deck, idx) in cloudDecks"
          :key="idx"
          @click="goToDeck(deck)"
          class="flex bg-white p-5 flex-col items-center justify-center rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 cursor-pointer"
        >
          <h3 class="text-black flex items-center gap-3 font-bold text-2xl">
            {{ deck.name }}
            <Icon
              icon="material-symbols-light:cloud-done-rounded"
              class="text-green-500 ml-2 text-3xl"
            />
          </h3>
          <h5 class="text-black">{{ deck.cards.length }} cards</h5>
        </div>
        <div
          v-for="(deck, idx) in localDecks"
          :key="idx"
          @click="goToDeck(deck)"
          class="flex bg-white p-5 flex-col items-center justify-center rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 cursor-pointer"
        >
          <h3 class="text-black flex items-center gap-3 font-bold text-2xl">
            {{ deck.name }}
            <Icon icon="mdi:offline" class="text-black-500 text-3xl ml-2" />
          </h3>
          <h5 class="text-black">{{ deck.cards.length }} cards</h5>
        </div>
      </div>
    </v-container>
  </section>
</template>
