<script setup>
import { removePage } from "@/api/album";

const props = defineProps({
  album: { type: Object, required: true },
});
const emits = defineEmits(["refresh"]);

const gs = useGlobalSettings();

const bottomDistance = computed(() => {
  return (gs.navbarHeight + gs.floatMenuHeight + gs.paginationHeight);
});

async function removeLastPage() {
  console.log('aooo?');
  
  await removePage(props.album);
  emits("refresh");
}
</script>

<template>
  <div class="flex justify-center">
    <DialogsGeneric
      :from-bottom="bottomDistance"
      @confirm="removeLastPage"
      accept-label="Rimuovi"
      accept-color="red"
    >
      <template #button>
        <ButtonMenu
          icon="hugeicons:file-remove"
          label="Rimuovi Pagina"
          icon-color="orange"
        />
      </template>

      <template #title>Sei sicuro di voler eliminare l'ultima pagina?</template>

      <template #content>
        <p class="text-white">L'operazione è irreversibile.</p>
      </template>
    </DialogsGeneric>
  </div>
</template>
