<script setup lang="ts">
import { useElementBounding } from "@vueuse/core";
import { useMyBreakpoints } from "@/composables/useMyBreakpoints";

const props = defineProps({
  cols: {
    type: Number,
    default: 2,
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

const floatMenu = ref(null);
const menuOpen = ref(false);
const { height } = useElementBounding(floatMenu);

const gridColsMap: Record<number, string> = {
  1: "grid-cols-1",
  2: "grid-cols-2",
  3: "grid-cols-3",
  4: "grid-cols-4",
  5: "grid-cols-5",
  6: "grid-cols-6",
};

const showMenu = computed(() => {
  if (props.closeable) return menuOpen.value;
  return true;
});

const fromBottomCalc = computed(() => {
  if (props.fromBottom !== null) return props.fromBottom;
  return globalSettings.navbarHeight - 1;
});

const gridColsClass = computed(() => {
  return gridColsMap[props.cols] ?? "grid-cols-2";
});

watch(
  height,
  (newHeight) => {
    globalSettings.floatMenuHeight = newHeight;
  },
  { immediate: true },
);
</script>

<template>
  <div
    v-if="isMobile"
    ref="floatMenu"
    id="float-menu"
    class="pointer-events-none fixed inset-x-0 z-[1000] flex justify-center"
    :style="{ bottom: `${fromBottomCalc}px` }"
  >
    <div
      class="pointer-events-auto w-full max-w-[520px] rounded-t-3xl border border-white/10 bg-[rgba(12,20,33,0.80)] shadow-[0_20px_44px_rgba(0,0,0,0.58),inset_0_1px_0_rgba(255,255,255,0.1)] backdrop-blur-2xl"
    >
      <div v-if="closeable" class="flex items-center justify-center gap-2 px-3 pb-1 pt-2">
        <slot name="handle" />
        <button
          type="button"
          class="inline-flex h-6 w-6 items-center justify-center rounded-full text-slate-300/80 transition-colors hover:text-slate-100"
          :aria-expanded="showMenu"
          @click="menuOpen = !menuOpen"
        >
          <svg
            viewBox="0 0 12 12"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
            class="h-4 w-4 transition-transform duration-200"
            :class="menuOpen ? 'rotate-180' : ''"
          >
            <path
              d="M2.2 4.5L6 8.1L9.8 4.5"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </button>
      </div>

      <v-expand-transition>
        <div
          v-show="showMenu"
          class="grid gap-2 px-2 pb-2 pt-1"
          :class="gridColsClass"
        >
          <slot name="buttons" />
        </div>
      </v-expand-transition>
    </div>
  </div>
</template>
