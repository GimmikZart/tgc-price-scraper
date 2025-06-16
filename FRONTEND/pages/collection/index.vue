<script setup>
import { getAlbums } from "@/api/album";

const {
  data: albums,
  error,
  pending: pendingAlbums,
} = await useAsyncData("albums", getAlbums);
</script>
<template>
  <section class="h-full flex flex-col">
    <Toolbar label="Collezione"> </Toolbar>
    <v-container class="flex flex-col justify-start grow relative gap-5">
      <div>
        <ButtonRouter
          to="/collection/all"
          label="Tutto"
          class="w-full h-[100px]"
        />
      </div>
      <div class="flex justify-between items-center">
        <h2 class="text-2xl font-bold text-center">Album</h2>
        <DialogsHandleAlbum />
      </div>
      <div>
        <ButtonRouter
          v-for="album in albums"
          :key="album.slug"
          :to="`/collection/album/${album.slug}`"
          :label="album.name"
          class="w-full h-[100px]"
        />
      </div>
    </v-container>
  </section>
</template>
