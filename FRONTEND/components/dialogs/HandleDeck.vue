<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import { Icon } from "@iconify/vue";

const formRef = ref(null);
const snackbar = useSnackbar();
const isLoading = ref(false);
const dialog = ref(false);
const deckName = ref("");
const router = useRouter();

// Istanzio il composable unificato
const { saveLocal } = useDeckManager();

const rules = {
  required: (v) => !!v || "Il nome del mazzo è obbligatorio.",
  alphanumeric: (v) =>
    /^[A-Za-z0-9]+$/.test(v) ||
    "Il nome può contenere solo lettere e numeri, senza spazi.",
};

async function create() {
  // validazione form
  const isValid = await formRef.value.validate();
  if (!isValid.valid) return;

  try {
    isLoading.value = true;
    dialog.value = false;

    // genero lo slug
    const slug = deckName.value.toLowerCase().replace(/\s+/g, "-");

    // costruisco il nuovo deck
    const newDeck = {
      name: deckName.value,
      slug,
      leader: null,
      cards: [],
      visibility: "private",
    };

    // salvo subito in locale (IndexedDB)
    await saveLocal(newDeck);

    // navigo alla pagina di editing
    router.push(`/decks/edit/${slug}`);
  } catch (error) {
    console.log("Errore durante la creazione del mazzo:", error);

    snackbar.addMessage(
      "Errore durante la creazione del mazzo",
      "error",
      error
    );
  } finally {
    isLoading.value = false;
  }
}
</script>

<template>
  <div>
    <v-btn density="compact" variant="text" @click="dialog = true">
      Crea Mazzo
      <Icon class="text-sm ml-3" icon="fa-solid:plus" />
    </v-btn>

    <v-dialog
      v-model="dialog"
      width="90%"
      variant="outlined"
      transition="dialog-bottom-transition"
      style="z-index: 2000"
    >
      <v-card class="border border-2 border-white">
        <v-card-title class="bg-black text-white font-bold text-2xl">
          Crea nuovo Mazzo
        </v-card-title>

        <v-card-text>
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
          <v-btn :loading="isLoading" variant="outlined" @click="create">
            Crea Deck
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>
