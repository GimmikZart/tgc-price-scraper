<script setup>
import { removeAlbum } from "@/api/album";
import { Icon } from "@iconify/vue";

const props = defineProps({
  albumId: {
    type: Number,
    required: true,
  },
});
const isLoading = ref(false);
const dialog = ref(false);
const router = useRouter();

async function remove() {
  isLoading.value = true;
  await removeAlbum(props.albumId);
  router.push("/collection/all");
}
</script>
<template>
  <button
        class="text-white border border-white p-2 cursor-pointer rounded-lg relative flex flex-col items-center justify-center"
    @click="dialog = true"
  >
    <Icon color="red" icon="tabler:trash" class="text-2xl" />
    <span>Elimina</span>
  </button>
  <v-dialog
    v-model="dialog"
    width="auto"
    variant="outlined"
    transition="dialog-bottom-transition"
    style="z-index: 2000"
  >
    <v-card class="border border-2 border-white">
      <v-card-title class="bg-black text-white font-bold text-2xl">
        Sei sicuro?
      </v-card-title>
      <v-card-text class="flex flex-col gap-2">
        <p class="font-bold">
          Questa azione non può essere annullata e l'album verrà rimosso.
        </p>
        <p>Le carte rimarranno comunque nella tua collezione.</p>
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
        <v-btn
          :loading="isLoading"
          color="red"
          variant="flat"
          @click="remove"
        >
          Elimina Album
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
