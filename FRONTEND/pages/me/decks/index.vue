<script setup>
import { fetchPendingReceivedDeckShares } from "@/api/deckShares";
import { DeckLocation, normalizeDeckLocation } from "~/enums/deckLocation";
import DeckLocationTabs from "@/components/Tabs/DeckLocationTabs.vue";

const router = useRouter();
const route = useRoute();
const snackbar = useSnackbar();
const { getAllLocal, getAllCloud, deleteDeck } = useDeckManager();

const cloudDecks = ref([]);
const deviceDecks = ref([]);
const receivedDecks = ref([]);
const isDeleteMode = ref(false);
const selectedDeckKeys = ref([]);
const deleteDecksDialogRef = ref(null);
const isDeletingDecks = ref(false);

const activeLocation = ref(normalizeDeckLocation(route.query.location));

const canDeleteVisibleDecks = computed(() => (
  activeLocation.value === DeckLocation.CLOUD || activeLocation.value === DeckLocation.DEVICE
));

const tabOptions = computed(() => [
  ...(receivedDecks.value.length > 0
    ? [{
        label: "Ricevuti",
        value: DeckLocation.RECEIVED,
        icon: "mdi:inbox-arrow-down-outline",
        count: receivedDecks.value.length,
      }]
    : []),
  {
    label: "Cloud",
    value: DeckLocation.CLOUD,
    icon: "material-symbols-light:cloud-done-rounded",
    count: cloudDecks.value.length,
  },
  {
    label: "Dispositivo",
    value: DeckLocation.DEVICE,
    icon: "mdi:offline",
    count: deviceDecks.value.length,
  },
]);

const visibleDecks = computed(() => {
  if (activeLocation.value === DeckLocation.RECEIVED) {
    return receivedDecks.value;
  }

  return activeLocation.value === DeckLocation.DEVICE
    ? deviceDecks.value
    : cloudDecks.value;
});

const selectedDeckSet = computed(() => new Set(selectedDeckKeys.value));
const selectedDecks = computed(() => visibleDecks.value.filter(
  (deck) => selectedDeckSet.value.has(getDeckSelectionKey(deck))
));

const emptyStateLabel = computed(() => {
  if (activeLocation.value === DeckLocation.RECEIVED) {
    return "Nessun deck ricevuto in attesa.";
  }

  return activeLocation.value === DeckLocation.DEVICE
    ? "Nessun deck salvato sul dispositivo."
    : "Nessun deck salvato nel cloud.";
});

const emptyStateCategoryLabel = computed(() => {
  if (activeLocation.value === DeckLocation.DEVICE) {
    return "Dispositivo";
  }

  if (activeLocation.value === DeckLocation.RECEIVED) {
    return "Ricevuti";
  }

  return "Cloud";
});

const deleteActionLabel = computed(() => (
  isDeleteMode.value ? "Conferma eliminazione" : "Elimina mazzo"
));

const deleteActionIcon = computed(() => (
  isDeleteMode.value ? "mdi-check" : "tabler:trash"
));

const floatMenuCols = computed(() => (canDeleteVisibleDecks.value ? 2 : 1));
const isReceivedLocation = computed(() => activeLocation.value === DeckLocation.RECEIVED);

const deleteSelectionSummary = computed(() => {
  if (selectedDecks.value.length === 0) {
    return "Seleziona uno o piu deck da eliminare.";
  }

  if (selectedDecks.value.length === 1) {
    return "1 deck selezionato per l'eliminazione.";
  }

  return `${selectedDecks.value.length} deck selezionati per l'eliminazione.`;
});

function getDeckSelectionKey(deck) {
  return String(deck?.id ?? deck?.slug ?? "");
}

function formatReceivedDeckDate(value) {
  if (!value) return "";

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) return "";

  return parsedDate.toLocaleString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function resetDeleteMode() {
  isDeleteMode.value = false;
  selectedDeckKeys.value = [];
}

function syncSelectedDecksWithVisibleList() {
  const visibleKeys = new Set(visibleDecks.value.map(getDeckSelectionKey));
  selectedDeckKeys.value = selectedDeckKeys.value.filter((key) => visibleKeys.has(key));

  if (visibleDecks.value.length === 0) {
    resetDeleteMode();
  }
}

function setActiveLocation(location) {
  const normalizedLocation = normalizeDeckLocation(location);
  if (normalizedLocation === activeLocation.value) return;

  activeLocation.value = normalizedLocation;
  resetDeleteMode();

  router.replace({
    query: {
      ...route.query,
      location: normalizedLocation,
    },
  });
}

