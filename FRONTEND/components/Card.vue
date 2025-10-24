<script setup>
import { Icon } from "@iconify/vue";
const props = defineProps({
  card: {
    type: Object,
    required: true,
  },
  handleCards: {
    type: Boolean,
    default: false,
  },
  chooseCard: {
    type: Boolean,
    default: false,
  },
  disableOpening: {
    type: Boolean,
    default: false,
  },
  cardCount: {
    type: Number,
    default: 0,
  },
});

const emit = defineEmits(["remove-card", "add-card", "choose-card"]);
const cardIsOpen = ref(false);
function openCard() {
  if (!props.disableOpening) cardIsOpen.value = true;
}
</script>
<template>
  <div
    class="flex flex-col justify-between"
    :class="{ 'border-[1px] border-white/30 rounded-lg': handleCards }"
  >
    <Transition
      appear
      enter-active-class="transition-all duration-300 ease-out"
      enter-from-class="translate-y-full"
      enter-to-class="translate-y-0"
      leave-active-class="transition-all duration-300 ease-out"
      leave-from-class="translate-y-0"
      leave-to-class="translate-y-full"
    >
      <div v-if="handleCards" class="p-2 z-1">
        <h3 class="font-bold mb-1">{{ card.name }}</h3>
        <h4 class="text-[10px]">{{ card.setName }}</h4>
      </div>
    </Transition>
    <NuxtImg
      v-if="card.image"
      :src="card.image"
      format="webp"
      loading="lazy"
      width="100%"
      height="auto"
      class="border shadow-md cursor-zoom-in z-2"
      fit="cover"
      @click="openCard()"
      :alt="card.name"
    >
    </NuxtImg>
    <!-- TASTI COLLEZIONE -->
    <Transition
      appear
      enter-active-class="transition-all duration-300 ease-out"
      enter-from-class="-translate-y-full"
      enter-to-class="translate-y-0"
      leave-active-class="transition-all duration-300 ease-out"
      leave-from-class="translate-y-0"
      leave-to-class="-translate-y-full"
    >
      <div
        v-if="handleCards"
        class="flex gap-3 items-center justify-between z-1"
      >
        <div class="w-full flex items-center justify-between">
          <v-btn variant="tonal" color="white" @click="emit('remove-card')">
            <v-icon size="25" color="red">mdi-minus</v-icon>
          </v-btn>
          <span class="text-xl">{{ cardCount }}</span>
          <v-btn variant="tonal" color="white" @click="emit('add-card')">
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
      @click="emit('choose-card')"
    >
      SCEGLI
    </v-btn>

    <!-- CARTA APERTA -->
    <Teleport to="body">
      <div
        v-if="cardIsOpen"
        class="fixed inset-0 bg-black/80 flex flex-col overflow-auto items-center justify-center pb-[90px] pt-[50px] gap-3 h-dvh z-50 px-10 cursor-zoom-out"
      >
        <div id="blocco_1" class="text-center flex-shrink-0">
          <h3
            class="text-white/80 bg-black/50 p-1 rounded-lg font-light text-sm text-center"
          >
            {{ card.setName }}
          </h3>
          <h3 class="text-white font-bold text-3xl">{{ card.name }}</h3>
          <h4 class="text-white">{{ card.code }}</h4>
        </div>

        <div id="blocco_2" class="relative w-full rounded-xl">
          <Icon 
            icon="carbon:close-filled" 
            size=""
            class="absolute -pa-2 -right-8 -top-8 text-black bg-white rounded-full text-5xl z-20"
            @click="cardIsOpen = false" 
          />
          <NuxtImg
            :src="card.image"
            format="webp"
            loading="lazy"
            class="w-full relative z-10"
            fit="contain"
            :alt="card.name"
          >
          </NuxtImg>
        </div>
        <div id="blocco_3" class="flex-shrink-0 flex flex-col items-center gap-3">
          <slot name="open-bottom" />
        </div>
      </div>
    </Teleport>
  </div>
</template>
