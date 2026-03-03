<script setup>
import { computed } from "vue";
import { getAlbums } from "@/api/album";
import ProfileSectionsTabs from "@/components/Tabs/ProfileSectionsTabs.vue";

const route = useRoute();
const router = useRouter();

const {
  data: albums,
  error,
  pending: pendingAlbums,
} = await useAsyncData("albums", getAlbums);

const tabOptions = computed(() => [
  {
    label: "Carte",
    value: "/me/collection",
  },
  {
    label: "Album",
    value: "/me/collection/albums",
  },
]);

const activeSection = computed(() =>
  route.path === "/me/collection/albums" ? "/me/collection/albums" : "/me/collection"
);

function setActiveSection(path) {
  if (path === activeSection.value) return;
  router.push(path);
}

definePageMeta({
    middleware: 'auth'
})
</script>
<template>
  <section class="relative h-full">
    <Toolbar label="La tua collezione" fixed>
      <template #info>
        <ProfileSectionsTabs
          :tabs="tabOptions"
          :active="activeSection"
          @change="setActiveSection"
        />
      </template>
    </Toolbar>
    <v-container class="relative flex grow flex-col justify-start gap-5 px-4 pb-24 pt-3">
      <p v-if="pendingAlbums" class="text-center text-sm text-white/50">Caricamento album...</p>
      <p
        v-else-if="error"
        class="rounded-2xl border border-red-500/40 bg-red-500/10 p-3 text-center text-sm text-red-200"
      >
        {{ error.message || "Errore nel caricamento degli album." }}
      </p>
      <p v-else-if="!albums || albums.length === 0" class="text-white/50 text-center">Non hai ancora creato nessun album!</p>
      <div
        v-else
        class="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
      >
        <ButtonAlbum
          v-for="album in albums"
          :key="album.slug"
          :to="`/me/collection/albums/${album.slug}`"
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
