<script setup>
import { useRouter } from "vue-router";
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useSlots, watch } from "vue";
import { useSnackbar } from '@/stores/useSnackbar'

const route = useRoute();
const router = useRouter();
const slots = useSlots();
const snackbar = useSnackbar()

const props = defineProps({
  label: {
    type: String,
    required: true,
  },
  vertical: {
    type: Boolean,
    default: false,
  },
  backButton: {
    type: Boolean,
    default: false,
  },
  fixed: {
    type: Boolean,
    default: false,
  },
});

function goBack() {
  router.back();
}

const hasInfo = computed(() => Boolean(slots.info));
const toolbarEl = ref(null);
const reservedHeight = ref(0);
let resizeObserver = null;

function updateReservedHeight() {
  if (!props.fixed) {
    reservedHeight.value = 0;
    return;
  }

  if (!toolbarEl.value) return;
  reservedHeight.value = toolbarEl.value.offsetHeight;
}

watch(() => hasInfo.value, () => nextTick(updateReservedHeight));

onMounted(() => {
  if (!props.fixed) return;

  nextTick(updateReservedHeight);

  if (typeof ResizeObserver !== "undefined") {
    resizeObserver = new ResizeObserver(updateReservedHeight);
    resizeObserver.observe(toolbarEl.value);
  }

  window.addEventListener("resize", updateReservedHeight);
});

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  window.removeEventListener("resize", updateReservedHeight);
});
</script>
<template>
  <div class="w-full">
    <div
      ref="toolbarEl"
      class="left-0 top-0 z-[30] w-full px-2 pb-2 pt-2"
      :class="fixed ? 'fixed' : 'sticky'"
    >
      <div
        class="relative overflow-hidden rounded-2xl border border-white/15 bg-slate-950/75 shadow-[0_18px_40px_rgba(0,0,0,0.58),inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-2xl"
      >
        <div class="pointer-events-none absolute inset-x-3 top-0 h-px bg-gradient-to-r from-transparent via-white/45 to-transparent" />

        <div
          class="flex gap-2 p-2"
          :class="vertical ? 'flex-col items-stretch' : 'items-center'"
        >
          <div class="flex min-w-0 flex-1 items-center gap-2">
            <v-btn
              v-if="backButton"
              variant="text"
              size="small"
              density="comfortable"
              @click="goBack"
              icon
              class="!h-9 !w-9 !min-w-0 rounded-xl border border-white/15 bg-white/[0.03] text-slate-200/85 transition-all duration-200 hover:border-[#ffb27d]/35 hover:bg-[#ff7a18]/15 hover:text-[#ffd1a9]"
            >
              <v-icon size="22" icon="mdi-chevron-left"></v-icon>
            </v-btn>

            <div
              class="relative min-w-0 flex-1 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2"
            >
              <span class="pointer-events-none absolute inset-y-2 left-0 w-[3px] rounded-r-full bg-[#ff9d52] shadow-[0_0_18px_rgba(255,122,24,0.7)]" />
              <h2 class="truncate pl-2 text-base font-semibold tracking-wide text-slate-100 md:text-lg">
                {{ label }}
              </h2>
            </div>
          </div>

          <div
            class="flex items-center gap-2"
            :class="vertical ? 'w-full flex-wrap justify-end' : 'shrink-0 justify-end'"
          >
            <slot name="actions" />
          </div>
        </div>

        <div v-if="!route.meta.hideFloatSnackbar && snackbar.currentTimed" class="px-2 pb-2">
          <TimedSnackbarList />
        </div>

        <div
          v-if="hasInfo"
          class="border-t rounded-2xl border-white/10 bg-white/[0.03] px-2 pb-2 pt-2"
        >
          <slot name="info" />
        </div>
      </div>
    </div>

    <div v-if="fixed" aria-hidden="true" :style="{ height: `${reservedHeight}px` }" />
  </div>
</template>
