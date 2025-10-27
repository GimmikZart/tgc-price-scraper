<script setup>
import { Icon } from "@iconify/vue";
import { renameAlbum } from "@/api/album";
const props = defineProps({
  album: {
    type: Object,
    required: true,
  },
});
const gs = useGlobalSettings();
const emits = defineEmits(['refresh']);

const name = ref("");

async function saveName() {
  await renameAlbum(props.album.id, name.value);
  emits('refresh');
}
const bottomDistance = computed(() => {
  return (gs.navbarHeight + gs.floatMenuHeight + gs.paginationHeight);
});
onMounted(() => {
  name.value = props.album.name;
});
</script>

<template>
  <DialogsGeneric @confirm="saveName" :from-bottom="bottomDistance">
    <template #button>
      <Icon icon="mdi:pencil" class="text-2xl" />
      <span>Rinomina</span>
    </template>
    <template #title>
      Rinomina Album
    </template>
    <template #content>
      <v-text-field v-model="name" label="Nome Album" />
    </template>
  </DialogsGeneric>
</template>