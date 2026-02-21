<script setup>
const props = defineProps({
  modelValue: {
    type: Array,
    default: () => [],
  },
  tagOptions: {
    type: Array,
    default: () => [],
  },
});

const emit = defineEmits(["update:modelValue", "close"]);

const selectedTags = computed({
  get: () => props.modelValue,
  set: (value) => emit("update:modelValue", value),
});

const activeFiltersCount = computed(() => {
  return selectedTags.value.length > 0 ? 1 : 0;
});

function resetFilters() {
  selectedTags.value = [];
}

function closeOverlay() {
  emit("close");
}
</script>

<template>
  <CardViewFilterWrapper
    title="Filtra amici"
    subtitle="Community"
    :active-filters-count="activeFiltersCount"
    @close="closeOverlay"
    @confirm="closeOverlay"
    @reset="resetFilters"
  >
    <div class="filter-grid">
      <div class="filter-item-shell">
        <InputSelect
          v-model="selectedTags"
          :items="tagOptions"
          autocomplete
          multiple
          label="Filtra per tag"
        />
      </div>
    </div>

    <p
      v-if="tagOptions.length === 0"
      class="mt-3 text-center text-sm text-slate-300/75"
    >
      Nessun tag disponibile.
    </p>
  </CardViewFilterWrapper>
</template>

<style scoped>
.filter-grid {
  display: grid;
  grid-template-columns: repeat(1, minmax(0, 1fr));
  gap: 0.75rem;
}

.filter-item-shell {
  border: 1px solid rgba(255, 255, 255, 0.11);
  border-radius: 0.9rem;
  background: linear-gradient(130deg, rgba(17, 24, 39, 0.66), rgba(8, 12, 20, 0.9));
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.08),
    0 10px 20px rgba(0, 0, 0, 0.22);
  padding: 0.5rem;
}
</style>
