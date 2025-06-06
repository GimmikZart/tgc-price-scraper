<script setup>
import { ref, computed, watch } from "vue";
const props = defineProps({
  items: {
    type: Array,
    required: true,
  },
  itemsPerPage: {
    type: Number,
    default: 32,
  },
});
const emit = defineEmits(["update:paginated"]);

const currentPage = ref(1);

const totalPages = computed(() => {
  return Math.max(1, Math.ceil(props.items.length / props.itemsPerPage));
});

watch(
  () => props.items,
  () => {
    if (currentPage.value > totalPages.value) {
      currentPage.value = 1;
    }
  },
  { immediate: true }
);

const paginated = computed(() => {
  const start = (currentPage.value - 1) * props.itemsPerPage;
  return props.items.slice(start, start + props.itemsPerPage);
});

watch(
  paginated,
  (newVal) => {
    emit("update:paginated", newVal);
  },
  { immediate: true }
);
</script>

<template>
  <div
    class="flex fixed bottom-[98px] right-0 lg:bottom-0 p-1 lg:p-3 lg:pl-[250px] bg-black w-full justify-center"
  >
    <v-pagination
      density="compact"
      v-model="currentPage"
      :length="totalPages"
      class="w-full"
    ></v-pagination>
  </div>
</template>

<style scoped>
/* Styling base; puoi personalizzare dopo */
</style>
