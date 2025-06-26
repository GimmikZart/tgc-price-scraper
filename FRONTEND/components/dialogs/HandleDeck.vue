<script setup>
import { createAlbum } from "@/api/album";
import { Icon } from "@iconify/vue";

const snackbar = useSnackbar();
const isLoading = ref(false);
const dialog = ref(false);
const deckName = ref("");
const router = useRouter();
const deckStore = useDeckStore();

async function create() {
  try {
    dialog.value = false;
    const newDeck = {
      name: deckName.value,
      slug: deckName.value.toLowerCase().replace(/\s+/g, "-"),
      leader: null,
      cards: [],
    };
    await deckStore.addDeck(deckName.value);
    router.push(`/decks/edit/${newDeck.slug}`);
  } catch (error) {
    snackbar.addMessage(`Errore durante la creazione`, "error", error);
  } finally {
    isLoading.value = false;
  }
}
</script>
<template>
  <div>
    <v-btn density="compact" variant="text" @click="dialog = true">
      Crea Deck
      <Icon class="text-sm ml-3" icon="fa-solid:plus"></Icon>
    </v-btn>
    <v-dialog
      v-model="dialog"
      width="90%"
      variant="outlined"
      transition="dialog-bottom-transition"
      style="z-index: 2000"
    >
      <v-card class="border border-2 border-white">
        <v-card-title class="bg-black text-white font-bold text-2xl">
          Crea nuovo Album
        </v-card-title>
        <v-card-text>
          <v-text-field
            label="Nome"
            v-model="deckName"
            density="compact"
            variant="outlined"
          ></v-text-field>
        </v-card-text>
        <v-card-actions class="pa-3">
          <v-spacer />
          <v-btn
            :disabled="isLoading"
            variant="outlined"
            @click="dialog = false"
          >
            Annulla
          </v-btn>
          <v-btn :loading="isLoading" variant="outlined" @click="create">
            Crea Deck
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>
