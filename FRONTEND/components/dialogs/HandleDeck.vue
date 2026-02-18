<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import { Icon } from "@iconify/vue";

const formRef = ref(null);
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

    // genera slug
    const slug = deckName.value.toLowerCase().replace(/\s+/g, "-");

    // costruisci il nuovo deck
    const newDeck = {
      name: deckName.value,
      slug,
      leader: null,
      cards: [],
      visibility: "private",
    };

    await saveLocal(newDeck);

    // redirect alla pagina di editing
    router.push(`/me/decks/edit/${slug}`);
  } catch (error) {
    snackbar.addMessage("Errore durante la creazione del mazzo", "error", error);
  } finally {
    isLoading.value = false;
  }
}
</script>

<template>
  <DialogsGeneric
    @confirm="onConfirm"
    accept-label="Crea Deck"
  >
    <template #button>
      <ButtonMenu
        icon="fa-solid:plus"
        transition
          :delay="200"
        label="Crea Mazzo"
        icon-color="green"
      />
    </template>

    <template #title>Crea nuovo Mazzo</template>

    <template #content>
      <v-form ref="formRef">
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

      <div v-if="isLoading" class="text-xs opacity-70 mt-2">
        Creazione in corso…
      </div>
    </template>
  </DialogsGeneric>
</template>
