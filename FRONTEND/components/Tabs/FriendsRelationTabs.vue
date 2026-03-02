<script setup>
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

const toneStyles = {
  green: {
    activeButton:
      "border-emerald-300/50 bg-[#14532d] text-emerald-100 shadow-[0_0_18px_rgba(16,185,129,0.22),inset_0_1px_0_rgba(255,255,255,0.16)]",
  },
  orange: {
    activeButton:
      "border-[#ffb27d]/45 bg-[#ff7a18]/20 text-[#ffd7b3] shadow-[0_0_20px_rgba(255,122,24,0.2),inset_0_1px_0_rgba(255,255,255,0.18)]",
  },
  red: {
    activeButton:
      "border-red-300/45 bg-red-950/70 text-red-100 shadow-[0_0_18px_rgba(239,68,68,0.22),inset_0_1px_0_rgba(255,255,255,0.16)]",
  },
};

function resolveToneStyle(tone) {
  return toneStyles[tone] ?? toneStyles.orange;
}

function handleClick(value) {
  if (value === props.active) return;
  emit("change", value);
}
</script>

<template>
  <div class="flex w-full items-center gap-2 rounded-2xl border border-white/10 bg-slate-950/60 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur">
    <button
      v-for="tab in tabs"
      :key="tab.value"
      type="button"
      class="flex min-w-0 flex-1 items-center justify-center rounded-xl border px-3 py-2 text-sm font-semibold transition-all duration-200"
      :class="[
        isActive(tab.value)
          ? resolveToneStyle(tab.tone).activeButton
          : 'border-transparent bg-transparent text-slate-300/80 hover:border-white/10 hover:bg-white/5 hover:text-slate-100',
      ]"
      @click="handleClick(tab.value)"
    >
      <span class="truncate">{{ tab.label }}</span>
    </button>
  </div>
</template>
