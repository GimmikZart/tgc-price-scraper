<script setup>
import { removeAlbum } from "@/api/album";

const props = defineProps({
  albumId: { type: Number, required: true },
});
const emits = defineEmits(["refresh"]);

const snackbar = useSnackbar();
const router = useRouter();
const gs = useGlobalSettings();

const bottomDistance = computed(() => {
  return (gs.navbarHeight + gs.floatMenuHeight + gs.paginationHeight);
});

async function deleteAlbum() {
  await removeAlbum(props.albumId);
  router.push("/me/collection/albums");
}
</script>

<template>
  <div class="flex justify-center">
    <DialogsGeneric
      :from-bottom="bottomDistance"
      @confirm="deleteAlbum"
      accept-label="Cancella"
      accept-color="red"
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
