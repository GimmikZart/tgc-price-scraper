<script setup lang="ts">
import { useMyBreakpoints } from "@/composables/useMyBreakpoints";
import { useMobileFloatMenu } from "@/stores/useMobileFloatMenu";

const { isMobile } = useMyBreakpoints();
const mobileFloatMenu = useMobileFloatMenu();

function closeFloatMenu() {
  mobileFloatMenu.close();
}
</script>

<template>
  <Transition
    appear
    enter-active-class="transition-transform duration-300 ease-out"
    enter-from-class="translate-y-full"
    enter-to-class="translate-y-0"
    leave-active-class="transition-transform duration-300 ease-in"
    leave-from-class="translate-y-0"
    leave-to-class="translate-y-full"
  >
    <div
      v-if="isMobile"
      v-show="mobileFloatMenu.isOpen"
      class="w-screen h-[50px] bg-black flex gap-5 fixed bottom-0 right-0 items-center justify-around z-10 lg:hidden"
    >
      <v-btn class="text-purple" variant="text" @click="closeFloatMenu">
        <v-icon size="30">mdi-home</v-icon>
        <v-icon size="15" class="animate-bounce">mdi-arrow-down</v-icon>
      </v-btn>
      <slot name="buttons" />
    </div>
  </Transition>
</template>
