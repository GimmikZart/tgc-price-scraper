<script setup>
import { useRouter } from "vue-router";
const route = useRoute();
const router = useRouter();

const props = defineProps({
  label: {
    type: String,
    required: true,
  },
  vertical: {
    type: Boolean,
    default: false,
  },
  backButton: {
    type: Boolean,
    default: false,
  },
});

function goBack() {
  router.back();
}
</script>
<template>
  <div
    class="bg-black w-full sticky top-0 left-0 z-[10] border-b py-2"
    :class="vertical ? 'flex-col' : 'flex-row'"
  >
    <div class="flex items-center px-4 pb-2">
      <v-btn
        v-if="backButton"
        variant="plain"
        @click="goBack"
        class="w-fit pl-0"
      >
        <v-icon size="30" icon="mdi-chevron-left"></v-icon>
      </v-btn>
      <h2 class="font-bold text-lg">{{ label }}</h2>
      <v-spacer></v-spacer>
      <div class="flex justify-end items-center gap-3">
        <slot name="actions" />
      </div>
    </div>
    <TimedSnackbarList v-if="!route.meta.hideFloatSnackbar" />
    <div>
      <slot name="info" />
    </div>
  </div>
</template>
