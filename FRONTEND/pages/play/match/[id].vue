<script setup>
import {
  deleteMatchWithReason,
  fetchMatchById,
  MatchCancelReason,
  MatchResult,
  MatchStatus,
  submitMatchResult,
  subscribeToMatch,
  subscribeToMatchPresence,
} from "@/api/matches";

const route = useRoute();
const router = useRouter();
const snackbar = useSnackbar();
const userAuth = useUserAuth();

const isLoading = ref(true);
const loadError = ref(null);
const matchRow = ref(null);

const isCancelingMatch = ref(false);
const isRejectingMatch = ref(false);
const isSavingResult = ref(false);

const cancelDialogRef = ref(null);
const rejectDialogRef = ref(null);
const resultDialogRef = ref(null);

const matchSubscription = ref(null);
const presenceSubscription = ref(null);
const presenceState = ref({});
const lastKnownCancelReason = ref(null);

let pendingReloadTimeout = null;
const isLeavingRoom = ref(false);

const currentUserId = computed(() => userAuth?.userLogged?.id ?? null);
const matchId = computed(() => String(route.params.id ?? ""));

const myRole = computed(() => {
  if (!matchRow.value || !currentUserId.value) return null;

  if (String(matchRow.value.challenger_id) === String(currentUserId.value)) {
    return "challenger";
  }

  if (String(matchRow.value.opponent_id) === String(currentUserId.value)) {
    return "opponent";
  }

  return null;
});

const isParticipant = computed(() => Boolean(myRole.value));

const opponentProfile = computed(() => {
  if (!matchRow.value) return null;

  return myRole.value === "challenger"
    ? matchRow.value.opponent_profile
    : matchRow.value.challenger_profile;
});

const myProfile = computed(() => {
  if (!matchRow.value) return null;

  return myRole.value === "challenger"
    ? matchRow.value.challenger_profile
    : matchRow.value.opponent_profile;
});

const opponentDeck = computed(() => {
  if (!matchRow.value) return null;

  return myRole.value === "challenger"
    ? matchRow.value.opponent_deck
    : matchRow.value.challenger_deck;
});

const myDeck = computed(() => {
  if (!matchRow.value) return null;

  return myRole.value === "challenger"
    ? matchRow.value.challenger_deck
    : matchRow.value.opponent_deck;
});

const myDeclaredResult = computed(() => {
  if (!matchRow.value) return null;

  return myRole.value === "challenger"
    ? matchRow.value.challenger_result
    : matchRow.value.opponent_result;
});

const opponentDeclaredResult = computed(() => {
  if (!matchRow.value) return null;

  return myRole.value === "challenger"
    ? matchRow.value.opponent_result
    : matchRow.value.challenger_result;
});

const bothDecksSelected = computed(() => Boolean(matchRow.value?.challenger_deck && matchRow.value?.opponent_deck));

const isTerminalMatch = computed(() => {
  return [
    MatchStatus.Completed,
    MatchStatus.Invalid,
    MatchStatus.Canceled,
    MatchStatus.Rejected,
  ].includes(matchRow.value?.status);
});

const isInviteForCurrentUser = computed(() => {
  if (!matchRow.value || myRole.value !== "opponent") return false;
  if (matchRow.value.status !== MatchStatus.Pending) return false;
  return !matchRow.value?.opponent_deck;
});

const canRejectMatch = computed(() => isInviteForCurrentUser.value && !isRejectingMatch.value);
const canChooseDeck = computed(() => isInviteForCurrentUser.value);

const canCancelMatch = computed(() => {
  if (!isParticipant.value) return false;
  if (isTerminalMatch.value) return false;
  if (myRole.value === "opponent" && isInviteForCurrentUser.value) return false;
  return !isCancelingMatch.value;
});

const canTerminateMatch = computed(() => {
  if (!isParticipant.value) return false;
  if (isTerminalMatch.value) return false;
  if (!bothDecksSelected.value) return false;
  return !isSavingResult.value;
});

