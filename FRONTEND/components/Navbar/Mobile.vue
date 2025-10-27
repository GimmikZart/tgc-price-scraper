<script setup>
import { useUserAuth } from "@/stores/useUserAuth";
import { Icon } from "@iconify/vue";
import { useElementBounding  } from '@vueuse/core'

const nav = ref(null)
const { height } = useElementBounding (nav)

const userAuth = useUserAuth();
const globalSettings = useGlobalSettings();

watch(height, (newHeight) => {
  globalSettings.navbarHeight = newHeight;
}, { immediate: true });

</script>
<template>
  <nav
    ref="nav"
    class="w-screen flex gap-5 fixed bottom-0 right-0 items-center justify-around h-auto pb-5 bg-black z-[1000]"
  >
    <NuxtLink
      v-if="userAuth.isAdmin"
      to="/admin"
      active-class="text-white font-bold"
      class="text-white/60 p-2 cursor-pointer rounded-lg relative flex flex-col items-center justify-center"
    >
      <Icon class="text-3xl" icon="material-symbols:admin-panel-settings-outline-rounded" />
      <span class="text-xs">Admin</span>
    </NuxtLink>
    <!-- <NuxtLink
      to="/"
      active-class="text-white font-bold"
      class="text-white/60 p-2 cursor-pointer rounded-lg relative"
    >
      <Icon class="text-3xl" icon="mdi-shopping"></Icon>
    </NuxtLink> -->
    <NuxtLink
      to="/cards"
      active-class="text-white font-bold"
      class="text-white/60 p-2 cursor-pointer rounded-lg relative flex flex-col items-center justify-center"
    >
      <Icon class="text-3xl" icon="mdi:cards" />
      <span class="text-xs">Carte</span>
    </NuxtLink>
    <NuxtLink
      to="/collection"
      active-class="text-white font-bold"
      class="text-white/60 p-2 cursor-pointer rounded-lg relative flex flex-col items-center justify-center"
    >
      <Icon class="text-3xl" icon="material-symbols:collections-bookmark" />
      <span class="text-xs">Collezione</span>
    </NuxtLink>
    <NuxtLink
      to="/decks"
      active-class="text-white font-bold"
      class="text-white/60 p-2 cursor-pointer rounded-lg relative flex flex-col items-center justify-center"
    >
      <Icon class="text-3xl" icon="ph:cards-three-bold" />
      <span class="text-xs">Mazzi</span>
    </NuxtLink>
    <NuxtLink
      to="/user"
      active-class="text-white font-bold"
      class="text-white/60 p-2 cursor-pointer rounded-lg relative flex flex-col items-center justify-center"
    >
      <Icon class="text-3xl" icon="mdi:user-circle" />
      <span class="text-xs">Profilo</span>
    </NuxtLink>
  </nav>
</template>
