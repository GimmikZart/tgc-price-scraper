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
function openCard() {
  if (!props.disableOpening) emit("open", props.card);
}
</script>

<template>
  <div class="flex flex-col justify-between" :class="{ 'border-[1px] border-white/30 rounded-lg': handleCards }">
    <NuxtImg
      v-if="card.image"
      :src="card.image"
      format="webp"
      loading="lazy"
      width="100%"
      height="auto"
      class="border shadow-md cursor-zoom-in z-2"
      fit="cover"
      :alt="card.name"
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
      <div v-if="handleCards" class="flex gap-3 items-center justify-between -z-1">
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