const canSaveWon = computed(() => canTerminateMatch.value && !isSavingResult.value);
const canSaveLost = computed(() => canTerminateMatch.value && !isSavingResult.value);
const canSaveDraw = computed(() => canTerminateMatch.value && !isSavingResult.value);
const visibleActionButtonsCount = computed(() => {
  return [
    canRejectMatch.value,
    canChooseDeck.value,
    canCancelMatch.value,
    canTerminateMatch.value,
  ].filter(Boolean).length;
});

const actionButtonsGridClass = computed(() => {
  if (visibleActionButtonsCount.value > 1) {
    return "grid grid-cols-2 gap-2";
  }

  return "grid grid-cols-1 gap-2";
});

const opponentRoomPresenceId = computed(() => {
  if (!matchRow.value || !myRole.value) return null;
  return myRole.value === "challenger"
    ? matchRow.value.opponent_id
    : matchRow.value.challenger_id;
});

const isOpponentInsideRoom = computed(() => {
  const oppositeId = opponentRoomPresenceId.value;
  if (!oppositeId) return false;

  const activePresence = presenceState.value ?? {};
  const oppositePresenceEntry = Object.entries(activePresence).find(([presenceKey]) => {
    return String(presenceKey).toLowerCase() === String(oppositeId).toLowerCase();
  });

  const oppositePresence = oppositePresenceEntry?.[1];
  return Array.isArray(oppositePresence) && oppositePresence.length > 0;
});

const roomStatusDotTone = computed(() => (isOpponentInsideRoom.value ? "ready" : "waiting"));
const shouldBlinkRoomStatusDot = computed(() => !isOpponentInsideRoom.value);

const statusMessage = computed(() => {
  if (!matchRow.value) return "";

  if (matchRow.value.status === MatchStatus.Invalid) {
    return "Match non valido: i risultati dichiarati non coincidono.";
  }

  if (matchRow.value.status === MatchStatus.Completed) {
    return "Match terminato correttamente.";
  }

  if (!bothDecksSelected.value) {
    return "Il match iniziera quando entrambi i giocatori avranno scelto il mazzo.";
  }

  if (myDeclaredResult.value && !opponentDeclaredResult.value) {
    return "Risultato salvato: in attesa della conferma dell'avversario.";
  }

  if (!myDeclaredResult.value && opponentDeclaredResult.value) {
    return "L'avversario ha inserito il risultato. Completa anche tu il match.";
  }

  return "Match attivo.";
});

const isCompletedMatch = computed(() => matchRow.value?.status === MatchStatus.Completed);

const myOutcomeBannerLabel = computed(() => {
  if (!isCompletedMatch.value) return null;
  if (myDeclaredResult.value === MatchResult.Won) return "Hai vinto";
  if (myDeclaredResult.value === MatchResult.Lost) return "Hai perso";
  if (myDeclaredResult.value === MatchResult.Draw) return "Pareggio";
  return null;
});

const myResultLabel = computed(() => {
  if (myDeclaredResult.value === MatchResult.Won) return "Hai dichiarato: Vinto";
  if (myDeclaredResult.value === MatchResult.Lost) return "Hai dichiarato: Perso";
  if (myDeclaredResult.value === MatchResult.Draw) return "Hai dichiarato: Pareggio";
  return "Risultato non ancora inserito";
});

const opponentResultLabel = computed(() => {
  if (opponentDeclaredResult.value === MatchResult.Won) return "Avversario: Vinto";
  if (opponentDeclaredResult.value === MatchResult.Lost) return "Avversario: Perso";
  if (opponentDeclaredResult.value === MatchResult.Draw) return "Avversario: Pareggio";
  return "Avversario: risultato non inserito";
});

function closeAllDialogs() {
  cancelDialogRef.value?.closeDialog?.();
  rejectDialogRef.value?.closeDialog?.();
  resultDialogRef.value?.closeDialog?.();
}

function openCancelDialog() {
  cancelDialogRef.value?.openDialog?.();
}

function openRejectDialog() {
  rejectDialogRef.value?.openDialog?.();
}

function openResultDialog() {
  resultDialogRef.value?.openDialog?.();
}

function goToChooseDeck() {
  if (!matchId.value) return;
  router.push(`/play/choose-deck?matchId=${matchId.value}`);
}

