<script setup>
import { useUserAuth } from "@/stores/useUserAuth";
import { Icon } from "@iconify/vue";

const userAuth = useUserAuth();

</script>
<template>
  <nav
    class="w-screen flex gap-5 fixed bottom-0 right-0 items-center justify-around h-[45px] bg-black z-[1000]"
  >
    <NuxtLink
      v-if="userAuth.isAdmin"
      to="/admin"
      active-class="text-white font-bold"
      class="text-white/60 p-2 cursor-pointer rounded-lg relative"
    >
      <Icon class="text-3xl" icon="material-symbols:admin-panel-settings-outline-rounded" />
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
      class="text-white/60 p-2 cursor-pointer rounded-lg relative"
    >
      <Icon class="text-3xl" icon="mdi:cards" />
    </NuxtLink>
    <NuxtLink
      to="/collection"
      active-class="text-white font-bold"
      class="text-white/60 p-2 cursor-pointer rounded-lg relative"
    >
      <Icon class="text-3xl" icon="material-symbols:collections-bookmark" />
    </NuxtLink>
    <NuxtLink
      to="/decks"
      active-class="text-white font-bold"
      class="text-white/60 p-2 cursor-pointer rounded-lg relative"
    >
      <Icon class="text-3xl" icon="ph:cards-three-bold" />
    </NuxtLink>
    <NuxtLink
      to="/user"
      active-class="text-white font-bold"
      class="text-white/60 p-2 cursor-pointer rounded-lg relative"
    >
      <Icon class="text-3xl" icon="mdi:user-circle" />
    </NuxtLink>
  </nav>
</template>
