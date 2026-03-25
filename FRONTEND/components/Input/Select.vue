<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from "vue";

const props = defineProps({
  items: {
    type: Array,
    default: () => [],
  },
  label: {
    type: String,
    default: "Select",
  },
  modelValue: {
    default: () => null,
  },
  autocomplete: {
    type: Boolean,
    default: false,
  },
  multiple: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(["update:modelValue"]);

const overlayOpen = ref(false);
const searchQuery = ref("");
const searchInputRef = ref(null);

const normalizedItems = computed(() =>
  props.items.map((item) => normalizeItem(item)),
);

const selectedValues = computed(() => {
  if (props.multiple) {
    return Array.isArray(props.modelValue) ? props.modelValue : [];
  }

  return props.modelValue === null || props.modelValue === undefined
    ? []
    : [props.modelValue];
});

const selectedItems = computed(() =>
  normalizedItems.value.filter((item) =>
    selectedValues.value.some((value) => areValuesEqual(value, item.value)),
  ),
);

const displayValue = computed(() => {
  if (!selectedItems.value.length) return "";
  return selectedItems.value.map((item) => item.title).join(", ");
});

const filteredItems = computed(() => {
  const normalizedQuery = normalizeString(searchQuery.value);
  if (!normalizedQuery) return normalizedItems.value;

  return normalizedItems.value.filter((item) =>
    normalizeString(item.title).includes(normalizedQuery),
  );
});

watch(overlayOpen, async (isOpen) => {
  document.documentElement.classList.toggle("overflow-hidden", isOpen);

  if (!isOpen || !props.autocomplete) return;

  await nextTick();
  searchInputRef.value?.focus();
});

onBeforeUnmount(() => {
  document.documentElement.classList.remove("overflow-hidden");
});

function normalizeItem(item) {
  if (item && typeof item === "object" && !Array.isArray(item)) {
    const title =
      item.title ?? item.label ?? item.name ?? item.text ?? item.value ?? item.id ?? "";
    const value = item.value ?? item.id ?? title;

    return {
      ...item,
      title: String(title),
      value,
    };
  }

  return {
    title: String(item ?? ""),
    value: item,
  };
}

function normalizeString(value) {
  return String(value ?? "").trim().toLowerCase();
}

function areValuesEqual(left, right) {
  return left === right;
}

function openOverlay() {
  overlayOpen.value = true;
  searchQuery.value = "";
}

function closeOverlay() {
  overlayOpen.value = false;
  searchQuery.value = "";
}

function clearSelection(event) {
  event?.stopPropagation();

  emit("update:modelValue", props.multiple ? [] : null);
}

function isSelected(item) {
  return selectedValues.value.some((value) => areValuesEqual(value, item.value));
}

function toggleSelection(item) {
  if (!props.multiple) {
    emit("update:modelValue", item.value);
    closeOverlay();
    return;
  }

  const nextValues = [...selectedValues.value];
  const currentIndex = nextValues.findIndex((value) => areValuesEqual(value, item.value));

  if (currentIndex >= 0) {
    nextValues.splice(currentIndex, 1);
  } else {
    nextValues.push(item.value);
  }

  emit("update:modelValue", nextValues);
}
</script>

<template>
  <div class="app-select">
    <button
      type="button"
      class="app-select__trigger"
      :class="{ 'app-select__trigger--active': overlayOpen }"
      @click="openOverlay"
    >
      <span
        class="app-select__value"
        :class="{ 'app-select__value--placeholder': !displayValue }"
      >
        {{ displayValue || label }}
      </span>

      <div class="app-select__actions">
        <span
          v-if="displayValue"
          class="app-select__clear"
          role="button"
          tabindex="0"
          aria-label="Pulisci selezione"
          @click="clearSelection"
          @keydown.enter.prevent="clearSelection"
          @keydown.space.prevent="clearSelection"
        >
          <v-icon size="16">mdi-close</v-icon>
        </span>

        <v-icon size="18" class="app-select__chevron">mdi-menu-down</v-icon>
      </div>
    </button>

    <Teleport to="body">
      <div
        v-if="overlayOpen"
        class="app-select__overlay"
      >
        <div class="app-select__backdrop" @click="closeOverlay" />

        <div class="app-select__panel">
          <div class="app-select__panel-top">
            <input
              v-if="autocomplete"
              ref="searchInputRef"
              v-model="searchQuery"
              type="text"
              :placeholder="label"
              class="app-select__search"
              spellcheck="false"
              autocapitalize="off"
              autocorrect="off"
            />

            <div
              v-else
              class="app-select__search app-select__search--readonly"
            >
              {{ label }}
            </div>

            <button
              v-if="props.multiple"
              type="button"
              class="app-select__confirm"
              @click="closeOverlay"
            >
              Ok
            </button>
          </div>

          <div class="app-select__list">
            <button
              v-for="item in filteredItems"
              :key="`${label}-${item.title}-${String(item.value)}`"
              type="button"
              class="app-select__item"
              :class="{ 'app-select__item--selected': isSelected(item) }"
              @click="toggleSelection(item)"
            >
              <span class="app-select__item-text">{{ item.title }}</span>
              <v-icon
                v-if="isSelected(item)"
                size="18"
                class="app-select__item-check"
              >
                mdi-check
              </v-icon>
            </button>

            <p
              v-if="filteredItems.length === 0"
              class="app-select__empty"
            >
              Nessun risultato
            </p>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.app-select {
  width: 100%;
}

.app-select__trigger {
  width: 100%;
  min-height: 42px;
  border: 1px solid transparent;
  border-radius: 0.9rem;
  background: linear-gradient(130deg, rgba(17, 24, 39, 0.68), rgba(8, 12, 20, 0.9));
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.08),
    0 10px 22px rgba(0, 0, 0, 0.2);
  color: rgba(241, 245, 249, 0.95);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.6rem;
  padding: 0.7rem 0.85rem;
  text-align: left;
  transition:
    box-shadow 160ms ease,
    background 160ms ease;
}

.app-select__trigger--active {
  background: linear-gradient(130deg, rgba(255, 122, 24, 0.14), rgba(12, 18, 29, 0.9));
  box-shadow:
    inset 0 1px 0 rgba(255, 216, 182, 0.24),
    0 0 0 1px rgba(255, 157, 82, 0.28),
    0 12px 24px rgba(0, 0, 0, 0.28);
}

.app-select__value {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.94rem;
  font-weight: 600;
}

.app-select__value--placeholder {
  color: rgba(241, 245, 249, 0.78);
}

.app-select__actions {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  flex-shrink: 0;
}

.app-select__clear {
  width: 1.55rem;
  height: 1.55rem;
  border: 0;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.16);
  color: rgba(241, 245, 249, 0.86);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.app-select__chevron {
  color: rgba(241, 245, 249, 0.86);
}

.app-select__overlay {
  position: fixed;
  inset: 0;
  z-index: 4000;
}

.app-select__backdrop {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(2, 6, 14, 0.62), rgba(0, 0, 0, 0.84));
  backdrop-filter: blur(4px);
}

