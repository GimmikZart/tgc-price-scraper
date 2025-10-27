<script setup>
const props = defineProps({
  icon: {
    type: String,
    default: null,
  },
  buttonLabel: {
    type: String,
    default: "",
  },
  title: {
    type: String,
    required: true,
  },
})
</script>

<template>
  <button
      class="text-white border border-white p-2 cursor-pointer rounded-lg relative flex flex-col items-center justify-center"
      @click="dialog = true"
  >
    <Icon class="text-xl ml-3 text-green" :icon="icon" />
    {{ buttonLabel }}
  </button>

  <div
    class="fixed bottom-0 left-0 w-full h-auto"
    v-if="dialog"
    style="z-index: 2000"
  >
    <v-card class="border border-2 border-white">
      <v-card-title class="bg-black text-white font-bold text-2xl">
        {{ title }}
      </v-card-title>

      <v-card-text>
        <slot name="content"></slot>
      </v-card-text>

      <v-card-actions class="pa-3">
        <v-spacer />
        <slot name="actions"></slot>
      </v-card-actions>
    </v-card>
  </div>
</template>
