<script setup>
const props = defineProps({
  card: {
    type: Object,
    required: true,
  },
  editCollection: {
    type: Boolean,
  },
});

const cardIsOpen = ref(false);
</script>
<template>
  <div :class="{ 'border-2 rounded-2xl p-1 border-white/50': editCollection }">
    <v-img
      :src="card.image"
      :lazy-src="card.image"
      width="100%"
      height="auto"
      class="border shadow-md cursor-zoom-in"
      cover
      @click="cardIsOpen = true"
      :alt="card.name"
    >
      <template v-slot:placeholder>
        <div class="d-flex align-center justify-center fill-height">
          <v-progress-circular
            color="grey-lighten-4"
            indeterminate
          ></v-progress-circular>
        </div>
      </template>
    </v-img>
    <div
      v-if="cardIsOpen"
      class="fixed inset-0 bg-black/80 flex items-center justify-center z-50 px-10 cursor-zoom-out"
      @click="cardIsOpen = false"
    >
      <v-img
        :src="card.image"
        :lazy-src="card.image"
        class="h-3/4 w-auto"
        contain
        @click="cardIsOpen = true"
        :alt="card.name"
      >
        <template v-slot:placeholder>
          <div class="d-flex align-center justify-center fill-height">
            <v-progress-circular
              color="grey-lighten-4"
              indeterminate
            ></v-progress-circular>
          </div>
        </template>
      </v-img>
    </div>
    <div v-if="editCollection" class="py-2 flex justify-between">
      <v-btn variant="text" color="white">
        <v-icon size="25">mdi-minus-circle-outline</v-icon>
      </v-btn>
      <v-btn variant="text" color="green">
        <v-icon size="25">mdi-plus-circle-outline</v-icon>
      </v-btn>
    </div>
  </div>
</template>
