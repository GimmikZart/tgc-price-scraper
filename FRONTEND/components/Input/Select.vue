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
  "h-full fixed w-screen left-0 top-0 bg-black z-10": isFocused.value,
}));
const inputClass = computed(() => ({
  "absolute z-[50000] bottom-[100px] px-5": isFocused.value,
}));

const menuProps = computed(() => ({
  location: isFocused.value ? "top" : null,
  offset: isFocused.value ? "30px" : null,
  height: "600px",
}));

function handleMenu(event) {
  if (event) isFocused.value = event;
}
</script>

<template>
  <div :class="containerClass">
    <div class="w-full flex gap-5 flex-col" :class="inputClass">
      <v-autocomplete
        v-model="model"
        :items="items"
        :label="label"
        density="compact"
        variant="outlined"
        multiple
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
            class="bg-violet-900 border-4 border-violet-500 font-bold text-sm my-2 rounded-full py-2 px-4 mr-3"
          >
            {{ item.value }}
          </div>
        </template>
      </v-autocomplete>

      <v-btn v-if="isFocused" @click="isFocused = false"> Ok </v-btn>
    </div>
  </div>
</template>

<style>
.flex-menu {
  min-height: 500px !important;
  display: flex !important;
  flex-direction: column !important;
  justify-content: end !important;
}
.flex-menu .v-list {
  background: black !important;
  background-color: black !important;
}
</style>
