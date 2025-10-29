<script setup lang="ts">
import { useMyBreakpoints } from "@/composables/useMyBreakpoints";
import { Icon } from "@iconify/vue";
import { useElementBounding  } from '@vueuse/core'

const props = defineProps({
  cols: { 
    type: Number, 
    default: 2 
  },
  fromBottom: {
    type: Number,
    default: null,
  },
  closeable: {
    type: Boolean,
    default: false,
  },
});
const { isMobile } = useMyBreakpoints();
const globalSettings = useGlobalSettings();

const menuOpen = ref(false);
const floatMenu = ref(null);
const { height } = useElementBounding(floatMenu);

watch(height, ( newHeight ) => {
  globalSettings.floatMenuHeight = newHeight;
}, { immediate: true });

const showMenu = computed(() => {
  if (props.closeable == true) return menuOpen.value;
  return true;
});

const fromBottomCalc = computed(() => {
  if (props.fromBottom !== null) return props.fromBottom;
  return globalSettings.navbarHeight - 1; // -1 per il bug grafico che crea uno spazietto sotto al flat menu
});


const gridCols = computed(() => {
  switch (props.cols) {
    case 1:
      return ' grid-cols-1 ';
    case 2:
      return ' grid-cols-2 ';
    case 3:
      return ' grid-cols-3 ';
    case 4:
      return ' grid-cols-4 ';
    case 5:
      return ' grid-cols-5 ';
    case 6:
      return ' grid-cols-6 ';
    default:
      return ' grid-cols-2 ';
  }
});
</script>

<template>
  <div
    v-if="isMobile"
    ref="floatMenu"
    id="float-menu"
    class="fixed left-0 w-full h-auto bg-black border-t-2 border-white/10 rounded-t-2xl px-5 py-1 z-[1000] transform-none" 
    :style="`bottom:${fromBottomCalc}px`"
  > 
    <div v-if="closeable" class="flex justify-center py-1">
      <slot name="handle"/>
      <Icon icon="icons8:chevron-up-round" class="text-2xl transition-all" :class="{'rotate-180': menuOpen}" @click="menuOpen = !menuOpen" />
    </div>
    <v-expand-transition>
      <div v-show="showMenu" class="grid gap-2" :class="gridCols">
        <slot name="buttons" />
      </div>
    </v-expand-transition>
    
  </div>
</template>