function handleDeletedRoom(remoteReason = null) {
  if (isLeavingRoom.value) return;

  isLeavingRoom.value = true;
  closeAllDialogs();

  const normalizedReason = remoteReason ?? lastKnownCancelReason.value;

  if (normalizedReason === MatchCancelReason.Rejected) {
    snackbar.addMessage("Il match e stato rifiutato", "warning");
  } else {
    snackbar.addMessage("Il match e stato annullato", "warning");
  }

  router.replace("/play/matches");
}

async function loadMatch() {
  if (!matchId.value) {
    loadError.value = "Match non valido";
    isLoading.value = false;
    return;
  }

  if (!currentUserId.value) {
    isLoading.value = false;
    return;
  }

  isLoading.value = true;
  loadError.value = null;

  try {
    const fetchedMatch = await fetchMatchById(matchId.value);

    if (!fetchedMatch) {
      handleDeletedRoom();
      return;
    }

    matchRow.value = fetchedMatch;
    lastKnownCancelReason.value = fetchedMatch?.cancel_reason ?? lastKnownCancelReason.value;

    if (!isParticipant.value) {
      throw new Error("Non sei autorizzato ad accedere a questa room");
    }
  } catch (error) {
    loadError.value = error?.message || "Errore durante il caricamento della room";
    snackbar.addMessage(loadError.value, "error");
  } finally {
    isLoading.value = false;
  }
}

function scheduleMatchReload() {
  if (pendingReloadTimeout) {
    clearTimeout(pendingReloadTimeout);
  }

  pendingReloadTimeout = setTimeout(() => {
    loadMatch();
    pendingReloadTimeout = null;
  }, 220);
}

function stopMatchRealtime() {
  const subscription = matchSubscription.value;
  matchSubscription.value = null;

  if (!subscription) return;

  subscription
    .unsubscribe()
    .catch((error) => {
      snackbar.addMessage(error?.message || "Errore durante la chiusura realtime match", "error");
    });
}

function stopPresenceRealtime() {
  const subscription = presenceSubscription.value;
  presenceSubscription.value = null;
  presenceState.value = {};

  if (!subscription) return;

  subscription
    .unsubscribe()
    .catch((error) => {
      snackbar.addMessage(error?.message || "Errore durante la chiusura presence match", "error");
    });
}

function startRoomRealtime() {
  stopMatchRealtime();
  stopPresenceRealtime();

  if (!matchId.value || !currentUserId.value) return;

  try {
    matchSubscription.value = subscribeToMatch(matchId.value, {
      onUpdate: (updatedMatch) => {
        if (updatedMatch?.cancel_reason) {
          lastKnownCancelReason.value = updatedMatch.cancel_reason;
        }
        scheduleMatchReload();
      },
      onDelete: (deletedMatch) => {
        handleDeletedRoom(deletedMatch?.cancel_reason ?? null);
      },
      onError: (error) => {
        snackbar.addMessage(error?.message || "Errore realtime room", "error");
      },
    });

    presenceSubscription.value = subscribeToMatchPresence(matchId.value, {
      onSubscribed: (nextState) => {
        presenceState.value = nextState ?? {};
      },
      onSync: (nextState) => {
        presenceState.value = nextState ?? {};
      },
      onJoin: (_event, nextState) => {
        presenceState.value = nextState ?? {};
      },
      onLeave: (_event, nextState) => {
        presenceState.value = nextState ?? {};
      },
      onError: (error) => {
        snackbar.addMessage(error?.message || "Errore realtime presenza room", "error");
      },
    });
  } catch (error) {
    snackbar.addMessage(error?.message || "Errore avvio realtime room", "error");
  }
}

async function confirmCancelMatch() {
  if (!canCancelMatch.value || !matchId.value) return;

  isCancelingMatch.value = true;

  try {
    isLeavingRoom.value = true;

    await deleteMatchWithReason({
      matchId: matchId.value,
      reason: MatchCancelReason.Canceled,
    });

    closeAllDialogs();
    snackbar.addMessage("Hai annullato il match", "warning");
    router.replace("/play/matches");
  } catch (error) {
    isLeavingRoom.value = false;
    snackbar.addMessage(error?.message || "Errore durante l'annullamento del match", "error");
  } finally {
    isCancelingMatch.value = false;
  }
}

