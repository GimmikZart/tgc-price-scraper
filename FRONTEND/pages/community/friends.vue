<script setup>
definePageMeta({
  middleware: "auth",
});
</script>

<template>
  <section class="relative h-full">
    <Toolbar label="Community: Amici" />

    <v-container class="flex flex-col gap-4 px-4 pb-24 pt-3">
      <div class="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
        <p class="text-[11px] uppercase tracking-[0.18em] text-slate-400">
          In Arrivo
        </p>
        <p class="mt-2 text-sm text-slate-200/90">
          Qui potrai gestire richieste, suggerimenti e inviti alla community.
        </p>
      </div>

      <div class="rounded-3xl border border-dashed border-white/20 bg-white/[0.03] p-5 text-center">
        <p class="text-sm text-slate-300/80">
          Modulo amici pronto per essere collegato alle API social.
        </p>
      </div>
    </v-container>
  </section>
</template>
