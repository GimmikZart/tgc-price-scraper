<script setup>
import { Icon } from "@iconify/vue";

const props = defineProps({
  slug: { type: String, required: true },
});
const emits = defineEmits(["refresh"]);

const deckManager = useDeckManager();
const snackbar = useSnackbar();
const router = useRouter();

async function deleteDeck() {
  await deckManager.deleteDeck(props.slug);
  emits("refresh");
  snackbar.addMessage("Deck eliminato con successo", "success");
  router.push("/decks");
}
</script>

<template>
  <div class="flex justify-center">
    <DialogsGeneric
      @confirm="deleteDeck"
      accept-label="Cancella"
    >
      <template #button>
        <Icon color="red" icon="tabler:trash" class="text-2xl" />
        <span class="text-xs">Cancella</span>
      </template>

      <template #title>
        Sei sicuro di voler cancellare?
      </template>

      <template #content>
        <p class="text-white">L'operazione è irreversibile.</p>
      </template>
    </DialogsGeneric>
  </div>
</template>