async function confirmRejectMatch() {
  if (!canRejectMatch.value || !matchId.value) return;

  isRejectingMatch.value = true;

  try {
    isLeavingRoom.value = true;

    await deleteMatchWithReason({
      matchId: matchId.value,
      reason: MatchCancelReason.Rejected,
    });

    closeAllDialogs();
    snackbar.addMessage("Hai rifiutato il match", "warning");
    router.replace("/play/matches");
  } catch (error) {
    isLeavingRoom.value = false;
    snackbar.addMessage(error?.message || "Errore durante il rifiuto del match", "error");
  } finally {
    isRejectingMatch.value = false;
  }
}

async function saveResult(result) {
  if (!canTerminateMatch.value || !matchId.value) return;

  isSavingResult.value = true;

  try {
    const updatedMatch = await submitMatchResult({
      matchId: matchId.value,
      result,
    });

    matchRow.value = updatedMatch;
    resultDialogRef.value?.closeDialog?.();

    if (updatedMatch?.tournament_sync_error) {
      snackbar.addMessage(updatedMatch.tournament_sync_error, "warning");
    }

    if (updatedMatch?.status === MatchStatus.Invalid) {
      snackbar.addMessage("Risultati discordanti: match segnato come non valida", "warning");
      return;
    }

    if (updatedMatch?.status === MatchStatus.Completed) {
      snackbar.addMessage("Match terminato correttamente", "success");
      return;
    }

    snackbar.addMessage("Risultato salvato, in attesa dell'avversario", "info");
  } catch (error) {
    snackbar.addMessage(error?.message || "Errore durante il salvataggio del risultato", "error");
  } finally {
    isSavingResult.value = false;
  }
}

watch(
  [matchId, currentUserId],
  async ([nextMatchId, nextUserId]) => {
    if (!nextMatchId) {
      stopMatchRealtime();
      stopPresenceRealtime();
      return;
    }

    if (!nextUserId) {
      stopMatchRealtime();
      stopPresenceRealtime();
      return;
    }

    await loadMatch();
    startRoomRealtime();
  },
  { immediate: true },
);

onBeforeUnmount(() => {
  stopMatchRealtime();
  stopPresenceRealtime();

  if (pendingReloadTimeout) {
    clearTimeout(pendingReloadTimeout);
    pendingReloadTimeout = null;
  }
});

definePageMeta({
  middleware: "auth",
  ssr: false,
});
</script>

