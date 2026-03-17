<script setup>
import { fetchMatchById, selectMatchDeck } from "@/api/matches";
import { joinTournament } from "@/api/tournaments";

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
const pendingTournamentEntryMode = ref("deck");

const currentUserId = computed(() => userAuth?.userLogged?.id ?? null);
const matchId = computed(() => {
  const rawId = route.query.matchId;
  if (Array.isArray(rawId)) return String(rawId[0] ?? "");
  return String(rawId ?? "");
});
const tournamentId = computed(() => {
  const rawId = route.query.tournamentId;
  if (Array.isArray(rawId)) return String(rawId[0] ?? "");
  return String(rawId ?? "");
});
const isTournamentEnrollmentMode = computed(() => Boolean(tournamentId.value));
const canSkipDeckSelection = computed(() => isTournamentEnrollmentMode.value);
const isAnonymousTournamentEnrollmentSelection = computed(() => (
  isTournamentEnrollmentMode.value && pendingTournamentEntryMode.value === "anonymous"
));

const pageLabel = computed(() => (
  isTournamentEnrollmentMode.value
    ? "Scegli mazzo torneo"
    : "Scegli mazzo"
));

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
  if (isTournamentEnrollmentMode.value) {
    return isAnonymousTournamentEnrollmentSelection.value
      ? "Iscriviti anonimo"
      : "Iscriviti al torneo";
  }

  if (userRole.value === "opponent") {
    return "Conferma scelta";
  }

  return "Continua";
});

const confirmDialogTitle = computed(() => (
  isAnonymousTournamentEnrollmentSelection.value
    ? "Iscrizione anonima"
    : "Conferma mazzo"
));

const confirmDialogText = computed(() => {
  if (isAnonymousTournamentEnrollmentSelection.value) {
    return "Vuoi iscriverti al torneo senza dichiarare il mazzo? Vedrai un placeholder segreto e questo torneo non alimentera statistiche deck affidabili.";
  }

  const selectedDeckName = String(selectedDeck.value?.name ?? "").trim() || "senza nome";
  return `Hai scelto il mazzo ${selectedDeckName}, vuoi continuare?`;
});

function selectDeck(deck) {
  if (!deck) return;
  pendingTournamentEntryMode.value = "deck";
  selectedDeck.value = deck;
  nextTick(() => {
    deckConfirmDialogRef.value?.openDialog?.();
  });
}

function prepareAnonymousTournamentEnrollment() {
  if (!canSkipDeckSelection.value || isSavingDeck.value) return;

  pendingTournamentEntryMode.value = "anonymous";
  selectedDeck.value = null;

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
  matchRow.value = null;

  try {
    if (!currentUserId.value) {
      throw new Error("Utente non autenticato");
    }

    const fetchedCloudDecks = await getAllCloud();
    cloudDecks.value = Array.isArray(fetchedCloudDecks) ? fetchedCloudDecks : [];

    if (isTournamentEnrollmentMode.value) {
      if (!tournamentId.value) {
        throw new Error("Torneo non valido");
      }
      return;
    }

    if (!matchId.value) {
      throw new Error("Match non valido");
    }

    const fetchedMatch = await fetchMatchById(matchId.value);
    if (!fetchedMatch) {
      throw new Error("Match non trovato");
    }

    matchRow.value = fetchedMatch;

    const isParticipant = [fetchedMatch.challenger_id, fetchedMatch.opponent_id]
      .map((id) => String(id))
      .includes(String(currentUserId.value));

    if (!isParticipant) {
      throw new Error("Non puoi scegliere il mazzo per questo match");
    }
  } catch (error) {
    loadError.value = error?.message || "Errore durante il caricamento dei dati";
    snackbar.addMessage(loadError.value, "error");
  } finally {
    isLoading.value = false;
  }
}

