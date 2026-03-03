<script setup>
import { DeckLocation } from "~/enums/deckLocation";
import DeckLocationTabs from "@/components/Tabs/DeckLocationTabs.vue";
const router = useRouter();
const route = useRoute();
const { getAllLocal, getAllCloud } = useDeckManager();

const cloudDecks = ref([]);
const localDecks = ref([]);

function normalizeDeckLocation(location) {
  return location === DeckLocation.BOZZA ? DeckLocation.BOZZA : DeckLocation.CLOUD;
}

const activeLocation = ref(normalizeDeckLocation(route.query.location));

const tabOptions = computed(() => [
  {
    label: "Cloud",
    value: DeckLocation.CLOUD,
    icon: "material-symbols-light:cloud-done-rounded",
    count: cloudDecks.value.length,
  },
  {
    label: "Bozze",
    value: DeckLocation.BOZZA,
    icon: "mdi:offline",
    count: localDecks.value.length,
  },
]);

const visibleDecks = computed(() => {
  return activeLocation.value === DeckLocation.BOZZA
    ? localDecks.value
    : cloudDecks.value;
});

const emptyStateLabel = computed(() => {
  return activeLocation.value === DeckLocation.BOZZA
    ? "Nessuna bozza locale disponibile."
    : "Nessun deck salvato nel cloud.";
});

watch(
  () => route.query.location,
  (location) => {
    activeLocation.value = normalizeDeckLocation(location);
  },
);

function setActiveLocation(location) {
  if (location === activeLocation.value) return;
  activeLocation.value = location;
  router.replace({
    query: {
      ...route.query,
      location,
    },
  });
}

function goToDeck(deck, location) {
  router.push(`/me/decks/${deck.slug}?location=${location}`);
}

definePageMeta({
  ssr: false,
  middleware: 'auth',
});

onMounted(async () => {
  const [cloud, local] = await Promise.all([getAllCloud(), getAllLocal()]);
  cloudDecks.value = cloud;
  localDecks.value = local;
});
</script>
<template>
  <section class="relative h-full">
    <Toolbar label="Mazzi" fixed>
      <template #info>
        <DeckLocationTabs
          :tabs="tabOptions"
          :active="activeLocation"
          @change="setActiveLocation"
        />
      </template>
    </Toolbar>
    <v-container class="relative flex grow flex-col justify-start gap-5 pt-3">
      <div class="grid grid-cols-1 gap-5">
        <div
          v-if="visibleDecks.length === 0"
          class="rounded-2xl border border-dashed border-white/20 bg-white/[0.03] px-4 py-8 text-center text-slate-300/80"
        >
          <p class="text-[11px] uppercase tracking-[0.16em] text-slate-400/80">
            {{ activeLocation === DeckLocation.BOZZA ? "Bozze" : "Cloud" }}
          </p>
          <p class="mt-2 text-sm">
            {{ emptyStateLabel }}
          </p>
        </div>

        <DecksItem
          v-for="deck in visibleDecks"
          :key="deck.slug"
          :leader-id="deck.leader"
          :current-deck="deck"
          @click="goToDeck(deck, activeLocation)"
        />
      </div>
    </v-container>
    <MobileFloatMenu :cols="2">
      <template #buttons>
        <DialogsImportDeck />
        <DialogsHandleDeck />
      </template>
    </MobileFloatMenu>
  </section>
</template>
