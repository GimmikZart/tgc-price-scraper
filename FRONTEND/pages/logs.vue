<script setup>
import { useSnackbar } from "@/stores/useSnackbar";
const snackbar = useSnackbar();
const autoscroll = ref(true);
const containerRef = ref(null);
const autoscrollCheckbox = computed(() =>
  autoscroll.value ? "Autoscroll ON" : "Autoscroll OFF"
);

watch(
  () => snackbar.messages.length,
  async (newLen, oldLen) => {
    // aspetta che il DOM venga aggiornato
    await nextTick();
    if (autoscroll.value && containerRef.value) {
      // scrolliamo in fondo
      containerRef.value.scrollTop = containerRef.value.scrollHeight;
    }
  }
);
definePageMeta({
  hideFloatSnackbar: true,
});

onMounted(() => {
  if (autoscroll.value && containerRef.value) {
    containerRef.value.scrollTop = containerRef.value.scrollHeight;
  }
});
</script>
<template>
  <section class="pb-20 flex flex-col h-dvh">
    <Toolbar label="Avvisi">
      <template #actions>
        <div class="flex items-center gap-2">
          <v-btn color="white" class="grow" @click="snackbar.removeAll"
            >PULISCI AVVISI</v-btn
          >
          <v-checkbox
            v-model="autoscroll"
            :label="autoscrollCheckbox"
            hide-details
            >{{}}</v-checkbox
          >
        </div>
      </template>
    </Toolbar>
    <div
      ref="containerRef"
      class="flex-1 min-h-0 overflow-y-auto flex flex-col gap-3 p-3 scroll-smooth"
    >
      <Snackbar
        v-for="msg in snackbar.messages"
        :key="msg.id"
        :id="msg.id"
        :title="msg.title"
        :message="msg.message"
        :type="msg.type"
        :duration="null"
        :is-floating="false"
      />
    </div>
  </section>
</template>
