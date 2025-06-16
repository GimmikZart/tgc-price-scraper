<script setup>
import { useSnackbar } from "@/stores/useSnackbar";
import { updateProductsBatch } from "@/api/products";
import { useUserAuth } from "@/stores/useUserAuth";
import { fetchCardsFromApi } from "@/api/cardsFromApi";
import { Icon } from "@iconify/vue";

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
    class="w-screen flex gap-5 fixed bottom-0 right-0 items-center justify-around h-[45px] bg-black z-[1000]"
  >
    <NuxtLink
      v-if="userAuth.isAdmin"
      to="/admin"
      active-class="text-white font-bold"
      class="text-white/60 p-2 cursor-pointer rounded-lg relative"
    >
      <Icon icon="mdi:admin-panel-settings" />
    </NuxtLink>
    <NuxtLink
      to="/"
      active-class="text-white font-bold"
      class="text-white/60 p-2 cursor-pointer rounded-lg"
    >
      <v-icon size="30" icon="mdi-shopping"></v-icon>
    </NuxtLink>
    <NuxtLink
      to="/cards"
      active-class="text-white font-bold"
      class="text-white/60 p-2 cursor-pointer rounded-lg relative"
    >
      <Icon class="text-3xl" icon="mdi:cards" />
    </NuxtLink>
    <NuxtLink
      to="/collection"
      active-class="text-white font-bold"
      class="text-white/60 p-2 cursor-pointer rounded-lg relative"
    >
      <Icon class="text-3xl" icon="material-symbols:collections-bookmark" />
    </NuxtLink>
    <NuxtLink
      to="/user"
      active-class="text-white font-bold"
      class="text-white/60 p-2 cursor-pointer rounded-lg relative"
    >
      <Icon class="text-3xl" icon="mdi:user-circle" />
    </NuxtLink>
  </nav>
</template>
