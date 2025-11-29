<script setup>
const snackbar = useSnackbar();

const props = defineProps({
  singleCardsInDeck: {
    type: Array,
    required: true,
  },
});

const addCardInDeck = inject("addCardInDeck");
const removeCardFromDeck = inject("removeCardFromDeck");
const actionOnDeck = inject("actionOnDeck", 'info');

const viewerList = computed(() => props.singleCardsInDeck);

const categoryCards = computed(() => {
  const groups = {}

  // Raggruppa tutte le carte per type
  for (const card of props.singleCardsInDeck) {
    const type = card.type || "Unknown"
    if (!groups[type]) groups[type] = []
    groups[type].push(card)
  }

  // Converte in array e ordina alfabeticamente per label
  return Object.keys(groups)
    .sort((a, b) => a.localeCompare(b))
    .map((key) => ({
      label: key,
      cards: groups[key],
    }))
})


const { show: viewerOpen, index: viewerIndex, open: openViewer } = useCardViewer(viewerList);

function handleCardCopy(card) {
  if (actionOnDeck.value === "add") {
    if(card.count < 4)
      addCardInDeck(card);
    else 
      snackbar.addMessage("Massimo 4 copie consentite per ogni carta", "error");
  } else if (actionOnDeck.value === "remove") {
    removeCardFromDeck(card);
  } else {
    openViewer(card);
  }
}
</script>
<template>
  <div class="h-auto overflow-auto bg-black p-2 gap-8">
    <p v-if="singleCardsInDeck.length === 0" class="text-center mt-5 text-white/50">Nessuna carta aggiunta fin'ora</p>
    <div v-for="category in categoryCards" :key="category.label" class="pb-10">
      <h2 class="text-white text-xs text-center font-bold mb-3 col-span-full">{{ category.label }}</h2>
      <div class="w-full h-auto grid grid-cols-4 gap-6 px-6">
        <div
          v-for="(card, idx) in category.cards"
          :key="idx"
          class="relative h-fit w-full"
          @click="handleCardCopy(card)"
        >
          <DecksAvailabilityCard :card="card" />
          <Card
            v-for="(copy, ydx) in card.count"
            :key="ydx"
            :card="card"
            class="w-full h-full top-0 left-0"
            :class="{
              absolute: ydx > 0,
              'border-[2px] animate-pulse rounded-lg border-red-500': copy > 4,
            }"
            :style="`transform: translateY(${ydx * 6}px) translateX(${
              ydx * 5
            }px) `"
            @open="openViewer"
            :disable-opening="actionOnDeck !== 'info'"
          />
        </div>
      </div>
    </div>
    <FullscreenCardViewer
      v-model:show="viewerOpen"
      v-model:index="viewerIndex"
      :cards="viewerList"
      @close="viewerOpen = false"
    />
  </div>
</template>
