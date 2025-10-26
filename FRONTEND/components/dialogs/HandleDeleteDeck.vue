<script setup>
import { Icon } from "@iconify/vue";

const props = defineProps({
  slug: {
    type: String,
    required: true,
  },
});
const deckManager = useDeckManager();
const snackbar = useSnackbar();
const dialog = ref(false);
const router = useRouter();

function deleteDeck() {
  deckManager.deleteDeck(props.slug);
  router.push("/decks");
  snackbar.addMessage("Deck eliminato con successo", "success");
}
</script>
<template>
  <div class="flex justify-center">
    <button
      class="p-2 border border-white cursor-pointer rounded-lg relative flex flex-col items-center justify-center" 
      @click="dialog = true">
      <Icon color="red" icon="tabler:trash" class="text-2xl" />
      <span class="text-xs">Cancella</span>
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
          Sei sicuro di voler cancellare?
        </v-card-title>
        <v-card-text> L'operazione è irreversibile. </v-card-text>
        <v-card-actions class="pa-3">
          <v-spacer />
          <v-btn
            variant="outlined"
            @click="dialog = false"
          >
            No, mantengo
          </v-btn>
          <v-btn
            color="red"
            variant="outlined"
            @click="deleteDeck"
          >
            Cancella
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>
