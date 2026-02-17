<script setup>
const router = useRouter();

definePageMeta({
  middleware: "auth",
});
</script>

<template>
  <section class="relative h-full">
    <Toolbar label="Community: Vendi Carte" />

    <v-container class="flex flex-col gap-4 px-4 pb-24 pt-3">
      <div class="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
        <p class="text-[11px] uppercase tracking-[0.18em] text-slate-400">
          I Tuoi Annunci
        </p>
        <p class="mt-2 text-sm text-slate-200/90">
          Crea, monitora e pubblica i lotti da vendere alla community.
        </p>
      </div>

      <div class="rounded-3xl border border-dashed border-white/20 bg-white/[0.03] p-5">
        <p class="text-sm text-slate-300/80">
          Collegamento pronto alla sezione collezione per selezionare le carte da mettere in vendita.
        </p>
        <v-btn
          class="mt-4"
          color="orange"
          variant="tonal"
          @click="router.push('/collection')"
        >
          Apri collezione
        </v-btn>
      </div>
    </v-container>
  </section>
</template>
