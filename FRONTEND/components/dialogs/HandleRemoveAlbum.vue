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
  router.push("/collection");
}
</script>
<template>
  <div>
    <v-btn
      v-if="!removeCardMode"
      variant="outlined"
      class="text-red"
      @click="dialog = true"
    >
      Elimina Album
      <Icon icon="mdi:trash-can-outline" class="text-xl ml-3" />
    </v-btn>
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
  </div>
</template>
