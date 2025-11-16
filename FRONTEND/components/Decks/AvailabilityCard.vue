<script setup>

const props = defineProps({
  card: {
    type: Object,
    required: true,
  },
});

const availabilityOpen = inject("availabilityOpen");

const collectionAvailabilityClass = function(count) {
  return {
    "bg-green": (count <= props.card.userCountInCollection),
    "bg-red": (count > props.card.userCountInCollection)
  }
}
</script>
<template>
  <div v-show="availabilityOpen" class="p-2">
    <span class="text-xs">{{ card.count }} x {{ card.price ?? '???' }} € </span>
    <div class="w-full flex gap-2">
      <div 
        v-for="count in card.count" 
        :key="count"
        class="rounded-full w-[7px] h-[7px]"
        :class="collectionAvailabilityClass(count)"
      >
      </div>
    </div>
  </div>
</template>