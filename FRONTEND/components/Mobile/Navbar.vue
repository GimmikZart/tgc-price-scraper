<script setup>
import { useSnackbar } from "@/stores/useSnackbar";
import { updateProductsBatch } from "@/api/products";
import { useUserAuth } from "@/stores/useUserAuth";
import { fetchCardsFromApi } from "@/api/cardsFromApi";

const snackbar = useSnackbar();
const isLoading = ref(false);
const userAuth = useUserAuth();
const mobileFloatMenu = useMobileFloatMenu();

async function updateAllProducts() {
  isLoading.value = true;
  try {
    await updateProductsBatch();
    snackbar.addMessage("Aggiornamento completato", "success");
  } catch (error) {
    snackbar.addMessage(`Errore durante l'aggiornamento`, "error", error);
  } finally {
    isLoading.value = false;
  }
}

async function fetchCards() {
  isLoading.value = true;
  try {
    await fetchCardsFromApi();
    snackbar.addMessage("Carte aggiornate con successo", "success");
  } catch (error) {
    snackbar.addMessage(
      `Errore durante l'aggiornamento delle carte`,
      "error",
      error
    );
  } finally {
    isLoading.value = false;
  }
}
</script>
<template>
  <nav
    class="w-screen flex gap-5 fixed bottom-0 right-0 items-center justify-around h-[50px] bg-black"
  >
    <NuxtLink
      v-if="userAuth.isAdmin"
      to="/admin"
      class="text-white p-2 cursor-pointer rounded-lg"
    >
      <v-icon size="30" icon="mdi-security"></v-icon>
    </NuxtLink>
    <NuxtLink to="/" class="text-white p-2 cursor-pointer rounded-lg">
      <v-icon size="30" icon="mdi-shopping"></v-icon>
    </NuxtLink>
    <NuxtLink
      to="/cards"
      class="text-white p-2 cursor-pointer rounded-lg"
      active-class="text-purple font-bold"
      v-slot="{ isActive }"
      @click="mobileFloatMenu.open"
    >
      <v-icon size="30" icon="mdi-cards"></v-icon>
      <v-icon v-if="isActive" size="15" class="animate-bounce"
        >mdi-arrow-up</v-icon
      >
    </NuxtLink>
    <NuxtLink
      to="/user"
      class="bg-black text-white p-2 cursor-pointer rounded-lg"
    >
      <v-icon size="30" icon="mdi-account-circle"></v-icon>
    </NuxtLink>
  </nav>
</template>
