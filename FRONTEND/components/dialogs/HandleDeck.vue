<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import { Icon } from "@iconify/vue";
import { DeckLocation } from "~/enums/deckLocation";

const formRef = ref(null);
const snackbar = useSnackbar();
const isLoading = ref(false);
const deckName = ref("");
const router = useRouter();

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

    router.push({
      path: `/me/decks/edit/${slug}`,
      query: {
        location: DeckLocation.DEVICE,
        draftName: deckName.value,
      },
    });
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
        :delay="100"
        label="Crea Mazzo"
        icon-color="green"
      />
    </template>

    <template #title>Crea nuovo Mazzo</template>

    <template #content>
      <v-form ref="formRef" autocomplete="off" autocorrect="off" autocapitalize="none">
        <v-text-field
          label="Nome mazzo"
          v-model="deckName"
          :rules="[rules.required, rules.alphanumeric]"
          density="compact"
          variant="outlined"
          name="deck-name"
          autocomplete="off"
          autocorrect="off"
          autocapitalize="none"
          spellcheck="false"
          inputmode="text"
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
