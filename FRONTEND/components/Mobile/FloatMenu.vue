<script setup lang="ts">
import { useMyBreakpoints } from "@/composables/useMyBreakpoints";

const props = defineProps({
  cols: { 
    type: Number, 
    default: 2 
  },
});
const { isMobile } = useMyBreakpoints();

const gridCols = computed(() => {
  switch (props.cols) {
    case 1:
      return 'grid-cols-1';
    case 2:
      return 'grid-cols-2';
    case 3:
      return 'grid-cols-3';
    case 4:
      return 'grid-cols-4';
    case 5:
      return 'grid-cols-5';
    case 6:
      return 'grid-cols-6';
    default:
      return 'grid-cols-2';
  }
});
</script>

<template>
  <div
    v-if="isMobile"
    
  > 
    <div class="grid gap-2 fixed left-0 bottom-[60px] w-full h-auto z-2 bg-black rounded-t-3xl" :class="gridCols">
      <slot name="buttons" />
    </div>
  </div>
</template>