<template>
  <section class="relative h-full">
    <Toolbar label="Partita in corso" fixed back-button>
      <template #info>
        <PlayRoomParticipantCard
          :profile="opponentProfile"
          :deck="opponentDeck"
          waiting-label="L'avversario deve scegliere il mazzo"
          show-status-dot
          :status-dot-tone="roomStatusDotTone"
          :blink-status-dot="shouldBlinkRoomStatusDot"
        />
      </template>
    </Toolbar>

    <div class="min-h-0 flex-1 overflow-y-auto px-3 pb-40 pt-2">
      <p v-if="isLoading" class="play-room-state-message">
        Caricamento room...
      </p>

      <p v-else-if="loadError" class="play-room-state-message play-room-state-message--error">
        {{ loadError }}
      </p>

      <div v-else class="space-y-3">
        <div class="play-room-status-card">
          <p class="play-room-status-card__title">Stato match</p>
          <p class="play-room-status-card__text">{{ statusMessage }}</p>

          <p
            v-if="myOutcomeBannerLabel"
            class="play-room-result-banner"
            :class="{
              'play-room-result-banner--win': myDeclaredResult === MatchResult.Won,
              'play-room-result-banner--loss': myDeclaredResult === MatchResult.Lost,
              'play-room-result-banner--draw': myDeclaredResult === MatchResult.Draw,
            }"
          >
            {{ myOutcomeBannerLabel }}
          </p>

          <div v-else class="mt-2 space-y-1">
            <p class="play-room-status-card__meta">{{ myResultLabel }}</p>
            <p class="play-room-status-card__meta">{{ opponentResultLabel }}</p>
          </div>
        </div>

        <div v-if="isTerminalMatch" class="play-room-status-card play-room-status-card--terminal">
          <p class="play-room-status-card__title">Match chiuso</p>
          <p class="play-room-status-card__text">
            Il match non e piu modificabile. Puoi tornare alla lista partite.
          </p>
        </div>
      </div>
    </div>

    <MobileFloatMenu :cols="1">
      <template #buttons>
        <div class="space-y-2">
          <PlayRoomParticipantCard
            :profile="myProfile"
            :deck="myDeck"
            waiting-label="Devi scegliere il mazzo"
            compact-deck
          />

          <div :class="actionButtonsGridClass">
            <ButtonMenu
              v-if="canRejectMatch"
              icon="lets-icons:refund-back"
              label="Rifiuta match"
              color="red"
              @click="openRejectDialog"
            />

            <ButtonMenu
              v-if="canChooseDeck"
              icon="material-symbols:cards"
              label="Scegli mazzo"
              color="blue"
              @click="goToChooseDeck"
            />

            <ButtonMenu
              v-if="canCancelMatch"
              icon="lets-icons:refund-back"
              label="Annulla match"
              color="red"
              :disabled="isCancelingMatch"
              @click="openCancelDialog"
            />

            <ButtonMenu
              v-if="canTerminateMatch"
              icon="mdi-check"
              label="Termina match"
              color="green"
              :disabled="isSavingResult"
              @click="openResultDialog"
            />
          </div>
        </div>
      </template>
    </MobileFloatMenu>

    <DialogsGeneric ref="cancelDialogRef" :disabled="isCancelingMatch">
      <template #button>
        <span class="play-room-hidden-dialog-trigger" aria-hidden="true" />
      </template>

      <template #title>Annulla match</template>

      <template #content>
        <p class="play-room-dialog-text">Sei sicuro di voler annullare il match?</p>
      </template>

      <template #actions="{ closeDialog }">
        <v-spacer />
        <v-btn variant="text" :disabled="isCancelingMatch" @click="closeDialog">
          No, ho sbagliato
        </v-btn>
        <v-btn
          variant="flat"
          class="play-room-dialog-danger"
          :loading="isCancelingMatch"
          :disabled="isCancelingMatch"
          @click="confirmCancelMatch"
        >
          Annulla match
        </v-btn>
      </template>
    </DialogsGeneric>

    <DialogsGeneric ref="rejectDialogRef" :disabled="isRejectingMatch">
      <template #button>
        <span class="play-room-hidden-dialog-trigger" aria-hidden="true" />
      </template>

      <template #title>Rifiuta match</template>

      <template #content>
        <p class="play-room-dialog-text">Sei sicuro di voler rifiutare il match?</p>
      </template>

      <template #actions="{ closeDialog }">
        <v-spacer />
        <v-btn variant="text" :disabled="isRejectingMatch" @click="closeDialog">
          Annulla
        </v-btn>
        <v-btn
          variant="flat"
          class="play-room-dialog-danger"
          :loading="isRejectingMatch"
          :disabled="isRejectingMatch"
          @click="confirmRejectMatch"
        >
          Rifiuta match
        </v-btn>
      </template>
    </DialogsGeneric>

    <DialogsGeneric ref="resultDialogRef" :disabled="isSavingResult">
      <template #button>
        <span class="play-room-hidden-dialog-trigger" aria-hidden="true" />
      </template>

      <template #title>Termina match</template>

      <template #content>
        <p class="play-room-dialog-text">
          Per terminare il match indica il tuo risultato.
        </p>
        <p class="play-room-dialog-subtext">
          L'avversario dovra confermare un risultato coerente: opposto in caso di vittoria/sconfitta, uguale in caso di pareggio.
        </p>
      </template>

      <template #actions="{ closeDialog }">
        <v-spacer />
        <v-btn variant="text" :disabled="isSavingResult" @click="closeDialog">
          Annulla
        </v-btn>
        <v-btn
          variant="flat"
          class="play-room-dialog-loss"
          :loading="isSavingResult"
          :disabled="!canSaveLost"
          @click="saveResult(MatchResult.Lost)"
        >
          Ho perso
        </v-btn>
        <v-btn
          variant="flat"
          class="play-room-dialog-draw"
          :loading="isSavingResult"
          :disabled="!canSaveDraw"
          @click="saveResult(MatchResult.Draw)"
        >
          Pareggio
        </v-btn>
        <v-btn
          variant="flat"
          class="play-room-dialog-win"
          :loading="isSavingResult"
          :disabled="!canSaveWon"
          @click="saveResult(MatchResult.Won)"
        >
          Ho vinto!
        </v-btn>
      </template>
    </DialogsGeneric>
  </section>
