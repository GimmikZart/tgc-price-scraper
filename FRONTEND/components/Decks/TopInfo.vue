<script setup>
import { getVisibilityLabel } from "~/enums/visibility";
import { Icon } from "@iconify/vue";
const props = defineProps({
  leaderChoosen: {
    type: Object,
    required: false,
  },
  currentDeck: {
    type: Object,
    required: true,
  },
  toggleCards: {
    type: Boolean,
    required: false,
    default: false,
  },
});

const actionOnDeck = inject("actionOnDeck");
const viewerList = computed(() => props.leaderChoosen ? [props.leaderChoosen] : []);
const { show: viewerOpen, index: viewerIndex, open: openViewer } = useCardViewer(viewerList);
</script>
<template>
  <p
    v-if="!leaderChoosen"
    class="text-lg p-2 rounded-lg text-center font-bold z-0"
  >
    SCEGLI IL LEADER
  </p>
  <div
    v-else
    class="text-lg bg-black p-2 px-5 rounded-lg flex text-center font-bold z-0"
  >
    <Card :card="leaderChoosen" class="w-[50px] flex-none" @open="openViewer"/>
    <FullscreenCardViewer
      v-model:show="viewerOpen"
      v-model:index="viewerIndex"
      :cards="viewerList"
      @close="viewerOpen = false"
    />
    <div class="w-full h-cover flex items-center justify-between">
      <div class="w-4/5 flex flex-col justify-between px-3 truncate">
        <p class="text-left text-xs">Leader</p>
        <p class="w-auto text-left text-xl truncate">
          {{ leaderChoosen.name }}
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
            Locale
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
  <div
    v-if="toggleCards"
    class="flex flex-col items-center gap-2 justify-center mt-2"
  >
    <span class="text-xs">AL click sulla carta</span>
    <v-btn-toggle
      base-color="white"
      v-model="actionOnDeck"
      density="compact"
      divided
      variant="tonal"
    >
      <v-btn size="small" color="info" value="info"> Info </v-btn>
      <v-btn size="small" color="success" value="add"> Aggiungi </v-btn>
      <v-btn size="small" color="error" value="remove"> Rimuovi </v-btn>
    </v-btn-toggle>
  </div>
</template>