<!-- components/TimedSnackbarList.vue -->
<script setup>
import { useSnackbar } from '@/stores/useSnackbar'
const snackbar = useSnackbar()

// Funzione di callback per chiudere manualmente
function onClose(id) {
  snackbar.removeMessage(id)
}
</script>

<template>
  <div class="h-auto lg:right-0 w-full flex justify-end z-[2000]">
      <!-- Se c’è un currentTimed, mostro un solo Snackbar -->
      <Snackbar
        v-if="snackbar.currentTimed"
        :key="snackbar.currentTimed.id"
        :id="snackbar.currentTimed.id"
        :title="snackbar.currentTimed.title"
        :message="snackbar.currentTimed.message"
        :type="snackbar.currentTimed.type"
        @close="onClose(snackbar.currentTimed.id)"
      />
  </div>
</template>
