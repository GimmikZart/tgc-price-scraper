<script setup>
import { DeckLocation, getDeckLocationLabel, normalizeDeckLocation } from "~/enums/deckLocation";

const props = defineProps({
  slug: { type: String, required: true },
});
const emits = defineEmits(["refresh"]);

const route = useRoute();
const deckLocation = computed(() => normalizeDeckLocation(route.query.location));
const deckManager = useDeckManager();
const snackbar = useSnackbar();
const router = useRouter();

async function deleteDeck() {
  await deckManager.deleteDeck(props.slug, deckLocation.value);
  emits("refresh");
  snackbar.addMessage("Deck eliminato con successo", "success");
  router.push("/me/decks");
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
          Sei sicuro di voler cancellare questo deck dal
          <span
            :class="deckLocation === DeckLocation.DEVICE ? 'text-orange' : 'text-green'"
          >
            {{ getDeckLocationLabel(deckLocation) }}
          </span>
          ?
        </div>
      </template>

      <template #content>
        <p class="text-white">L'operazione e irreversibile.</p>
      </template>
    </DialogsGeneric>
  </div>
</template>
