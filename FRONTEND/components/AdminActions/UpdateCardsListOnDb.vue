<script setup>
import { ref } from "vue";
import { fetchActualCardsList, bulkUpdateCardsList } from "@/api/cards";
import { useSnackbar } from "@/stores/useSnackbar";

const { allCards } = await useOnePieceCards();
const snackbar = useSnackbar();
const loading = ref(false);

async function uploadCards() {
  loading.value = true;

  try {
    // 1) carico tutte le chiavi composite esistenti
    const existingKeys = await fetchActualCardsList();

    // 2) preparo le coppie e filtro solo le nuove
    const candidates = allCards.map((card) => ({
      card_id: card.id,
      set_name: card.setName,
    }));

    const newEntries = candidates.filter((entry) => {
      const key = JSON.stringify(entry);
      return !existingKeys.has(key);
    });

    if (newEntries.length === 0) {
      snackbar.addMessage(
        "Nessuna carta da caricare",
        "info",
        "Tutte le carte sono già presenti nel database."
      );
      return;
    }

    // 3) inserisco in bulk
    await bulkUpdateCardsList(newEntries);
  } catch (error) {
    snackbar.addMessage(
      "Errore durante il caricamento",
      "error",
      `${error.message ?? error}`
    );
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <v-btn @click="uploadCards" :disabled="loading">
    {{ loading ? "Uploading..." : "Aggiorna carte One Piece sul db" }}
  </v-btn>
</template>
