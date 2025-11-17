<script setup>
import { getVisibilityLabel } from "~/enums/visibility";
import { Icon } from "@iconify/vue";
const props = defineProps({
  leaderId: {
    type: String,
    required: false,
  },
  currentDeck: {
    type: Object,
    required: true,
  },
});
const { leaderCards } = useOnePieceCards();
const leaderChoosen = computed(() => {
  var found = leaderCards?.find(
    (card) => card.id === props.leaderId
  );
  
  return found;
});
const viewerList = computed(() => leaderChoosen.value ? [leaderChoosen.value] : []);
const { show: viewerOpen, index: viewerIndex, open: openViewer } = useCardViewer(viewerList);

</script>
<template>
  <div
    class="relative text-lg bg-black border-2 p-2 border-white rounded-lg flex text-center font-bold z-0"
  >
    <Card v-if="leaderChoosen" :card="leaderChoosen" class="w-[50px] flex-none" @open="openViewer"/>
    <div v-else  class="w-[50px] aspect-[2/3] bg-gray-800 rounded-sm flex-none" />
    <FullscreenCardViewer
      v-if="leaderChoosen"
      v-model:show="viewerOpen"
      v-model:index="viewerIndex"
      :cards="viewerList"
      @close="viewerOpen = false"
    />
    <div class="w-full h-cover flex items-center justify-between">
      <div class="w-full flex flex-col justify-between px-3 truncate">
        <p class="text-left text-xs">{{ leaderChoosen?.name ?? "Leader Unset"}}</p>
        <p class="w-auto text-left text-xl truncate">
          {{ currentDeck.name}}
        </p>
        <div class="flex gap-3 items-center">
          <p class="text-sm font-normal text-left">
            {{ currentDeck.cards.length }} / 50
          </p>
          <v-chip
            v-if="currentDeck.isLocal"
            color="orange"
            size="small"
            class="text-xs"
          >
            Bozza
            <Icon icon="mdi:offline" class="text-orange text-lg ml-1" />
          </v-chip>
          <v-chip v-else size="small" color="green" class="text-xs">
            {{ getVisibilityLabel(currentDeck.visibility) }}
            <Icon
              icon="material-symbols-light:cloud-done-rounded"
              class="text-green text-lg ml-1"
            />
          </v-chip>
        </div>
      </div>
      
      <div v-if="leaderChoosen" class="w-[20px] h-full grow flex gap-1 flex-col">
        <div
          v-for="(color, idx) in leaderChoosen.color"
          :key="idx"
          :class="`bg-${color.toLowerCase()}`"
          class="text-xs px-2 h-full rounded flex items-center justify-center border-[1px] border-white/20"
        >
        </div>
      </div>
      <div v-else class="w-[20px] h-full grow flex flex-col">
        <div
          class="bg-gray-800 text-xs px-2 h-full rounded flex items-center justify-center border-[1px] border-white/20"
        >
        </div>
      </div>
    </div>
  </div>
</template>