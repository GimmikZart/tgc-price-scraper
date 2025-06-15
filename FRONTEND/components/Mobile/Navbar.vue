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
    class="w-screen flex gap-5 fixed bottom-0 right-0 items-center justify-around h-[45px] bg-black"
  >
    <NuxtLink
      v-if="userAuth.isAdmin"
      to="/admin"
      active-class="text-purple font-bold"
      class="text-white/80 p-2 cursor-pointer rounded-lg"
    >
      <v-icon size="30" icon="mdi-security"></v-icon>
    </NuxtLink>
    <NuxtLink
      to="/"
      active-class="text-white font-bold"
      class="text-white/70 p-2 cursor-pointer rounded-lg"
    >
      <v-icon size="30" icon="mdi-shopping"></v-icon>
    </NuxtLink>
    <NuxtLink
      to="/cards"
      class="text-white/70 p-2 cursor-pointer rounded-lg relative"
      active-class="text-white font-bold"
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
      active-class="text-white font-bold"
      class="bg-black text-white/70 p-2 cursor-pointer rounded-lg"
    >
      <v-icon size="30" icon="mdi-account-circle"></v-icon>
    </NuxtLink>
  </nav>
</template>
