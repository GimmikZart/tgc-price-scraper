<script setup>
const props = defineProps({
  singleCardsInDeck: {
    type: Array,
    required: true,
  },
});

const addCardInDeck = inject("addCardInDeck");
const removeCardFromDeck = inject("removeCardFromDeck");
const actionOnDeck = inject("actionOnDeck");

const viewerList = computed(() => props.singleCardsInDeck);

const { show: viewerOpen, index: viewerIndex, open: openViewer } = useCardViewer(viewerList);

function handleCardCopy(card) {
  if (actionOnDeck.value === "add") {
    addCardInDeck(card);
  } else if (actionOnDeck.value === "remove") {
    removeCardFromDeck(card);
  } else {
    console.log("open viewer for", card);
    openViewer(card);
  }
}
</script>
<template>
  <div class="h-auto bg-black p-2 gap-8">
    <div class="w-full pb-32 grid grid-cols-4 gap-6 px-6">
      <div
        v-for="(card, idx) in singleCardsInDeck"
        :key="idx"
        class="relative h-fit w-full"
        @click="handleCardCopy(card)"
      >
        <Card
          v-for="(copy, ydx) in card.count"
          :key="ydx"
          :card="card"
          class="w-full top-0 left-0"
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

    <FullscreenCardViewer
      v-model:show="viewerOpen"
      v-model:index="viewerIndex"
      :cards="viewerList"
      @close="viewerOpen = false"
    />
  </div>
</template>
