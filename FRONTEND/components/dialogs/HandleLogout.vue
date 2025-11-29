<script setup>
import { signOutApi } from "@/api/auth";

const snackbar = useSnackbar();
const isLoading = ref(false);

async function onConfirm() {
  if (isLoading.value) return; // evita doppi click
  isLoading.value = true;

  try {
    await signOutApi();
  } catch (error) {
    snackbar.addMessage("Errore durante il logout", "error", error);
  } finally {
    isLoading.value = false;
  }
}
</script>

<template>
  <DialogsGeneric
    @confirm="onConfirm"
    accept-label="Esci"
  >
    <template #button>
      <ButtonMenu
        icon="ri:run-line"
        label="Logout"
        transition
      />
    </template>

    <template #title>
      Sei sicuro di voler uscire?
    </template>

    <template #content>
      <p class="opacity-80">
        Una volta uscito dovrai riaccedere con il tuo account.
      </p>
      <div v-if="isLoading" class="text-xs opacity-70 mt-2">
        Disconnessione in corso…
      </div>
    </template>
  </DialogsGeneric>
</template>
