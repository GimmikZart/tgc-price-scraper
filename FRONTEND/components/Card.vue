<script setup>
import { Icon } from "@iconify/vue";
const props = defineProps({
  card: { type: Object, required: true },
  handleCards: { type: Boolean, default: false },
  chooseCard: { type: Boolean, default: false },
  disableOpening: { type: Boolean, default: false },
  cardCount: { type: Number, default: 0 },
});
const emit = defineEmits(["remove-card", "add-card", "choose-card", "open"]);
const isLoaded = ref(false);

const cardClass = computed(() => {
  return { 
    'border-[1px] border-white/30 rounded-lg': props.handleCards || !isLoaded.value ,
    'relative': !isLoaded.value 
  }
})


function onLoad() {
  isLoaded.value = true;
}
function openCard() {
  if (!props.disableOpening) emit("open", props.card);
}

</script>

<template>
  <div :key="card.id" class="h-auto flex flex-col justify-between overflow-hidden" :class="cardClass">
    <h5 v-if="!isLoaded" class="absolute bottom-0 left-0 w-full text-italic text-center py-3 truncate text-sm z-[2]">{{ card.name }}</h5>
    <v-skeleton-loader type="image" v-if="!isLoaded" color="black" class="image-skeleton w-full overflow-hidden aspect-[63/88]" />
    <NuxtImg
      v-show="card.image"
      :src="card.image"
      format="webp"
      loading="lazy"
      width="100%"
      class="border shadow-md cursor-zoom-in z-2"
      :class="{
        'h-[1px]': !isLoaded,
        'h-auto': isLoaded
      }"
      fit="cover"
      :alt="card.name"
      @load="onLoad"
      @click="openCard()"
    />

    <!-- Tasti collezione -->
    <Transition
      appear
      enter-active-class="transition-all duration-300 ease-out"
      enter-from-class="-translate-y-full"
      enter-to-class="translate-y-0"
      leave-active-class="transition-all duration-0 ease-out"
      leave-from-class="translate-y-0"
      leave-to-class="-translate-y-full"
    >
      <div v-if="handleCards && isLoaded" class="flex gap-3 items-center justify-between -z-1">
        <div class="w-full flex items-center justify-between">
          <v-btn variant="tonal" color="white" @click="$emit('remove-card')">
            <v-icon size="25" color="red">mdi-minus</v-icon>
          </v-btn>
          <span class="text-xl">{{ cardCount }}</span>
          <v-btn variant="tonal" color="white" @click="$emit('add-card')">
            <v-icon size="25" color="green">mdi-plus</v-icon>
          </v-btn>
        </div>
      </div>
    </Transition>

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