function goToDeck(deck, location) {
  if (location === DeckLocation.RECEIVED) {
    const senderTag = deck?.sender_profile?.user_tag;
    if (!senderTag || !deck?.id) return;

    router.push(`/profile/${encodeURIComponent(senderTag)}/decks/${encodeURIComponent(deck.slug)}?shareId=${deck.id}`);
    return;
  }

  router.push(`/me/decks/${deck.slug}?location=${location}`);
}

function toggleDeckSelection(deck) {
  const key = getDeckSelectionKey(deck);
  if (!key) return;

  if (selectedDeckKeys.value.includes(key)) {
    selectedDeckKeys.value = selectedDeckKeys.value.filter((candidate) => candidate !== key);
    return;
  }

  selectedDeckKeys.value = [...selectedDeckKeys.value, key];
}

function handleDeckClick(deck) {
  if (isDeleteMode.value && canDeleteVisibleDecks.value) {
    toggleDeckSelection(deck);
    return;
  }

  goToDeck(deck, activeLocation.value);
}

function handleDeleteAction() {
  if (!canDeleteVisibleDecks.value) return;

  if (!isDeleteMode.value) {
    isDeleteMode.value = true;
    selectedDeckKeys.value = [];
    return;
  }

  if (selectedDecks.value.length === 0) {
    resetDeleteMode();
    snackbar.addMessage("Modalita eliminazione disattivata", "info");
    return;
  }

  deleteDecksDialogRef.value?.openDialog?.();
}

function removeDeletedDecks(location, deletedSlugs) {
  if (location === DeckLocation.CLOUD) {
    cloudDecks.value = cloudDecks.value.filter((deck) => !deletedSlugs.has(deck.slug));
    return;
  }

  if (location === DeckLocation.DEVICE) {
    deviceDecks.value = deviceDecks.value.filter((deck) => !deletedSlugs.has(deck.slug));
  }
}

async function confirmSelectedDeckDeletion() {
  if (isDeletingDecks.value) return;

  const decksToDelete = selectedDecks.value.filter((deck) => Boolean(deck?.slug));
  if (decksToDelete.length === 0) {
    resetDeleteMode();
    return;
  }

  const location = activeLocation.value;
  isDeletingDecks.value = true;

  try {
    const results = await Promise.allSettled(
      decksToDelete.map((deck) => deleteDeck(deck.slug, location))
    );

    const deletedSlugs = new Set();
    const failedDeckKeys = [];

    results.forEach((result, index) => {
      const deck = decksToDelete[index];
      if (result.status === "fulfilled") {
        deletedSlugs.add(deck.slug);
        return;
      }

      failedDeckKeys.push(getDeckSelectionKey(deck));
    });

    if (deletedSlugs.size > 0) {
      removeDeletedDecks(location, deletedSlugs);
    }

    selectedDeckKeys.value = failedDeckKeys;
    isDeleteMode.value = failedDeckKeys.length > 0;

    if (deletedSlugs.size > 0 && failedDeckKeys.length === 0) {
      snackbar.addMessage(
        deletedSlugs.size === 1
          ? "Deck eliminato con successo"
          : `${deletedSlugs.size} deck eliminati con successo`,
        "success",
      );
      return;
    }

    if (deletedSlugs.size > 0) {
      snackbar.addMessage(
        `${deletedSlugs.size} deck eliminati, ${failedDeckKeys.length} non eliminati`,
        "warning",
      );
      return;
    }

    snackbar.addMessage("Impossibile eliminare i deck selezionati", "error");
  } catch (error) {
    snackbar.addMessage(error?.message || "Errore durante l'eliminazione dei deck", "error");
  } finally {
    isDeletingDecks.value = false;
  }
}

watch(
  () => route.query.location,
  (location) => {
    const normalizedLocation = normalizeDeckLocation(location);
    activeLocation.value = normalizedLocation;
    resetDeleteMode();

    if (typeof location === "string" && location !== normalizedLocation) {
      router.replace({
        query: {
          ...route.query,
          location: normalizedLocation,
        },
      });
    }
  },
  { immediate: true },
);

watch(visibleDecks, () => {
  syncSelectedDecksWithVisibleList();
}, { deep: true });

definePageMeta({
  ssr: false,
  middleware: "auth",
});

