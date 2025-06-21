<script setup>
import { createAlbum } from "@/api/album";
import { Icon } from "@iconify/vue";

const snackbar = useSnackbar();
const isLoading = ref(false);
const dialog = ref(false);
const albumName = ref("");
const totalSlots = ref(12);
const router = useRouter();

async function create() {
  isLoading.value = true;
  try {
    dialog.value = false;
    const slug = await createAlbum(albumName.value, totalSlots.value);
    if (slug) router.push(`/collection/album/${slug}`);
  } catch (error) {
    snackbar.addMessage(`Errore durante la creazione`, "error", error);
  } finally {
    isLoading.value = false;
  }
}
</script>
<template>
  <div>
    <v-btn icon density="compact" @click="dialog = true">
      <Icon class="text-sm" icon="fa-solid:plus"></Icon>
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
            v-model="albumName"
            density="compact"
            variant="outlined"
          ></v-text-field>
          <v-text-field
            type="number"
            label="Tasche totali"
            v-model="totalSlots"
            density="compact"
            variant="outlined"
            persistent-hint
            hint="Potrai modificare il numero di tasche in seguito"
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
            Crea Album
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>
