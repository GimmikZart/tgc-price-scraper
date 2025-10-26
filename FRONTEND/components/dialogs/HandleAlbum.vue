<script setup>
import { createAlbum } from "@/api/album";
import { Icon } from "@iconify/vue";

const snackbar = useSnackbar();
const isLoading = ref(false);
const dialog = ref(false);
const albumName = ref(null);
const totalPages = ref(1);
const totalSlots = computed(() => totalPages.value * 10);
const router = useRouter();

async function create() {
  isLoading.value = true;
  try {
    dialog.value = false;
    const slug = await createAlbum(albumName.value.trim(), totalSlots.value);
    if (slug) router.push(`/collection/album/${slug}`);
  } catch (error) {
    snackbar.addMessage(`Errore durante la creazione`, "error", error);
  } finally {
    isLoading.value = false;
  }
}

//metodo per controllare che una stringa abbia valori e non sia vuota
const isValidAlbumName = computed(() => {
  return albumName.value && albumName.value.trim().length > 0;
});
</script>
<template>
  <button
    class="p-2 border border-white cursor-pointer rounded-lg relative flex flex-col items-center justify-center"
    @click="dialog = true"
  >
    <Icon class="text-xl text-green" icon="fluent:book-add-28-filled" />
    <span class="text-xs">Aggiungi</span>
  </button>
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
          label="Nome*"
          v-model="albumName"
          density="compact"
          variant="outlined"
        ></v-text-field>
        <v-number-input
          label="Pagine totali"
          v-model="totalPages"
          control-variant="split"
          density="compact"
          variant="outlined"
          persistent-hint
          hint="Ogni pagina contiene 10 carte. Potrai modificare il numero di pagine anche in seguito"
        ></v-number-input>
        <!-- <v-text-field
          type="number"
          label="Tasche totali"
          v-model="totalSlots"
          density="compact"
          variant="outlined"
          persistent-hint
          hint="Potrai modificare il numero di tasche in seguito"
        ></v-text-field> -->
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
        <v-btn :disabled="!isValidAlbumName" :loading="isLoading" variant="outlined" @click="create">
          Crea Album
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
