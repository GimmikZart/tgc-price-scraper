<script setup>
import { createAlbum } from "@/api/album";
import { Icon } from "@iconify/vue";

const emits = defineEmits(["refresh"]);

const snackbar = useSnackbar();
const isLoading = ref(false);
const albumName = ref(null);
const totalPages = ref(1);
const totalSlots = computed(() => totalPages.value * 10);
const router = useRouter();

// stringa non vuota
const isValidAlbumName = computed(() => {
  return albumName.value && albumName.value.trim().length > 0;
});

async function onConfirm() {
  // valida prima di confermare
  if (!isValidAlbumName.value) {
    snackbar.addMessage("Inserisci un nome valido per l'album.", "warning");
    return;
  }
  isLoading.value = true;
  try {
    const slug = await createAlbum(albumName.value.trim(), totalSlots.value);
    emits("refresh");
    if (slug) router.push(`/collection/albums/${slug}`);
  } catch (error) {
    snackbar.addMessage("Errore durante la creazione", "error", error);
  } finally {
    isLoading.value = false;
  }
}
</script>

<template>
  <DialogsGeneric
    @confirm="onConfirm"
    accept-label="Crea Album"
  >
    <template #button>
      <ButtonMenu
        icon="fluent:book-add-28-filled"
        label="Aggiungi"
        transition
        :delay="100"
      />
    </template>

    <template #title>Crea nuovo Album</template>

    <template #content>
      <v-text-field
        label="Nome*"
        v-model="albumName"
        density="compact"
        variant="outlined"
      />
      <v-number-input
        label="Pagine totali"
        v-model="totalPages"
        control-variant="split"
        icon-color="white"
        :min="1"
        glow
        density="compact"
        variant="outlined"
        persistent-hint
        hint="Ogni pagina contiene 10 carte. Potrai modificare il numero di pagine anche in seguito"
      />
      <div v-if="isLoading" class="text-xs opacity-70 mt-2">
        Creazione in corso…
      </div>
    </template>
  </DialogsGeneric>
</template>
<style>

#dialog-generic > div > div.v-card-text > div.v-input.v-input--horizontal.v-input--center-affix.v-input--glow.v-input--density-compact.v-theme--light.v-locale--is-ltr.v-input--dirty.v-text-field.v-number-input.v-number-input--split > div.v-input__control > div > div.v-field__prepend-inner > div > button > span.v-btn__content > i,
#dialog-generic > div > div.v-card-text > div.v-input.v-input--horizontal.v-input--center-affix.v-input--glow.v-input--density-compact.v-theme--light.v-locale--is-ltr.v-input--dirty.v-text-field.v-number-input.v-number-input--split > div.v-input__control > div > div.v-field__append-inner > div > button > span.v-btn__content > i {
  color: white;
}
</style>
