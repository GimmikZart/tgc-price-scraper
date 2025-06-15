<script setup lang="ts">
import { useMyBreakpoints } from "@/composables/useMyBreakpoints";
import { useMobileFloatMenu } from "@/stores/useMobileFloatMenu";

const { isMobile } = useMyBreakpoints();
const mobileFloatMenu = useMobileFloatMenu();
const menuOpen = ref(false);

function closeFloatMenu() {
  mobileFloatMenu.close();
}
</script>

<template>
  <div
    v-if="isMobile"
    class="min-w-[50px] h-[50px] rounded-full border-[1px] border-white/20 bg-black flex gap-5 fixed bottom-[100px] right-2 items-center justify-around z-2 lg:hidden"
  >
    <v-icon color="yellow" @click="menuOpen = true" size="20"
      >mdi-lightning-bolt</v-icon
    >
    <div
      v-if="menuOpen"
      class="min-w-[50px] h-auto bg-black fixed border-[1px] border-white/20 bottom-[100px] right-2 flex flex-col items-end gap-10 p-5 rounded-lg"
    >
      <slot name="buttons" />
      <v-btn variant="text" @click="menuOpen = false">
        <span class="tex-xs mr-3">Chiudi</span>
        <v-icon color="yellow" size="20">mdi-flash-off</v-icon>
      </v-btn>
    </div>
  </div>
</template>
