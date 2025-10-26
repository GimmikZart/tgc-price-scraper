<script setup>
import { Icon } from "@iconify/vue";
import { ref, computed } from "vue";

const props = defineProps({
  card: { type: Object, required: true },
  handleCards: { type: Boolean, default: false },
  chooseCard: { type: Boolean, default: false },
  disableOpening: { type: Boolean, default: false },
  cardCount: { type: Number, default: 0 },
});
const emit = defineEmits(["remove-card", "add-card", "choose-card", "open"]);
const isLoaded = ref(false);

const cardClass = computed(() => ({
  "border-[1px] border-white/30 rounded-lg": props.handleCards || !isLoaded.value,
}));

function onLoad() { isLoaded.value = true; }
function openCard() { if (!props.disableOpening) emit("open", props.card); }
</script>

<template>
  <div :key="card.id" class="h-auto flex flex-col overflow-hidden" :class="cardClass">
    <!-- Skeleton -->
    <v-skeleton-loader
      v-if="!isLoaded"
      type="image"
      color="black"
      class="image-skeleton w-full overflow-hidden aspect-[63/88]"
    />

    <!-- Immagine -->
    <NuxtImg
      v-show="card.image"
      :src="card.image"
      format="webp"
      loading="lazy"
      class="border shadow-md cursor-zoom-in block w-full"
      :class="{ 'h-[1px]': !isLoaded, 'h-auto': isLoaded }"
      fit="cover"
      :alt="card.name"
      @load="onLoad"
      @click="openCard()"
      placeholder
    />

    <!-- Tasti collezione - espansione in altezza -->
    <v-expand-transition>
      <div
        v-if="handleCards && isLoaded"
        class="overflow-hidden" 
      >
        <div class="flex gap-3 items-center justify-between px-1 py-1">
          <v-btn variant="tonal" color="white" @click="cardCount >= 1 ? $emit('remove-card') : null">
            <v-icon size="25" color="red">mdi-minus</v-icon>
          </v-btn>
          <span class="text-xl">{{ cardCount }}</span>
          <v-btn variant="tonal" color="white" @click="$emit('add-card')">
            <v-icon size="25" color="green">mdi-plus</v-icon>
          </v-btn>
        </div>
      </div>
    </v-expand-transition>

    <v-btn
      v-if="chooseCard"
      class="bg-gray-500"
      block
      variant="outlined"
      @click="$emit('choose-card')"
    >
      SCEGLI
    </v-btn>
  </div>
</template>

<style>
.v-skeleton-loader.image-skeleton .v-skeleton-loader__bone.v-skeleton-loader__image {
  height: 100%;
  border-radius: 0;
}
</style>
