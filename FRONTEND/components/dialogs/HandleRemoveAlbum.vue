<script setup>
import { Icon } from "@iconify/vue";

const props = defineProps({
  slug: { type: String, required: true },
});
const emits = defineEmits(["refresh"]);

const deckManager = useDeckManager();
const snackbar = useSnackbar();
const router = useRouter();
const gs = useGlobalSettings();

const bottomDistance = computed(() => {
  return (gs.navbarHeight + gs.floatMenuHeight + gs.paginationHeight);
});

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
      :from-bottom="bottomDistance"
      @confirm="deleteDeck"
      accept-label="Cancella"
    >
      <template #button>
        <ButtonMenu
          icon="tabler:trash"
          label="Cancella"
          icon-color="red"
        />
      </template>

      <template #title>Sei sicuro di voler cancellare?</template>

      <template #content>
        <p class="text-white">L'operazione è irreversibile.</p>
      </template>
    </DialogsGeneric>
  </div>
</template>
