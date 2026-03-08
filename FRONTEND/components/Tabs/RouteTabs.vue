<script setup>
const props = defineProps({
  tabs: {
    type: Array,
    required: true,
  },
});

const route = useRoute();
const router = useRouter();

function normalizePath(path) {
  if (typeof path !== "string") return "";
  if (path.length > 1 && path.endsWith("/")) return path.slice(0, -1);
  return path;
}

const currentPath = computed(() => normalizePath(route.path));

function isActive(path) {
  return normalizePath(path) === currentPath.value;
}

function handleClick(path) {
  if (!path || isActive(path)) return;
  router.push(path);
}
</script>

<template>
  <div class="flex w-full items-center gap-2 rounded-2xl border border-white/10 bg-slate-950/60 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur">
    <button
      v-for="tab in tabs"
      :key="tab.path"
      type="button"
      class="flex min-w-0 flex-1 items-center justify-center rounded-xl border px-3 py-2 text-sm font-semibold transition-all duration-200"
      :class="[
        isActive(tab.path)
          ? 'border-[#ffb27d]/45 bg-[#ff7a18]/20 text-[#ffd7b3] shadow-[0_0_20px_rgba(255,122,24,0.2),inset_0_1px_0_rgba(255,255,255,0.18)]'
          : 'border-[#23324f]/80 bg-[#0f172a]/95 text-[#9fb3d9] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] hover:border-[#31456b] hover:bg-[#13203a] hover:text-[#d2e8ff]',
      ]"
      @click="handleClick(tab.path)"
    >
      <span class="truncate">{{ tab.label }}</span>
    </button>
  </div>
</template>
