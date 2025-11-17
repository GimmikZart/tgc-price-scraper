<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import { Icon } from "@iconify/vue";
import { importDeckFromClipboard } from "@/utilities/deckImport.js";

const formRef = ref(null);
const { allCards } = await useOnePieceCards();
const snackbar = useSnackbar();
const isLoading = ref(false);
const deckName = ref("");
const router = useRouter();
const { saveLocal } = useDeckManager();

const rules = {
  required: (v) => !!v || "Il nome del mazzo è obbligatorio.",
  alphanumeric: (v) =>
    /^[A-Za-z0-9]+$/.test(v) ||
    "Il nome può contenere solo lettere e numeri, senza spazi.",
};

async function onConfirm() {
  // validazione form Vuetify
  const isValid = await formRef.value.validate();
  if (!isValid.valid) return;

  try {
    isLoading.value = true;
    const slug = deckName.value.toLowerCase().replace(/\s+/g, "-");
    const deck = await importDeckFromClipboard(deckName.value, allCards);
    await saveLocal(deck);

    // redirect alla pagina di editing
    router.push(`/decks/${slug}?location=bozza`);
  } catch (error) {
    console.log(error);
    
    snackbar.addMessage("Errore durante la creazione del mazzo", "error", error);
  } finally {
    isLoading.value = false;
  }
}
</script>

<template>
  <DialogsGeneric
    @confirm="onConfirm"
    accept-label="Importa Deck"
  >
    <template #button>
      <ButtonMenu
        icon="ri:import-fill"
        transition
          :delay="100"
        label="Importa Deck"
        icon-color="purple"
      />
    </template>

    <template #title>Importa Deck</template>

    <template #content>
      <v-form ref="formRef" class="mb-5">
        <v-text-field
          label="Nome"
          v-model="deckName"
          :rules="[rules.required, rules.alphanumeric]"
          density="compact"
          variant="outlined"
          hint="Il nome del mazzo non può contenere caratteri speciali."
          persistent-hint
        />
      </v-form>
      <v-expansion-panels color="black" tile>
        <v-expansion-panel color="black">
          <v-expansion-panel-title>Consigli</v-expansion-panel-title>
          <v-expansion-panel-text class="bg-black py-3">
            <p class="text-xs font-bold text-yellow-500">
              Assicurati di avere già copiato negli appunti il contenuto di un mazzo da 50 carte + 1 leader in questo formato (esempio):
            </p>
            <p class="text-xs text-yellow-500/70 my-2">
              1xOP07-001 <br />
              3xOP07-016 <br />
              4xOP07-002 <br />     
              3xOP07-018 <br />
              4xOP07-005 <br />
              3xOP07-013 <br />
              4xOP07-006 <br />
            </p>
            ecc...
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>
    </template>
  </DialogsGeneric>
</template>
