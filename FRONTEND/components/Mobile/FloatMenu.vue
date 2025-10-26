<script setup lang="ts">
import { useMyBreakpoints } from "@/composables/useMyBreakpoints";
import { Icon } from "@iconify/vue";

const props = defineProps({
  cols: { 
    type: Number, 
    default: 2 
  },
  fromBottom: {
    type: String,
    default: "bottom-[60px]",
  },
  closeable: {
    type: Boolean,
    default: false,
  },
});
const { isMobile } = useMyBreakpoints();
const menuOpen = ref(false);

const showMenu = computed(() => {
  if (props.closeable == true) return menuOpen.value;
  return true;
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
    class="fixed left-0 w-full h-auto bg-black rounded-t-3xl z-10" 
    :class="fromBottom"
  > 
    <div v-if="closeable" class="flex justify-center py-1">
      <Icon icon="icons8:chevron-up-round" class="text-2xl" :class="{'rotate-180': menuOpen}" @click="menuOpen = !menuOpen"/>
    </div>
    <div v-show="showMenu" class="grid gap-2" :class="gridCols">
      <slot name="buttons" />
    </div>
  </div>
</template>
