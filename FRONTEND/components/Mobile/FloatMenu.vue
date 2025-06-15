<script setup lang="ts">
import { useMyBreakpoints } from "@/composables/useMyBreakpoints";
import { useMobileFloatMenu } from "@/stores/useMobileFloatMenu";
import { Icon } from "@iconify/vue";

const { isMobile } = useMyBreakpoints();
const mobileFloatMenu = useMobileFloatMenu();
</script>

<template>
  <div
    v-if="isMobile"
    class="min-w-[50px] min-h-[50px] rounded-lg border-[1px] border-white/20 bg-black flex flex-col-reverse gap-3 fixed bottom-[100px] right-2 py-3 items-end justify-around z-2 lg:hidden"
  >
    <div class="w-full flex justify-center" v-if="!mobileFloatMenu.isOpen">
      <Icon
        class="text-yellow text-xl"
        @click="mobileFloatMenu.open()"
        icon="heroicons:bolt-16-solid"
      />
    </div>
    <v-btn variant="text" @click="mobileFloatMenu.close()" v-else>
      <span class="mr-3 text-xs">Chiudi</span>
      <Icon
        class="text-yellow text-xl"
        @click="mobileFloatMenu.close()"
        icon="heroicons:bolt-slash-16-solid"
      />
    </v-btn>

    <div
      v-if="mobileFloatMenu.isOpen"
      class="flex flex-col items-end gap-5 py-3 rounded-lg"
    >
      <slot name="buttons" />
    </div>
  </div>
</template>
