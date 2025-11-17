<script setup>
import { getAlbums } from "@/api/album";
import { Icon } from "@iconify/vue";

const {
  data: albums,
  error,
  pending: pendingAlbums,
} = await useAsyncData("albums", getAlbums);

definePageMeta({
    middleware: 'auth'
})
</script>
<template>
  <section class="h-full flex flex-col">
    <Toolbar backButton label="I tuoi Album"> </Toolbar>
    <v-container class="flex flex-col justify-start grow relative gap-5">
      <p v-if="!albums || albums.length === 0" class="text-white/50 text-center">Non hai ancora creato nessun album!</p>
      <div
        class="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
      >
        <ButtonAlbum
          v-for="album in albums"
          :key="album.slug"
          :to="`/collection/albums/${album.slug}`"
          :label="album.name"
        />
      </div>
    </v-container>
    <MobileFloatMenu :cols="1">
      <template #buttons>
        <DialogsHandleAlbum />
      </template>
    </MobileFloatMenu>
  </section>
</template>
