<script setup>

const props = defineProps({
  card: {
    type: Object,
    required: true,
  },
  show: {
    type: Boolean,
    default: null,
  },
});

const availabilityOpen = inject("availabilityOpen", ref(false));
const shouldShow = computed(() => (props.show ?? availabilityOpen?.value) === true);

const collectionAvailabilityClass = function(count) {
  return {
    "bg-green": (count <= props.card.userCountInCollection),
    "bg-red": (count > props.card.userCountInCollection)
  }
}
</script>
<template>
  <div
    v-show="shouldShow"
    class="mb-1 pointer-events-none flex flex-col items-start gap-1 leading-none"
  >
    <span class="text-xs font-semibold text-white">
      {{ card.price ?? '???' }} &euro;
    </span>
    <div class="flex gap-1">
      <div
        v-for="count in card.count"
        :key="count"
        class="rounded-full w-[5px] h-[5px]"
        :class="collectionAvailabilityClass(count)"
      ></div>
    </div>
  </div>
</template>
