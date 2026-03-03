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

function isActive(value) {
  return value === props.active;
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
          ? 'border-[#ffb27d]/45 bg-[#ff7a18]/20 text-[#ffd7b3] shadow-[0_0_20px_rgba(255,122,24,0.2),inset_0_1px_0_rgba(255,255,255,0.18)]'
          : 'border-[#23324f]/80 bg-[#0f172a]/95 text-[#9fb3d9] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] hover:border-[#31456b] hover:bg-[#13203a] hover:text-[#d2e8ff]',
      ]"
      @click="handleClick(tab.value)"
    >
      <span class="truncate">{{ tab.label }}</span>
    </button>
  </div>
</template>
