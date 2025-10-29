<script setup>
import { Icon } from "@iconify/vue";
import { DeckLocation, getDeckLocationLabel } from "~/enums/deckLocation";

const props = defineProps({
  slug: { type: String, required: true },
});
const emits = defineEmits(["refresh"]);

const route = useRoute();
const deckLocation = ref(route.query.location);
const deckManager = useDeckManager();
const snackbar = useSnackbar();
const router = useRouter();

async function deleteDeck() {
  await deckManager.deleteDeck(props.slug, deckLocation.value);
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
      accept-color="red"
    >
      <template #button>
        <ButtonMenu
          icon="tabler:trash"
          label="Cancella"
          icon-color="red"
          transition
          :delay="200"
        />
      </template>

      <template #title>
        <div class="whitespace-break-spaces">
          Sei sicuro di voler cancellare il mazzo
          <span 
            :class="deckLocation == DeckLocation.BOZZA ? 
                    'text-orange' 
                    : 'text-green'"
          > 
            {{ getDeckLocationLabel(deckLocation) }} 
          </span>
          ?
        </div>
      </template>

      <template #content>
        <p class="text-white">Poi non piangere se non posso ridartelo ( il processo è irreversibile).</p>
      </template>
    </DialogsGeneric>
  </div>
</template>
