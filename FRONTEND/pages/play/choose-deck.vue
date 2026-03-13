<script setup>
import { fetchMatchById, selectMatchDeck } from "@/api/matches";

const route = useRoute();
const router = useRouter();
const snackbar = useSnackbar();
const userAuth = useUserAuth();

const { getAllCloud } = useDeckManager();

const isLoading = ref(true);
const loadError = ref(null);
const matchRow = ref(null);
const cloudDecks = ref([]);

const selectedDeck = ref(null);
const deckConfirmDialogRef = ref(null);
const isSavingDeck = ref(false);

const currentUserId = computed(() => userAuth?.userLogged?.id ?? null);
const matchId = computed(() => {
  const rawId = route.query.matchId;
  if (Array.isArray(rawId)) return String(rawId[0] ?? "");
  return String(rawId ?? "");
});

const userRole = computed(() => {
  if (!matchRow.value || !currentUserId.value) return null;

  if (String(matchRow.value.challenger_id) === String(currentUserId.value)) {
    return "challenger";
  }

  if (String(matchRow.value.opponent_id) === String(currentUserId.value)) {
    return "opponent";
  }

  return null;
});

const confirmButtonLabel = computed(() => {
  if (userRole.value === "opponent") {
    return "Conferma scelta";
  }

  return "Continua";
});

function selectDeck(deck) {
  if (!deck) return;
  selectedDeck.value = deck;
  nextTick(() => {
    deckConfirmDialogRef.value?.openDialog?.();
  });
}

function closeDialog() {
  deckConfirmDialogRef.value?.closeDialog?.();
}

async function loadPageData() {
  isLoading.value = true;
  loadError.value = null;

  try {
    if (!matchId.value) {
      throw new Error("Match non valido");
    }

    const [fetchedMatch, fetchedCloudDecks] = await Promise.all([
      fetchMatchById(matchId.value),
      getAllCloud(),
    ]);

    if (!fetchedMatch) {
      throw new Error("Match non trovato");
    }

    matchRow.value = fetchedMatch;

    if (!currentUserId.value) {
      throw new Error("Utente non autenticato");
    }

    const isParticipant = [fetchedMatch.challenger_id, fetchedMatch.opponent_id]
      .map((id) => String(id))
      .includes(String(currentUserId.value));

    if (!isParticipant) {
      throw new Error("Non puoi scegliere il mazzo per questo match");
    }

    cloudDecks.value = Array.isArray(fetchedCloudDecks) ? fetchedCloudDecks : [];
  } catch (error) {
    loadError.value = error?.message || "Errore durante il caricamento dei dati";
    snackbar.addMessage(loadError.value, "error");
  } finally {
    isLoading.value = false;
  }
}

async function confirmDeckSelection() {
  if (!selectedDeck.value || !matchId.value || isSavingDeck.value) return;

  isSavingDeck.value = true;

  try {
    await selectMatchDeck({
      matchId: matchId.value,
      deck: selectedDeck.value,
    });

    closeDialog();
    router.push(`/play/match/${matchId.value}`);
  } catch (error) {
    snackbar.addMessage(error?.message || "Errore durante il salvataggio del mazzo", "error");
  } finally {
    isSavingDeck.value = false;
  }
}

onMounted(() => {
  loadPageData();
});

definePageMeta({
  middleware: "auth",
  ssr: false,
});
</script>

<template>
  <section class="relative h-full">
    <Toolbar label="Scegli mazzo" fixed back-button />

    <div class="min-h-0 flex-1 overflow-y-auto px-3 pb-28 pt-2">
      <p v-if="isLoading" class="choose-deck-state-message">
        Caricamento mazzi cloud...
      </p>

      <p v-else-if="loadError" class="choose-deck-state-message choose-deck-state-message--error">
        {{ loadError }}
      </p>

      <div v-else-if="cloudDecks.length === 0" class="choose-deck-empty-state">
        <p class="choose-deck-empty-state__label">Nessun mazzo cloud</p>
        <p class="choose-deck-empty-state__text">
          Salva almeno un mazzo nel cloud prima di continuare.
        </p>
      </div>

      <div v-else class="space-y-3 pb-2">
        <button
          v-for="deck in cloudDecks"
          :key="deck.slug"
          type="button"
          class="choose-deck-item"
          @click="selectDeck(deck)"
        >
          <DecksItem
            :leader-id="deck.leader"
            :current-deck="deck"
          />
        </button>
      </div>
    </div>

    <DialogsGeneric ref="deckConfirmDialogRef" :disabled="isSavingDeck">
      <template #button>
        <span class="choose-deck-hidden-dialog-trigger" aria-hidden="true" />
      </template>

      <template #title>Conferma mazzo</template>

      <template #content>
        <p class="choose-deck-dialog-text">
          Hai scelto il mazzo
          <strong>{{ selectedDeck?.name ?? "" }}</strong>,
          vuoi continuare?
        </p>
      </template>

      <template #actions="{ closeDialog }">
        <v-spacer />
        <v-btn
          variant="text"
          :disabled="isSavingDeck"
          @click="closeDialog"
        >
          Annulla
        </v-btn>
        <v-btn
          variant="flat"
          class="choose-deck-dialog-accept"
          :loading="isSavingDeck"
          :disabled="isSavingDeck"
          @click="confirmDeckSelection"
        >
          {{ confirmButtonLabel }}
        </v-btn>
      </template>
    </DialogsGeneric>
  </section>
</template>

<style scoped>
.choose-deck-state-message {
  margin-top: 1rem;
  text-align: center;
  color: rgba(241, 245, 249, 0.8);
  font-size: 0.9rem;
  font-weight: 600;
}

.choose-deck-state-message--error {
  color: rgba(254, 202, 202, 0.95);
}

.choose-deck-empty-state {
  border: 1px dashed rgba(255, 255, 255, 0.22);
  border-radius: 1rem;
  background: rgba(15, 23, 42, 0.45);
  padding: 1.1rem 0.9rem;
  text-align: center;
}

.choose-deck-empty-state__label {
  margin: 0;
  color: rgba(255, 216, 177, 0.95);
  font-size: 0.74rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.choose-deck-empty-state__text {
  margin: 0.4rem 0 0;
  color: rgba(241, 245, 249, 0.82);
  font-size: 0.86rem;
  line-height: 1.35;
}

.choose-deck-item {
  width: 100%;
  text-align: left;
  border-radius: 1rem;
  overflow: hidden;
}

.choose-deck-dialog-text {
  margin: 0;
  color: rgba(241, 245, 249, 0.9);
  line-height: 1.4;
}

.choose-deck-dialog-accept {
  border: 1px solid rgba(255, 183, 124, 0.4);
  background: linear-gradient(135deg, rgba(255, 122, 24, 0.92), rgba(173, 72, 11, 0.95));
  color: #fff7f0;
}

.choose-deck-hidden-dialog-trigger {
  display: none;
  width: 0;
  height: 0;
  overflow: hidden;
}
</style>
