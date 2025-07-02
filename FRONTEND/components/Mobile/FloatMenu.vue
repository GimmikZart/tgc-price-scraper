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
    class="flex flex-col-reverse gap-3 p-2 items-end justify-around z-2 lg:hidden"
  >
    <div
      class="w-full border-[1px] border-white p-1 rounded-lg flex justify-center"
    >
      <Icon
        v-if="!mobileFloatMenu.isOpen"
        class="text-xl"
        @click="mobileFloatMenu.open()"
        icon="line-md:close-to-menu-transition"
      />
      <Icon
        v-else
        class="text-xl"
        @click="mobileFloatMenu.close()"
        icon="line-md:menu-to-close-transition"
      />
    </div>

    <div
      v-if="mobileFloatMenu.isOpen"
      class="fixed h-fit z-[50] top-[50px] right-0 flex flex-col items-end gap-5 py-3 rounded-lg"
    >
      <div
        class="w-screen h-screen z-[10] bg-black/30 backdrop-blur-[2px]"
        @click="mobileFloatMenu.close()"
      />
      <div
        class="fixed border-[1px] border-white/50 bg-black rounded-lg top-[60px] right-0 z-[50] flex flex-col items-end gap-5 py-5"
      >
        <slot name="buttons" />
      </div>
    </div>
  </div>
</template>
