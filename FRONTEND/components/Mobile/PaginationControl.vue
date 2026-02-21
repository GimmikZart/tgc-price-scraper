<script setup>
import { Icon } from "@iconify/vue";

const props = defineProps({
  page: {
    type: Number,
    default: 1,
  },
  totalPages: {
    type: Number,
    default: 1,
  },
  label: {
    type: String,
    default: "Pagina",
  },
  disabled: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(["update:page"]);

const safePage = computed(() => {
  const parsedPage = Number(props.page);
  if (!Number.isFinite(parsedPage) || parsedPage < 1) return 1;
  return parsedPage;
});

const safeTotalPages = computed(() => {
  const parsedTotalPages = Number(props.totalPages);
  if (!Number.isFinite(parsedTotalPages) || parsedTotalPages < 1) return 1;
  return parsedTotalPages;
});

const canGoPrevPage = computed(() => !props.disabled && safePage.value > 1);
const canGoNextPage = computed(() => !props.disabled && safePage.value < safeTotalPages.value);

function setPage(nextPage) {
  if (props.disabled) return;

  const boundedPage = Math.max(1, Math.min(safeTotalPages.value, Number(nextPage) || 1));
  if (boundedPage === safePage.value) return;
  emit("update:page", boundedPage);
}
</script>

<template>
  <div class="flex w-full flex-col items-center justify-center gap-1 rounded-2xl px-1 pb-2 pt-2 text-slate-200/85">
    <span class="text-[10px] uppercase tracking-[0.08em] text-slate-400/90">{{ label }}</span>
    <div class="flex h-9 w-full items-center justify-between rounded-xl border border-white/15 bg-white/5 px-1">
      <button
        type="button"
        class="inline-flex h-7 w-7 items-center justify-center rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-35 hover:bg-white/10"
        :disabled="!canGoPrevPage"
        @click="setPage(safePage - 1)"
      >
        <Icon icon="lucide:chevron-left" class="text-base" />
      </button>

      <span class="text-[12px] font-semibold leading-none tabular-nums">
        {{ safePage }} / {{ safeTotalPages }}
      </span>

      <button
        type="button"
        class="inline-flex h-7 w-7 items-center justify-center rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-35 hover:bg-white/10"
        :disabled="!canGoNextPage"
        @click="setPage(safePage + 1)"
      >
        <Icon icon="lucide:chevron-right" class="text-base" />
      </button>
    </div>
  </div>
</template>
