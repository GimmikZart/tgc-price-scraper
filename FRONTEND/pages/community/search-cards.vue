<script setup>
const router = useRouter();

definePageMeta({
  middleware: "auth",
});
</script>

<template>
  <section class="relative h-full">
    <Toolbar label="Community: Cerca Carte" />

    <v-container class="flex flex-col gap-4 px-4 pb-24 pt-3">
      <div class="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
        <p class="text-[11px] uppercase tracking-[0.18em] text-slate-400">
          Mercato
        </p>
        <p class="mt-2 text-sm text-slate-200/90">
          Spazio dedicato alla ricerca carte dagli altri utenti.
        </p>
      </div>

      <div class="rounded-3xl border border-dashed border-white/20 bg-white/[0.03] p-5">
        <p class="text-sm text-slate-300/80">
          Integra qui filtri e annunci community.
        </p>
        <v-btn
          class="mt-4"
          color="orange"
          variant="tonal"
          @click="router.push('/cards')"
        >
          Vai alla lista carte
        </v-btn>
      </div>
    </v-container>
  </section>
</template>
