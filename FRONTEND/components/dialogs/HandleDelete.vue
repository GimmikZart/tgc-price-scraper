<script setup>
import { Icon } from "@iconify/vue";
import { useDeckStore } from "@/stores/useDeckStore";

const props = defineProps({
  slug: {
    type: String,
    required: true,
  },
});
const decksStore = useDeckStore();
const snackbar = useSnackbar();
const dialog = ref(false);
const router = useRouter();

function deleteDeck() {
  decksStore.removeDeck(props.slug);
  router.push("/decks");
  snackbar.addMessage("Deck eliminato con successo", "success");
  mobileFloatMenu.close();
}
</script>
<template>
  <div>
    <v-btn color="red" variant="text" block @click="dialog = true">
      <span class="text-xs mr-3">Cancella</span>
      <Icon color="red" icon="tabler:trash" class="text-2xl" />
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
          Sei sicuro di voler cancellare?
        </v-card-title>
        <v-card-text> L'operazione è irreversibile. </v-card-text>
        <v-card-actions class="pa-3">
          <v-spacer />
          <v-btn
            :disabled="isLoading"
            variant="outlined"
            @click="dialog = false"
          >
            No, mantengo
          </v-btn>
          <v-btn
            :loading="isLoading"
            color="red"
            variant="outlined"
            @click="deleteDeck()"
          >
            Cancella
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>
