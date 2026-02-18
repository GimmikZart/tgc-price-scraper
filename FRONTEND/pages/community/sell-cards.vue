<script setup>
const router = useRouter();

definePageMeta({
  middleware: "auth",
});
</script>

<template>
  <section class="relative h-full">
    <Toolbar label="Vendi Carte" />

    <v-container class="flex flex-col gap-4 px-4 pb-24 pt-3">
      <div class="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
        <p class="text-[11px] uppercase tracking-[0.18em] text-slate-400">
          I Tuoi Annunci
        </p>
        <p class="mt-2 text-sm text-slate-200/90">
          Crea, monitora e pubblica i lotti da vendere alla community.
        </p>
      </div>
    </v-container>

    <MobileFloatMenu :cols="2">
      <template #buttons>
        <ButtonMenu
          icon="mdi:cash-plus"
          label="Nuova Vendita"
          transition
          :delay="100"
        />
        <ButtonMenu
          icon="mdi:clipboard-clock-outline"
          label="Vendite in corso"
          transition
          :delay="200"
        />
      </template>
    </MobileFloatMenu>
  </section>
</template>
