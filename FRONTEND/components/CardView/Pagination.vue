<script setup>
import { ref, computed, watch, onMounted, nextTick } from "vue";
import { useElementSize } from "@vueuse/core";

const props = defineProps({
  items: {
    type: Array,
    required: true,
  },
  itemsPerPage: {
    type: Number,
    default: 32,
  },
  // NUOVO: pagina iniziale (1-based). Puoi passare un number o un computed.
  initialPage: {
    type: [Number, Object],
    default: 1,
  },
});

const emit = defineEmits(["update:paginated"]);
const globalSettings = useGlobalSettings();

const pagination = ref(null);
const { height } = useElementSize(pagination);

// inizializzo la pagina partendo dal prop initialPage
function toNumber(v) {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) && n > 0 ? n : 1;
}
const currentPage = ref(toNumber(props.initialPage));

const totalPages = computed(() => {
  return Math.max(1, Math.ceil((props.items?.length || 0) / props.itemsPerPage));
});

watch(
  () => props.items,
  () => {
    if (currentPage.value > totalPages.value) {
      currentPage.value = 1;
    }
  }
);

// se cambia l’altezza della barra, salvo nello store globale
watch(
  height,
  (newHeight) => {
    globalSettings.paginationHeight = newHeight;
  },
  { immediate: true }
);

const paginated = computed(() => {
  const start = (currentPage.value - 1) * props.itemsPerPage;
  return (props.items || []).slice(start, start + props.itemsPerPage);
});

// emetto il buffer ogni volta che cambia
watch(paginated, (newVal) => {
  emit("update:paginated", newVal);
});

// se cambia initialPage dall’esterno, aggiorno la pagina e ricalcolo
watch(
  () => props.initialPage,
  (p) => {
    const n = toNumber(p);
    if (n !== currentPage.value) {
      currentPage.value = Math.min(n, totalPages.value);
    }
  }
);

onMounted(async () => {
  await nextTick();
  emit("update:paginated", paginated.value);
});
</script>

<template>
  <div
    ref="pagination"
    :style="`bottom:${globalSettings.navbarHeight}px`"
    class="flex h-[45px] fixed right-0 lg:bottom-0 p-1 lg:p-3 lg:pl-[250px] bg-black w-full justify-center z-[1000]"
  >
    <v-pagination
      density="compact"
      v-model="currentPage"
      :length="totalPages"
      class="w-full"
      size="default"
      :total-visible="5"
    />
  </div>
</template>

<style scoped>
/* Styling base */
</style>