async function confirmDeckSelection() {
  if (isSavingDeck.value) return;
  if (!selectedDeck.value && !isAnonymousTournamentEnrollmentSelection.value) return;

  isSavingDeck.value = true;

  try {
    if (isTournamentEnrollmentMode.value) {
      const joinPayload = isAnonymousTournamentEnrollmentSelection.value
        ? {
            tournamentId: tournamentId.value,
            anonymousDeck: true,
          }
        : {
            tournamentId: tournamentId.value,
            deck: selectedDeck.value,
          };

      await joinTournament(joinPayload);

      closeDialog();
      snackbar.addMessage(
        isAnonymousTournamentEnrollmentSelection.value
          ? "Iscrizione anonima completata"
          : "Iscrizione torneo completata",
        "success",
      );
      router.push(`/play/tournaments/${tournamentId.value}`);
      return;
    }

    if (!matchId.value) {
      throw new Error("Match non valido");
    }

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
    <Toolbar :label="pageLabel" fixed back-button />

    <div
      class="min-h-0 flex-1 overflow-y-auto px-3 pt-2"
      :class="canSkipDeckSelection ? 'pb-40' : 'pb-28'"
    >
      <p v-if="!isLoading && !loadError && isTournamentEnrollmentMode" class="choose-deck-context-hint">
        Il mazzo scelto verra usato di default in tutti i match del torneo.
      </p>

      <div
        v-if="!isLoading && !loadError && canSkipDeckSelection"
        class="choose-deck-anonymous-box"
      >
        <p class="choose-deck-anonymous-box__text">
          Se preferisci mantenere privato il mazzo puoi saltare la selezione:
          il torneo continuera regolarmente con un placeholder segreto, ma questo deck non entrera in uno storico affidabile.
        </p>
        <button
          type="button"
          class="choose-deck-anonymous-box__action"
          :disabled="isSavingDeck"
          @click="prepareAnonymousTournamentEnrollment"
        >
          Salta e iscriviti in anonimo
        </button>
      </div>

      <p v-if="isLoading" class="choose-deck-state-message">
        Caricamento mazzi cloud...
      </p>

      <p v-else-if="loadError" class="choose-deck-state-message choose-deck-state-message--error">
        {{ loadError }}
      </p>

      <div v-else-if="cloudDecks.length === 0" class="choose-deck-empty-state">
        <p class="choose-deck-empty-state__label">Nessun mazzo cloud</p>
        <p class="choose-deck-empty-state__text">
          {{
            isTournamentEnrollmentMode
              ? "Puoi comunque continuare con il tasto Salta e iscriverti con un mazzo anonimo."
              : "Salva almeno un mazzo nel cloud prima di continuare."
          }}
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

      <template #title>{{ confirmDialogTitle }}</template>

      <template #content>
        <p class="choose-deck-dialog-text">
          {{ confirmDialogText }}
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

    <MobileFloatMenu v-if="canSkipDeckSelection" :cols="1">
      <template #buttons>
        <ButtonMenu
          icon="mdi:skip-next"
          label="Salta"
          color="yellow"
          :disabled="isSavingDeck"
          @click="prepareAnonymousTournamentEnrollment"
        />
      </template>
    </MobileFloatMenu>
  </section>
</template>

<style scoped>
.choose-deck-context-hint {
  margin: 0 0 0.7rem;
  color: rgba(254, 215, 170, 0.95);
  font-size: 0.76rem;
  font-weight: 700;
  line-height: 1.3;
  text-align: center;
}

.choose-deck-anonymous-box {
  margin-bottom: 0.9rem;
  border: 1px solid rgba(148, 163, 184, 0.28);
  border-radius: 1rem;
  background: linear-gradient(145deg, rgba(2, 6, 23, 0.9), rgba(15, 23, 42, 0.82));
  padding: 0.85rem 0.9rem;
}

.choose-deck-anonymous-box__text {
  margin: 0;
  color: rgba(226, 232, 240, 0.88);
  font-size: 0.84rem;
  line-height: 1.4;
}

.choose-deck-anonymous-box__action {
  margin-top: 0.75rem;
  border: 1px solid rgba(255, 211, 108, 0.42);
  border-radius: 9999px;
  background: rgba(250, 204, 21, 0.12);
  color: rgba(254, 240, 138, 0.96);
  font-size: 0.76rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  padding: 0.58rem 0.88rem;
  text-transform: uppercase;
  transition: transform 0.18s ease, border-color 0.18s ease, background 0.18s ease;
}

.choose-deck-anonymous-box__action:hover:not(:disabled) {
  transform: translateY(-1px);
  border-color: rgba(250, 204, 21, 0.68);
  background: rgba(250, 204, 21, 0.18);
}

.choose-deck-anonymous-box__action:disabled {
  cursor: not-allowed;
  opacity: 0.58;
}

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