onMounted(async () => {
  try {
    const [cloud, device, received] = await Promise.all([
      getAllCloud(),
      getAllLocal(),
      fetchPendingReceivedDeckShares(),
    ]);

    cloudDecks.value = cloud;
    deviceDecks.value = device;
    receivedDecks.value = received;

    if (activeLocation.value === DeckLocation.RECEIVED && receivedDecks.value.length === 0) {
      activeLocation.value = DeckLocation.CLOUD;
      router.replace({
        query: {
          ...route.query,
          location: DeckLocation.CLOUD,
        },
      });
    }
  } catch (error) {
    snackbar.addMessage(error?.message || "Errore durante il caricamento dei deck", "error");
  }
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
          v-if="isDeleteMode && canDeleteVisibleDecks && visibleDecks.length > 0"
          class="rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-4 text-slate-100"
        >
          <p class="text-[11px] uppercase tracking-[0.16em] text-red-200/80">
            Modalita eliminazione
          </p>
          <p class="mt-2 text-sm">
            {{ deleteSelectionSummary }}
          </p>
          <p class="mt-1 text-xs text-slate-300/75">
            Tocca un deck per selezionarlo o rimuoverlo dalla lista di eliminazione.
          </p>
        </div>

        <div
          v-if="visibleDecks.length === 0"
          class="rounded-2xl border border-dashed border-white/20 bg-white/[0.03] px-4 py-8 text-center text-slate-300/80"
        >
          <p class="text-[11px] uppercase tracking-[0.16em] text-slate-400/80">
            {{ emptyStateCategoryLabel }}
          </p>
          <p class="mt-2 text-sm">
            {{ emptyStateLabel }}
          </p>
        </div>

        <template v-if="isReceivedLocation">
          <button
            v-for="deck in visibleDecks"
            :key="deck.id ?? deck.slug"
            type="button"
            class="received-deck-card"
            @click="handleDeckClick(deck)"
          >
            <IdentityAndDeck
              :profile="deck.sender_profile"
              :deck="deck"
              :profile-navigable="false"
              compact-deck
            />

            <p class="received-deck-card__meta">
              Ricevuto da {{ deck.sender_profile?.display_name ?? deck.sender_profile?.username ?? "@utente" }}
              <span v-if="formatReceivedDeckDate(deck.created_at)">
                il {{ formatReceivedDeckDate(deck.created_at) }}
              </span>
            </p>
          </button>
        </template>

        <DecksItem
          v-else
          v-for="deck in visibleDecks"
          :key="deck.id ?? deck.slug"
          :leader-id="deck.leader"
          :current-deck="deck"
          :selection-mode="isDeleteMode && canDeleteVisibleDecks"
          :selected="selectedDeckSet.has(getDeckSelectionKey(deck))"
          @click="handleDeckClick(deck)"
        />
      </div>
    </v-container>

    <MobileFloatMenu :cols="floatMenuCols">
      <template #buttons>
        <ButtonMenu
          v-if="canDeleteVisibleDecks"
          :icon="deleteActionIcon"
          :label="deleteActionLabel"
          color="red"
          transition
          :delay="100"
          :disabled="visibleDecks.length === 0 || isDeletingDecks"
          @click="handleDeleteAction"
        />
        <DialogsHandleDeck />
      </template>
    </MobileFloatMenu>

    <DialogsDeleteDecksConfirm
      ref="deleteDecksDialogRef"
      :decks="selectedDecks"
      :deck-location="activeLocation"
      :disabled="isDeletingDecks"
      @confirm="confirmSelectedDeckDeletion"
    />
  </section>
</template>

<style scoped>
.received-deck-card {
  width: 100%;
  text-align: left;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 1rem;
  background: linear-gradient(145deg, rgba(15, 23, 42, 0.7), rgba(2, 6, 23, 0.84));
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.08),
    0 16px 26px rgba(0, 0, 0, 0.33);
  padding: 0.6rem;
  transition:
    transform 160ms ease,
    border-color 160ms ease,
    filter 160ms ease;
}

.received-deck-card:hover {
  transform: translateY(-1px);
  border-color: rgba(255, 157, 82, 0.45);
  filter: brightness(1.02);
}

.received-deck-card:focus-visible {
  outline: none;
  border-color: rgba(255, 216, 177, 0.52);
  box-shadow:
    0 0 0 2px rgba(255, 216, 177, 0.22),
    0 16px 26px rgba(0, 0, 0, 0.33);
}

.received-deck-card__meta {
  margin: 0.45rem 0 0;
  color: rgba(148, 163, 184, 0.95);
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
</style>