</template>

<style scoped>
.play-room-state-message {
  margin-top: 1rem;
  text-align: center;
  color: rgba(241, 245, 249, 0.8);
  font-size: 0.9rem;
  font-weight: 600;
}

.play-room-state-message--error {
  color: rgba(254, 202, 202, 0.95);
}

.play-room-status-card {
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 1rem;
  background: linear-gradient(145deg, rgba(15, 23, 42, 0.72), rgba(2, 6, 23, 0.84));
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.1),
    0 16px 30px rgba(0, 0, 0, 0.4);
  padding: 0.72rem;
}

.play-room-status-card--terminal {
  border-color: rgba(148, 163, 184, 0.35);
  background: linear-gradient(145deg, rgba(51, 65, 85, 0.62), rgba(15, 23, 42, 0.78));
}

.play-room-status-card__title {
  margin: 0;
  color: rgba(255, 216, 177, 0.95);
  font-size: 0.74rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.play-room-status-card__text {
  margin: 0.35rem 0 0;
  color: rgba(241, 245, 249, 0.88);
  line-height: 1.34;
  font-size: 0.84rem;
  font-weight: 600;
}

.play-room-status-card__meta {
  margin: 0;
  color: rgba(148, 163, 184, 0.95);
  font-size: 0.72rem;
  font-weight: 700;
}

.play-room-result-banner {
  margin: 0.65rem 0 0;
  border-radius: 0.7rem;
  border: 1px solid transparent;
  padding: 0.5rem 0.72rem;
  text-align: center;
  font-size: 0.86rem;
  font-weight: 800;
  letter-spacing: 0.01em;
}

.play-room-result-banner--win {
  border-color: rgba(134, 239, 172, 0.32);
  background: linear-gradient(135deg, rgba(34, 197, 94, 0.3), rgba(22, 101, 52, 0.55));
  color: rgba(220, 252, 231, 0.97);
}

.play-room-result-banner--loss {
  border-color: rgba(252, 165, 165, 0.32);
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.3), rgba(153, 27, 27, 0.55));
  color: rgba(254, 226, 226, 0.96);
}

.play-room-result-banner--draw {
  border-color: rgba(253, 186, 116, 0.34);
  background: linear-gradient(135deg, rgba(249, 115, 22, 0.3), rgba(154, 52, 18, 0.55));
  color: rgba(255, 237, 213, 0.98);
}

.play-room-dialog-text {
  margin: 0;
  color: rgba(241, 245, 249, 0.92);
  line-height: 1.38;
}

.play-room-dialog-subtext {
  margin: 0.55rem 0 0;
  color: rgba(203, 213, 225, 0.92);
  line-height: 1.35;
  font-size: 0.88rem;
}

.play-room-dialog-danger {
  border: 1px solid rgba(248, 113, 113, 0.36);
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.9), rgba(153, 27, 27, 0.95));
  color: #fff4f4;
}

.play-room-dialog-loss {
  border: 1px solid rgba(248, 113, 113, 0.36);
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.9), rgba(153, 27, 27, 0.95));
  color: #fff4f4;
}

.play-room-dialog-win {
  border: 1px solid rgba(74, 222, 128, 0.32);
  background: linear-gradient(135deg, rgba(34, 197, 94, 0.88), rgba(21, 128, 61, 0.95));
  color: #f3fff7;
}

.play-room-dialog-draw {
  border: 1px solid rgba(253, 186, 116, 0.34);
  background: linear-gradient(135deg, rgba(249, 115, 22, 0.9), rgba(194, 65, 12, 0.95));
  color: #fff7ed;
}

.play-room-hidden-dialog-trigger {
  display: none;
  width: 0;
  height: 0;
  overflow: hidden;
}
</style>
