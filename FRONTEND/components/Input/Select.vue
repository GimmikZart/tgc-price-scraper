<script setup>
import { computed, nextTick, ref } from "vue";

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

const model = computed({
  get() {
    return props.modelValue;
  },
  set(newVal) {
    emit("update:modelValue", newVal);
  },
});

const isFocused = ref(false);
const selectRootRef = ref(null);

const containerClass = computed(() => ({
  "select-focus-layer": isFocused.value,
}));
const inputClass = computed(() => ({
  "select-focus-panel": isFocused.value,
}));

const menuProps = computed(() => ({
  location: isFocused.value ? "bottom center" : "bottom",
  offset: isFocused.value ? 62 : 8,
  maxHeight: isFocused.value ? "68vh" : "320px",
  contained: true,
  contentClass: "flex-menu",
}));

function handleMenu(event) {
  isFocused.value = Boolean(event);
  if (isFocused.value) {
    nextTick(() => stripTitleAttributes());
  }
}

function getItemLabel(item) {
  return item?.title ?? item?.value ?? item?.raw ?? "";
}

function getItemBindProps(itemProps = {}) {
  const { title, ...rest } = itemProps;
  return rest;
}

function handleSearchUpdate() {
  nextTick(() => stripTitleAttributes());
}

function stripTitleAttributes() {
  const root = selectRootRef.value;
  if (!root) return;

  root.querySelectorAll("[title]").forEach((el) => {
    el.removeAttribute("title");
  });
}
</script>

<template>
  <div ref="selectRootRef" :class="containerClass">
    <div class="w-full flex gap-5 flex-col justify-between" :class="inputClass">
      <v-autocomplete
        v-if="autocomplete"
        v-model="model"
        :items="items"
        :label="label"
        density="compact"
        variant="filled"
        :multiple="multiple"
        chips
        item-height="40"
        clear-on-select
        theme="dark"
        hide-details
        clearable
        spellcheck="false"
        autocapitalize="off"
        autocorrect="off"
        :menu="isFocused"
        :menu-props="menuProps"
        class="w-full app-select"
        @update:menu="(event) => handleMenu(event)"
        @update:search="handleSearchUpdate"
      >
        <template #item="{ props, item }">
          <div
            v-bind="getItemBindProps(props)"
            class="select-item"
          >
            {{ getItemLabel(item) }}
          </div>
        </template>
      </v-autocomplete>
      <v-select
        v-else
        v-model="model"
        :items="items"
        :label="label"
        density="compact"
        variant="filled"
        :multiple="multiple"
        chips
        item-height="40"
        theme="dark"
        hide-details
        clearable
        :menu="isFocused"
        :menu-props="menuProps"
        class="w-full app-select"
        @update:menu="(event) => handleMenu(event)"
      >
        <template #item="{ props, item }">
          <div
            v-bind="getItemBindProps(props)"
            class="select-item"
          >
            {{ getItemLabel(item) }}
          </div>
        </template>
      </v-select>

      <v-btn
        v-if="isFocused"
        variant="flat"
        class="select-confirm-btn"
        @click="isFocused = false"
      >
        Ok
      </v-btn>
    </div>
  </div>
</template>

<style>
.select-focus-layer {
  position: fixed;
  inset: 0;
  z-index: 20;
  background: linear-gradient(180deg, rgba(2, 6, 14, 0.62), rgba(0, 0, 0, 0.84));
  backdrop-filter: blur(4px);
}

.select-focus-panel {
  position: absolute;
  left: 0;
  right: 0;
  top: clamp(4.2rem, 8vh, 5.6rem);
  z-index: 50;
  padding-inline: 1rem;
}

@media (min-width: 1024px) {
  .select-focus-layer {
    left: 250px;
  }

  .select-focus-panel {
    margin-inline: auto;
    max-width: 720px;
    padding-inline: 0;
  }
}

.app-select .v-field {
  border: 1px solid transparent;
  border-radius: 0.9rem;
  background: linear-gradient(130deg, rgba(17, 24, 39, 0.68), rgba(8, 12, 20, 0.9));
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.08),
    0 10px 22px rgba(0, 0, 0, 0.2);
}

.app-select .v-field--focused {
  border-color: transparent;
  background: linear-gradient(130deg, rgba(255, 122, 24, 0.14), rgba(12, 18, 29, 0.9));
  box-shadow:
    inset 0 1px 0 rgba(255, 216, 182, 0.24),
    0 0 0 1px rgba(255, 157, 82, 0.28),
    0 12px 24px rgba(0, 0, 0, 0.28);
}

.app-select .v-field__outline,
.app-select .v-field__overlay {
  opacity: 0 !important;
}

.app-select .v-field-label,
.app-select input,
.app-select .v-select__selection-text {
  color: rgba(241, 245, 249, 0.95) !important;
}

.app-select .v-chip {
  border: 1px solid rgba(255, 186, 133, 0.36) !important;
  background: rgba(255, 122, 24, 0.16) !important;
  color: #f8fafc !important;
}

.flex-menu {
  max-height: 70lvh !important;
  border: 1px solid rgba(255, 255, 255, 0.16) !important;
  border-radius: 0.95rem !important;
  background: linear-gradient(150deg, rgba(13, 20, 34, 0.97), rgba(7, 10, 17, 0.98)) !important;
  box-shadow:
    0 20px 36px rgba(0, 0, 0, 0.52),
    inset 0 1px 0 rgba(255, 255, 255, 0.09) !important;
  overflow: hidden !important;
  backdrop-filter: blur(10px);
}

.flex-menu .v-list {
  background: transparent !important;
  display: flex;
  flex-direction: column;
  gap: 0.34rem;
  padding: 0.38rem !important;
}

.flex-menu .v-list-item {
  border-radius: 0.72rem !important;
  margin: 0 !important;
  min-height: 2.4rem !important;
}

.flex-menu .v-list-item--active {
  background: rgba(255, 122, 24, 0.16) !important;
}

.flex-menu .v-list-item-title {
  color: rgba(241, 245, 249, 0.94) !important;
}

.select-item {
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 0.72rem;
  background: linear-gradient(130deg, rgba(30, 41, 59, 0.6), rgba(15, 23, 42, 0.48));
  color: rgba(241, 245, 249, 0.94);
  font-size: 0.88rem;
  font-weight: 600;
  margin: 0;
  padding: 0.58rem 0.7rem;
  transition: border-color 0.16s ease, background 0.16s ease;
}

.v-list-item--active .select-item,
.select-item:hover {
  border-color: rgba(255, 173, 111, 0.42);
  background: linear-gradient(130deg, rgba(255, 122, 24, 0.2), rgba(19, 27, 41, 0.82));
}

.select-confirm-btn {
  position: relative;
  z-index: 70;
  opacity: 1 !important;
  border: 1px solid rgba(255, 186, 133, 0.42) !important;
  background: linear-gradient(130deg, rgba(255, 122, 24, 0.9), rgba(185, 83, 27, 0.9)) !important;
  color: #fff7f0 !important;
  text-transform: none !important;
  font-weight: 700 !important;
}
</style>