.app-select__panel {
  position: absolute;
  inset: 0;
  padding: clamp(4.2rem, 8vh, 5.6rem) 1rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.app-select__panel-top {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.app-select__search {
  width: 100%;
  min-height: 46px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 0.9rem;
  background: linear-gradient(130deg, rgba(17, 24, 39, 0.85), rgba(8, 12, 20, 0.96));
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.08),
    0 10px 22px rgba(0, 0, 0, 0.2);
  color: rgba(241, 245, 249, 0.96);
  font-size: 0.95rem;
  font-weight: 600;
  padding: 0.8rem 0.95rem;
  outline: none;
}

.app-select__search::placeholder {
  color: rgba(241, 245, 249, 0.76);
}

.app-select__search--readonly {
  display: flex;
  align-items: center;
  color: rgba(241, 245, 249, 0.78);
}

.app-select__confirm {
  min-height: 2.9rem;
  border: 1px solid rgba(255, 186, 133, 0.42);
  border-radius: 0.75rem;
  background: linear-gradient(130deg, rgba(255, 122, 24, 0.9), rgba(185, 83, 27, 0.9));
  color: #fff7f0;
  font-size: 1rem;
  font-weight: 700;
}

.app-select__list {
  position: relative;
  z-index: 2;
  flex: 1;
  overflow-y: auto;
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 0.95rem;
  background: linear-gradient(150deg, rgba(13, 20, 34, 0.97), rgba(7, 10, 17, 0.98));
  box-shadow:
    0 20px 36px rgba(0, 0, 0, 0.52),
    inset 0 1px 0 rgba(255, 255, 255, 0.09);
  padding: 0.38rem;
  display: flex;
  flex-direction: column;
  gap: 0.34rem;
}

.app-select__item {
  width: 100%;
  min-height: 2.7rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 0.72rem;
  background: linear-gradient(130deg, rgba(30, 41, 59, 0.6), rgba(15, 23, 42, 0.48));
  color: rgba(241, 245, 249, 0.94);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.65rem;
  padding: 0.72rem 0.8rem;
  text-align: left;
  transition:
    border-color 160ms ease,
    background 160ms ease,
    transform 160ms ease;
}

.app-select__item--selected {
  border-color: rgba(255, 173, 111, 0.42);
  background: linear-gradient(130deg, rgba(255, 122, 24, 0.2), rgba(19, 27, 41, 0.82));
}

.app-select__item-text {
  font-size: 0.9rem;
  font-weight: 600;
}

.app-select__item-check {
  flex-shrink: 0;
  color: rgba(255, 214, 179, 0.96);
}

.app-select__empty {
  color: rgba(241, 245, 249, 0.72);
  font-size: 0.9rem;
  font-weight: 600;
  margin: 0;
  padding: 0.8rem;
  text-align: center;
}

@media (min-width: 1024px) {
  .app-select__panel {
    left: 250px;
    padding-inline: 1.25rem;
  }
}
</style>
