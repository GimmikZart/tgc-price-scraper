<script setup>
import { computed, ref } from "vue";

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
    type: Array,
    default: () => [],
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

const containerClass = computed(() => ({
  "h-dvh fixed w-full right-0 top-0 bg-black z-10 lg:left-[250px]":
    isFocused.value,
}));
const inputClass = computed(() => ({
  "absolute z-[50] bottom-[20px] px-5": isFocused.value,
}));

const menuProps = computed(() => ({
  location: isFocused.value ? "top" : null,
  offset: isFocused.value ? "50px" : null,
  height: "700px",
}));

function handleMenu(event) {
  if (event) isFocused.value = event;
}
</script>

<template>
  <div :class="containerClass">
    <div class="w-full flex gap-5 flex-col" :class="inputClass">
      <v-autocomplete
        v-if="autocomplete"
        v-model="model"
        :items="items"
        :label="label"
        density="compact"
        variant="outlined"
        :multiple="multiple"
        chips
        item-height="40"
        clear-on-select
        theme="dark"
        hide-details
        clearable
        :menu="isFocused"
        :menu-props="{
          offset: menuProps.offset,
          contained: true,
          location: menuProps.location,
          contentClass: 'flex-menu',
        }"
        class="w-full"
        @update:menu="(event) => handleMenu(event)"
      >
        <template #item="{ props, item }">
          <div
            v-bind="props"
            class="bg-white/10 border-2 border-white-500 font-bold text-sm my-2 rounded py-2 px-4"
          >
            {{ item.value }}
          </div>
        </template>
      </v-autocomplete>
      <v-select
        v-else
        v-model="model"
        :items="items"
        :label="label"
        density="compact"
        variant="outlined"
        :multiple="multiple"
        chips
        item-height="40"
        theme="dark"
        hide-details
        clearable
        :menu="isFocused"
        :menu-props="{
          offset: menuProps.offset,
          contained: true,
          location: menuProps.location,
          contentClass: 'flex-menu',
        }"
        class="w-full z-index-[150]"
        @update:menu="(event) => handleMenu(event)"
      >
        <template #item="{ props, item }">
          <div
            v-bind="props"
            class="bg-white/10 border-2 border-white-500 font-bold text-sm my-2 rounded py-2 px-4"
          >
            {{ item.value }}
          </div>
        </template>
      </v-select>

      <v-btn v-if="isFocused" @click="isFocused = false"> Ok </v-btn>
    </div>
  </div>
</template>

<style>
.flex-menu {
  min-height: 70lvh !important;
  display: flex !important;
  flex-direction: column !important;
  justify-content: end !important;
  left: 0 !important;
  top: -71lvh !important;
  padding-y: 2rem !important;
}
.flex-menu .v-list {
  background: black !important;
  background-color: black !important;
}

.custom-select .v-input.v-select {
}
</style>
