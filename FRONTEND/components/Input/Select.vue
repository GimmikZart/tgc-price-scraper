<script setup>
const props = defineProps({
  items: {
    type: Array,
    default: () => [],
  },
  label: {
    type: String,
    default: "Select",
  },
});

const emit = defineEmits(["update:modelValue"]);

const isFocused = ref(true);
const choosenItems = ref([]);
const containerClass = computed(() => {
  return {
    "h-full fixed w-screen left-0 top-0 bg-black z-10": isFocused.value,
  };
});
const inputClass = computed(() => {
  return {
    "absolute z-[50000] bottom-[100px] px-5": isFocused.value,
  };
});

const menuProps = computed(() => {
  return {
    location: isFocused.value ? "top" : null,
    offset: isFocused.value ? "30px" : null,
    height: "600px",
  };
});

function handleMenu(event) {
  if (event) isFocused.value = event;
}

watch(
  choosenItems,
  (newVal) => {
    console.log("Selected items:", newVal);

    emit("update:modelValue", newVal);
  },
  { immediate: true }
);
</script>
<template>
  <div :class="containerClass">
    <div class="w-full flex gap-5 flex-col" :class="inputClass">
      <v-autocomplete
        v-model="choosenItems"
        density="compact"
        variant="outlined"
        :items="items"
        :label="label"
        multiple
        chips
        item-height="40"
        clear-on-select
        theme="dark"
        :menu="true"
        :menu-props="{
          offset: menuProps.offset,
          contained: true,
          location: menuProps.location,
          contentClass: 'flex-menu',
          openOnFocus: true,
          closeOnContentClick: false,
          closeOnBlur: false,
          persistent: true,
        }"
        class="w-full"
        hide-details
        clearable
        @update:menu="(event) => handleMenu(event)"
      >
        <template #item="{ props, item }">
          <div
            v-bind="props"
            class="bg-violet-900 border border-[4px] border-white/30 font-bold text-sm my-2 rounded-full py-2 px-4 mr-3"
          >
            {{ item.value }}
          </div>
        </template>
      </v-autocomplete>
      <v-btn v-if="isFocused" @click="isFocused = false">Ok</v-btn>
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
  /*  display: flex !important;
  justify-content: start !important;
  align-items: center !important;
  flex-wrap: wrap !important; */
  background: black !important;
  background-color: black !important;
}
</style>
