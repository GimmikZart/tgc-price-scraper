<script setup>
import { Icon } from "@iconify/vue";

const props = defineProps({
  tabs: {
    type: Array,
    required: true,
  },
  active: {
    type: String,
    required: true,
  },
});

const emit = defineEmits(["change"]);

const isActive = (value) => value === props.active;

const handleClick = (value) => {
  if (value === props.active) return;
  emit("change", value);
};
</script>

<template>
  <div class="flex w-full items-center gap-2 rounded-2xl border border-white/10 bg-slate-950/60 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur">
    <button
      v-for="tab in tabs"
      :key="tab.value"
      type="button"
      class="flex min-w-0 flex-1 items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition-all duration-200"
      :class="[
        isActive(tab.value)
          ? 'border-[#ffb27d]/45 bg-[#ff7a18]/20 text-[#ffd7b3] shadow-[0_0_20px_rgba(255,122,24,0.2),inset_0_1px_0_rgba(255,255,255,0.18)]'
          : 'border-transparent bg-transparent text-slate-300/80 hover:border-white/10 hover:bg-white/5 hover:text-slate-100',
      ]"
      @click="handleClick(tab.value)"
    >
      <Icon :icon="tab.icon" class="text-base shrink-0" />
      <span class="truncate">{{ tab.label }}</span>
      <span
        class="rounded-full border px-2 py-0.5 text-[11px] leading-none"
        :class="[
          isActive(tab.value)
            ? 'border-[#ffd4aa]/50 bg-[#ff7a18]/25 text-[#ffe0c2]'
            : 'border-white/15 bg-white/5 text-slate-300/80',
        ]"
      >
        {{ tab.count }}
      </span>
    </button>
  </div>
</template>
