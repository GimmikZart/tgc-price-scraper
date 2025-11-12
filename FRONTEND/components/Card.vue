<script setup>
import { Icon } from "@iconify/vue";
import { ref, computed } from "vue";

const props = defineProps({
  card: { type: Object, required: true },
  chooseCard: { type: Boolean, default: false },
  handleCards: { type: Boolean, default: false },
  disableOpening: { type: Boolean, default: false },
  cardCount: { type: Number, default: 0 },
  showCount: { type: Boolean, default: false },
  showPrice: { type: Boolean, default: false },
});
const emit = defineEmits(["remove-card", "add-card", "choose-card", "open"]);
const isLoaded = ref(false);

const cardClass = computed(() => ({
  "border-[1px] border-white/30 rounded-lg": props.handleCards || !isLoaded.value,
  "relative": props.showCount || props.showPrice
}));

function onLoad() { isLoaded.value = true; }
function openCard() { if (!props.disableOpening) emit("open", props.card); }
</script>

<template>
  <div :key="card.id" class="h-full flex flex-col" :class="cardClass">
    <!-- Skeleton -->
    <v-skeleton-loader
      v-if="!isLoaded"
      type="image"
      color="black"
      class="image-skeleton w-full overflow-hidden aspect-[63/88]"
    />
    
    <!-- CARD NUMBER LABEL -->
    <div v-if="!handleCards && showCount" class="absolute top-0 right-1/2 translate-x-1/2 py-0 px-4 bg-black text-white text-xs rounded-b-lg">
      x {{ cardCount }}
    </div>

    <!-- Immagine -->
    <div class="relative flex flex-col justify-end rounded-lg h-full" :class="{'bg-white/20' : showPrice}">
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
      <div v-if="showPrice && isLoaded" class="p-1">
        <p class="text-xs truncate p-1">{{ card.setName }}</p>
        <a class="w-full rounded-lg bg-black/70 flex justify-between text-black items-center px-4 py-1 block text-white text-center" :href="card.price ? card.slugs[0].url : '#'" target="_blank" rel="noopener noreferrer">
          <span class="text-xs">CardTrader</span>
          <Icon class="text-xs" icon="mdi:arrow-right" />
          <span class="font-bold text-xs">{{ card.price ?? '---' }} €</span>
        </a>
      </div>
      
    </div>
    <div
      v-show="handleCards && isLoaded"
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
    
    <v-btn
      v-if="chooseCard && isLoaded"
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
