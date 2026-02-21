<script setup>
import {
  acceptOfferListingProposal,
  fetchOfferListingChatContext,
  fetchOfferListingChatMessages,
  markOfferListingChatMessagesAsSeen,
  rejectOfferListingProposal,
  sendOfferListingChatMessage,
  subscribeToOfferListingChatMessages,
  updateOfferListingStatus,
} from "@/api/offerListingChat";
import { OfferStatus } from "@/utilities/enums/offerStatus";

const props = defineProps({
  viewerRole: {
    type: String,
    default: "offerer",
    validator: (value) => ["offerer", "seller"].includes(value),
  },
});

const route = useRoute();
const snackbar = useSnackbar();
const userAuth = useUserAuth();
const { isMobile } = useMyBreakpoints();

const chatContext = ref(null);
const messages = ref([]);
const draftMessage = ref("");
const isLoadingContext = ref(true);
const isLoadingMessages = ref(false);
const isSendingMessage = ref(false);
const isUpdatingOfferStatus = ref(false);
const offerManagementDialogRef = ref(null);
const messagesScrollRef = ref(null);
const messagesBottomRef = ref(null);
const realtimeSubscription = ref(null);
const isMarkingSeen = ref(false);

const currentUserId = computed(() => userAuth?.userLogged?.id ?? null);
const offerListingId = computed(() => {
  const parsedValue = Number(route.params.id);
  if (!Number.isInteger(parsedValue) || parsedValue <= 0) return null;
  return parsedValue;
});

const hasContext = computed(() => Boolean(chatContext.value?.offerListing && chatContext.value?.sellListing));
const viewerCanAccessChat = computed(() => {
  if (!hasContext.value || !currentUserId.value) return false;

  if (props.viewerRole === "offerer") {
    return String(chatContext.value.offerListing.offerer_id) === String(currentUserId.value);
  }

  return String(chatContext.value.sellListing.seller_uuid) === String(currentUserId.value);
});

const hasMessages = computed(() => messages.value.length > 0);
const normalizedDraftMessage = computed(() => draftMessage.value.trim());
const remainingCharacters = computed(() => Math.max(150 - draftMessage.value.length, 0));
const isSendEnabled = computed(() => {
  if (!viewerCanAccessChat.value) return false;
  if (isChatDisabledByStatus.value) return false;
  if (isSendingMessage.value) return false;
  if (!normalizedDraftMessage.value) return false;
  return normalizedDraftMessage.value.length <= 150;
});
const currentOfferStatus = computed(() => chatContext.value?.offerListing?.status ?? null);
const isOfferRejected = computed(() => currentOfferStatus.value === OfferStatus.Rejected);
const isChatDisabledByStatus = computed(() => isOfferRejected.value);
const showRejectedChatWarning = computed(() => {
  if (!hasContext.value) return false;
  if (!viewerCanAccessChat.value) return false;
  return isOfferRejected.value;
});
const rejectedChatWarningMessage = computed(() => {
  if (props.viewerRole === "seller") {
    return "Hai rifiutato l'offerta. La chat è stata disattivata.";
  }
  return "Il venditore ha rifiutato l'offerta. La chat è stata disattivata.";
});
const canManageOfferStatus = computed(() => {
  if (props.viewerRole !== "seller") return false;
  if (!viewerCanAccessChat.value) return false;

  const parsedOfferListingId = Number(chatContext.value?.offerListing?.id);
  return Number.isInteger(parsedOfferListingId) && parsedOfferListingId > 0;
});
const canAcceptOffer = computed(() => {
  if (!canManageOfferStatus.value) return false;
  if (isUpdatingOfferStatus.value) return false;
  return currentOfferStatus.value !== OfferStatus.Accepted;
});
const canRejectOffer = computed(() => {
  if (!canManageOfferStatus.value) return false;
  if (isUpdatingOfferStatus.value) return false;
  return currentOfferStatus.value !== OfferStatus.Rejected;
});
const canRevokeRejectedOffer = computed(() => {
  if (!canManageOfferStatus.value) return false;
  if (isUpdatingOfferStatus.value) return false;
  return isOfferRejected.value;
});

const viewerCards = computed(() => {
  const card = chatContext.value?.sellListing?.card;
  return card ? [card] : [];
});

const { show: viewerOpen, index: viewerIndex, open: openViewer } = useCardViewer(viewerCards);

function handleOpenCard(card) {
  openViewer(card);
}

function isOwnMessage(message) {
  if (!currentUserId.value) return false;
  return String(message?.sender_id) === String(currentUserId.value);
}

function formatMessageTime(value) {
  if (!value) return "";

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) return "";

  return parsedDate.toLocaleTimeString("it-IT", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function hasSeenAt(message) {
  if (typeof message?.seen_at === "string") {
    return message.seen_at.trim().length > 0;
  }
  return Boolean(message?.seen_at);
}

const firstUnseenIncomingMessageIndex = computed(() => {
  return messages.value.findIndex((message) => !hasSeenAt(message) && !isOwnMessage(message));
});

function upsertMessage(nextMessage) {
  const parsedMessageId = Number(nextMessage?.id);
  if (!Number.isInteger(parsedMessageId) || parsedMessageId <= 0) return;

  const existingMessageIndex = messages.value.findIndex((message) => Number(message?.id) === parsedMessageId);
  if (existingMessageIndex === -1) {
    messages.value = [...messages.value, nextMessage];
  } else {
    messages.value[existingMessageIndex] = {
      ...messages.value[existingMessageIndex],
      ...nextMessage,
    };
    messages.value = [...messages.value];
  }

  messages.value.sort((leftMessage, rightMessage) => {
    const leftTimestamp = new Date(leftMessage?.created_at ?? 0).getTime();
    const rightTimestamp = new Date(rightMessage?.created_at ?? 0).getTime();
    if (leftTimestamp === rightTimestamp) {
      return Number(leftMessage?.id ?? 0) - Number(rightMessage?.id ?? 0);
    }
    return leftTimestamp - rightTimestamp;
  });
}

function removeMessage(messageId) {
  const parsedMessageId = Number(messageId);
  if (!Number.isInteger(parsedMessageId) || parsedMessageId <= 0) return;
  messages.value = messages.value.filter((message) => Number(message?.id) !== parsedMessageId);
}

function applyUpdatedOfferListing(updatedOfferListing) {
  if (!chatContext.value || !updatedOfferListing) return;

  chatContext.value = {
    ...chatContext.value,
    offerListing: {
      ...chatContext.value.offerListing,
      ...updatedOfferListing,
    },
  };
}

function scrollToBottom(behavior = "smooth") {
  nextTick(() => {
    const containerElement = messagesScrollRef.value;
    if (!containerElement) return;

    containerElement.scrollTo({
      top: containerElement.scrollHeight,
      behavior,
    });
  });
}

function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function ensureMessagesAtBottom() {
  // The message container might appear a bit later due to conditional rendering.
  for (let attempt = 0; attempt < 12; attempt += 1) {
    await nextTick();

    const containerElement = messagesScrollRef.value;
    const anchorElement = messagesBottomRef.value;
    if (!containerElement) {
      await wait(30);
      continue;
    }

    if (anchorElement?.scrollIntoView) {
      anchorElement.scrollIntoView({
        block: "end",
        inline: "nearest",
        behavior: "auto",
      });
    }

    containerElement.scrollTop = containerElement.scrollHeight;

    const maxScrollTop = Math.max(containerElement.scrollHeight - containerElement.clientHeight, 0);
    const isAtBottom = Math.abs(maxScrollTop - containerElement.scrollTop) <= 2;
    if (isAtBottom) return;

    await wait(30);
  }
}

function closeOfferManagementDialog() {
  offerManagementDialogRef.value?.closeDialog?.();
}

async function handleUpdateOfferStatus(nextStatus) {
  if (!canManageOfferStatus.value) return;

  const parsedOfferListingId = Number(chatContext.value?.offerListing?.id);
  if (!Number.isInteger(parsedOfferListingId) || parsedOfferListingId <= 0) return;

  if (currentOfferStatus.value === nextStatus) {
    closeOfferManagementDialog();
    return;
  }

  isUpdatingOfferStatus.value = true;

  try {
    const updatedOfferListing = nextStatus === OfferStatus.Accepted
      ? await acceptOfferListingProposal(parsedOfferListingId)
      : await rejectOfferListingProposal(parsedOfferListingId);

    applyUpdatedOfferListing(updatedOfferListing);
    closeOfferManagementDialog();

    const successMessage = nextStatus === OfferStatus.Accepted
      ? "Proposta accettata"
      : "Proposta rifiutata";
    snackbar.addMessage(successMessage, "success");
  } catch (error) {
    snackbar.addMessage(error.message || "Errore durante l'aggiornamento dello stato proposta", "error");
  } finally {
    isUpdatingOfferStatus.value = false;
  }
}

async function handleAcceptOffer() {
  await handleUpdateOfferStatus(OfferStatus.Accepted);
}

async function handleRejectOffer() {
  await handleUpdateOfferStatus(OfferStatus.Rejected);
}

function handleDeliverOffer() {
  snackbar.addMessage("Azione consegna da implementare", "info");
}

async function handleRevokeRejectedOffer() {
  if (!canManageOfferStatus.value) return;
  if (!isOfferRejected.value) return;

  const parsedOfferListingId = Number(chatContext.value?.offerListing?.id);
  if (!Number.isInteger(parsedOfferListingId) || parsedOfferListingId <= 0) return;

  isUpdatingOfferStatus.value = true;

  try {
    const updatedOfferListing = await updateOfferListingStatus({
      offerListingId: parsedOfferListingId,
      status: OfferStatus.Pending,
    });

    applyUpdatedOfferListing(updatedOfferListing);
    snackbar.addMessage("Rifiuto revocato. Offerta riportata a Pending.", "success");
  } catch (error) {
    snackbar.addMessage(error.message || "Errore durante la revoca del rifiuto", "error");
  } finally {
    isUpdatingOfferStatus.value = false;
  }
}

async function markIncomingMessagesAsSeen() {
  if (isMarkingSeen.value) return;
  if (!offerListingId.value) return;
  if (!viewerCanAccessChat.value) return;

  isMarkingSeen.value = true;

  try {
    await markOfferListingChatMessagesAsSeen(offerListingId.value);
  } catch (error) {
    snackbar.addMessage(error.message || "Errore durante l'aggiornamento dei messaggi letti", "error");
  } finally {
    isMarkingSeen.value = false;
  }
}

async function loadChatMessages() {
  if (!offerListingId.value) return;

  isLoadingMessages.value = true;

  try {
    messages.value = await fetchOfferListingChatMessages(offerListingId.value);
    await markIncomingMessagesAsSeen();
  } catch (error) {
    messages.value = [];
    snackbar.addMessage(error.message || "Errore durante il caricamento dei messaggi", "error");
  } finally {
    isLoadingMessages.value = false;

    if (messages.value.length > 0) {
      await ensureMessagesAtBottom();
    }
  }
}

async function loadChatContext() {
  if (!offerListingId.value) {
    chatContext.value = null;
    isLoadingContext.value = false;
    return;
  }

  isLoadingContext.value = true;

  try {
    chatContext.value = await fetchOfferListingChatContext(offerListingId.value);
  } catch (error) {
    chatContext.value = null;
    snackbar.addMessage(error.message || "Errore durante il caricamento della chat", "error");
  } finally {
    isLoadingContext.value = false;
  }
}

async function handleSendMessage() {
  if (!isSendEnabled.value || !offerListingId.value) return;

  isSendingMessage.value = true;

  try {
    const insertedMessage = await sendOfferListingChatMessage({
      offerListingId: offerListingId.value,
      body: normalizedDraftMessage.value,
    });

    upsertMessage(insertedMessage);
    draftMessage.value = "";
    scrollToBottom("smooth");
  } catch (error) {
    snackbar.addMessage(error.message || "Errore durante l'invio del messaggio", "error");
  } finally {
    isSendingMessage.value = false;
  }
}

async function attachRealtimeSubscription() {
  if (!offerListingId.value) return;
  if (!viewerCanAccessChat.value) return;

  await detachRealtimeSubscription();

  const subscription = subscribeToOfferListingChatMessages(offerListingId.value, {
    onInsert: async (newMessage) => {
      upsertMessage(newMessage);
      if (!isOwnMessage(newMessage)) {
        await markIncomingMessagesAsSeen();
      }
      scrollToBottom("smooth");
    },
    onUpdate: (updatedMessage) => {
      upsertMessage(updatedMessage);
    },
    onDelete: (oldMessage) => {
      removeMessage(oldMessage?.id);
    },
    onError: (error) => {
      snackbar.addMessage(error.message || "Errore realtime nella chat", "error");
    },
  });

  realtimeSubscription.value = subscription;
}

async function detachRealtimeSubscription() {
  if (!realtimeSubscription.value?.unsubscribe) return;
  await realtimeSubscription.value.unsubscribe();
  realtimeSubscription.value = null;
}

async function bootstrapChat() {
  await detachRealtimeSubscription();
  messages.value = [];
  draftMessage.value = "";
  chatContext.value = null;
  closeOfferManagementDialog();

  await loadChatContext();

  if (!hasContext.value || !viewerCanAccessChat.value) return;

  await loadChatMessages();
  if (import.meta.client) {
    await attachRealtimeSubscription();
  }
}

if (import.meta.client) {
  watch(offerListingId, bootstrapChat, { immediate: true });
  watch(
    () => messagesScrollRef.value,
    async (containerElement) => {
      if (!containerElement) return;
      if (!hasMessages.value) return;
      await ensureMessagesAtBottom();
    },
    { flush: "post" },
  );
  watch(
    () => [isLoadingMessages.value, hasMessages.value, offerListingId.value],
    async ([isLoading, hasVisibleMessages]) => {
      if (isLoading) return;
      if (!hasVisibleMessages) return;
      await ensureMessagesAtBottom();
    },
    { flush: "post" },
  );

  onBeforeUnmount(() => {
    detachRealtimeSubscription();
  });
}
</script>

<template>
  <section class="relative h-full">
    <Toolbar label="Chat" fixed back-button>
      <template #info>
        <p v-if="isLoadingContext" class="chat-state-message">Caricamento dettagli chat...</p>
        <p v-else-if="!hasContext" class="chat-state-message">Chat non trovata</p>

        <template v-else>
          <CommunityOfferListingRow :offer-listing="chatContext.offerListing" />
          <div v-if="showRejectedChatWarning" class="chat-warning-box">
            <p class="chat-warning-message">{{ rejectedChatWarningMessage }}</p>
            <button
              v-if="props.viewerRole === 'seller'"
              type="button"
              class="chat-warning-action"
              :disabled="!canRevokeRejectedOffer"
              @click="handleRevokeRejectedOffer"
            >
              Revoca rifiuto
            </button>
          </div>
        </template>
      </template>
    </Toolbar>

    <div class="h-100 flex-1 px-3 pb-3">
      <div class="message-shell">
        <p v-if="isLoadingMessages" class="chat-state-message">Caricamento messaggi...</p>
        <p v-else-if="!hasContext" class="chat-state-message">Chat non trovata</p>
        <p v-else-if="!viewerCanAccessChat" class="chat-state-message">Non puoi accedere a questa chat</p>
        <p v-else-if="!hasMessages" class="chat-state-message">Nessun messaggio per ora</p>

        <div v-else ref="messagesScrollRef" class="h-full overflow-y-auto pb-1">
          <div class="min-h-full space-y-2 flex flex-col justify-end">
            <template v-for="(message, index) in messages" :key="message.id">
              <div v-if="index === firstUnseenIncomingMessageIndex" class="new-messages-divider mt-5">
                <span class="new-messages-label">Nuovi messaggi</span>
                <span class="new-messages-line" />
              </div>

              <article
                class="message-row"
                :class="isOwnMessage(message) ? 'is-own' : 'is-other'"
              >
                <div class="message-bubble">
                  <p class="message-body">{{ message.body }}</p>
                  <div class="message-meta">
                    <span>{{ formatMessageTime(message.created_at) }}</span>

                    <v-icon
                      v-if="isOwnMessage(message)"
                      size="13"
                      :color="message.seen_at ? '#4ade80' : 'rgba(203,213,225,0.82)'"
                    >
                      mdi-check-all
                    </v-icon>
                  </div>
                </div>
              </article>
            </template>
            <div ref="messagesBottomRef" aria-hidden="true" class="h-px w-full" />
          </div>
        </div>
      </div>
    </div>

    <div v-if="!isMobile" class="desktop-composer-wrap px-3 pb-2">
      <div class="chat-composer">
        <v-textarea
          v-model="draftMessage"
          variant="outlined"
          density="comfortable"
          rows="2"
          auto-grow
          hide-details
          no-resize
          maxlength="150"
          counter
          class="chat-textarea"
          placeholder="Scrivi un messaggio..."
          :disabled="!viewerCanAccessChat || isChatDisabledByStatus || isSendingMessage"
          @keydown.ctrl.enter.prevent="handleSendMessage"
        />

        <v-btn
          icon
          color="orange"
          size="large"
          class="chat-send-btn"
          :disabled="!isSendEnabled"
          :loading="isSendingMessage"
          @click="handleSendMessage"
        >
          <v-icon icon="mdi-send" />
          {{ remainingCharacters }}
        </v-btn>
      </div>
    </div>

    <MobileFloatMenu v-if="isMobile" :cols="1">
      <template #buttons>
        <div
          class="chat-composer chat-composer-mobile"
          :class="canManageOfferStatus ? 'with-status-actions' : 'without-status-actions'"
        >
          <div v-if="canManageOfferStatus" class="proposal-response-wrap">
            <DialogsGeneric
              ref="offerManagementDialogRef"
              :disabled="isUpdatingOfferStatus"
            >
              <template #button>
                <button
                  type="button"
                  class="proposal-response-toggle-btn"
                  :disabled="isUpdatingOfferStatus"
                  title="Rispondi alla proposta"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    class="proposal-response-icon"
                    aria-hidden="true"
                  >
                    <path
                      d="M5 5.5H19C20.1 5.5 21 6.4 21 7.5V15C21 16.1 20.1 17 19 17H11L7 20V17H5C3.9 17 3 16.1 3 15V7.5C3 6.4 3.9 5.5 5 5.5Z"
                      stroke="currentColor"
                      stroke-width="1.5"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                    <path
                      d="M9 10H15"
                      stroke="currentColor"
                      stroke-width="1.5"
                      stroke-linecap="round"
                    />
                    <path
                      d="M13.4 8.5L15 10L13.4 11.5"
                      stroke="currentColor"
                      stroke-width="1.5"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                    <path
                      d="M10.6 13.5L9 12L10.6 10.5"
                      stroke="currentColor"
                      stroke-width="1.5"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                  </svg>
                </button>
              </template>

              <template #title>Gestione vendita</template>

              <template #content>
                <p class="offer-management-description">Imposta lo status della trattativa.</p>
              </template>

              <template #actions="{ closeDialog }">
                <div class="offer-management-actions">
                  <div class="offer-management-main-actions">
                    <v-btn
                      block
                      variant="flat"
                      class="offer-management-action-btn offer-management-action-btn--reject"
                      :disabled="!canRejectOffer"
                      :loading="isUpdatingOfferStatus"
                      @click="handleRejectOffer"
                    >
                      Rifiuta
                    </v-btn>

                    <v-btn
                      block
                      variant="flat"
                      class="offer-management-action-btn offer-management-action-btn--accept"
                      :disabled="!canAcceptOffer"
                      :loading="isUpdatingOfferStatus"
                      @click="handleAcceptOffer"
                    >
                      Accetta
                    </v-btn>
                  </div>

                  <v-btn
                    block
                    variant="flat"
                    class="offer-management-action-btn offer-management-action-btn--deliver"
                    :disabled="isUpdatingOfferStatus"
                    @click="handleDeliverOffer(); closeDialog()"
                  >
                    Consegna
                  </v-btn>
                </div>
              </template>
            </DialogsGeneric>
          </div>

          <v-textarea
            v-model="draftMessage"
            variant="outlined"
            density="comfortable"
            rows="2"
            auto-grow
            hide-details
            no-resize
            maxlength="150"
            counter
            class="chat-textarea"
            placeholder="Scrivi un messaggio..."
            :disabled="!viewerCanAccessChat || isChatDisabledByStatus || isSendingMessage"
            @keydown.ctrl.enter.prevent="handleSendMessage"
          />

          <div class="flex flex-col items-center">
            <v-btn
              icon
              color="orange"
              size="medium"
              class="chat-send-btn"
              :disabled="!isSendEnabled"
              :loading="isSendingMessage"
              @click="handleSendMessage"
            >
              <v-icon icon="mdi-send"/>
            </v-btn>
            <span class="chat-remaining-chars">{{ remainingCharacters }} / 150</span>
            
              
          </div>
        </div>
      </template>
    </MobileFloatMenu>

    <FullscreenCardViewer
      v-model:show="viewerOpen"
      v-model:index="viewerIndex"
      :cards="viewerCards"
      @close="viewerOpen = false"
    />
  </section>
</template>

<style scoped>
.chat-state-message {
  text-align: center;
  color: rgba(241, 245, 249, 0.82);
  font-size: 0.86rem;
  font-weight: 600;
  padding: 0.55rem 0;
}

.chat-warning-box {
  margin-top: 0.45rem;
  border: 1px solid rgba(239, 68, 68, 0.34);
  border-radius: 0.75rem;
  padding: 0.55rem 0.65rem;
  background: linear-gradient(145deg, rgba(127, 29, 29, 0.25), rgba(30, 41, 59, 0.35));
}

.chat-warning-message {
  color: rgba(254, 226, 226, 0.94);
  font-size: 0.8rem;
  font-weight: 600;
  line-height: 1.3;
}

.chat-warning-action {
  margin-top: 0.28rem;
  border: none;
  background: transparent;
  padding: 0;
  color: rgba(254, 226, 226, 0.96);
  font-size: 0.79rem;
  font-weight: 700;
  text-decoration: underline;
  text-underline-offset: 3px;
  cursor: pointer;
}

.chat-warning-action:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.message-shell {
  height: calc(100% - 172px);
  border-radius: 0.9rem;
  padding: 0.8rem;
  background: linear-gradient(135deg, rgba(15, 23, 42, 0.84), rgba(7, 10, 16, 0.86));
}

.message-row {
  display: flex;
  width: 100%;
}

.message-row.is-own {
  justify-content: flex-end;
}

.message-row.is-other {
  justify-content: flex-start;
}

.message-bubble {
  width: 70%;
  border-radius: 0.85rem;
  padding: 0.5rem 0.65rem;
  border: 1px solid rgba(255, 255, 255, 0.14);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.08),
    0 10px 20px rgba(0, 0, 0, 0.26);
}

.message-row.is-own .message-bubble {
  background: linear-gradient(145deg, rgba(255, 122, 24, 0.26), rgba(255, 157, 82, 0.12));
}

.message-row.is-other .message-bubble {
  background: linear-gradient(145deg, rgba(31, 41, 55, 0.88), rgba(17, 24, 39, 0.86));
}

.new-messages-divider {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.18rem;
  padding: 0.24rem 0 0.34rem;
}

.new-messages-label {
  color: #ff9d52;
  font-size: 0.82rem;
  line-height: 1.1;
  font-weight: 700;
}

.new-messages-line {
  width: 70%;
  height: 2px;
  border-radius: 999px;
  background: #ff7a18;
}

.message-body {
  white-space: pre-wrap;
  word-break: break-word;
  color: rgba(248, 250, 252, 0.95);
  font-size: 0.9rem;
  line-height: 1.3;
}

.message-meta {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 0.25rem;
  margin-top: 0.28rem;
  font-size: 0.68rem;
  color: rgba(203, 213, 225, 0.86);
}

.chat-composer {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 0.55rem;
  align-items: center;
}

.chat-composer-mobile.with-status-actions {
  grid-template-columns: auto 1fr auto;
}

.chat-composer-mobile.without-status-actions {
  grid-template-columns: 1fr auto;
}

.chat-send-btn {
  min-width: 2.8rem !important;
  min-height: 2.8rem !important;
  border-radius: 999px !important;
}

.proposal-response-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
}

.proposal-response-toggle-btn {
  display: grid;
  place-content: center;
  width: 2.8rem;
  height: 2.8rem;
  border-radius: 999px;
  border: 1px solid rgba(96, 165, 250, 0.42);
  background: linear-gradient(155deg, rgba(30, 64, 175, 0.94), rgba(15, 23, 42, 0.96));
  color: rgba(239, 246, 255, 0.95);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.18),
    0 10px 18px rgba(0, 0, 0, 0.32);
  transition: transform 160ms ease, filter 160ms ease, opacity 160ms ease;
}

.proposal-response-toggle-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  filter: brightness(1.08);
}

.proposal-response-toggle-btn:disabled {
  opacity: 0.58;
  cursor: not-allowed;
}

.proposal-response-icon {
  width: 1.2rem;
  height: 1.2rem;
}

.offer-management-description {
  color: rgba(226, 232, 240, 0.9);
  font-size: 0.92rem;
  line-height: 1.35;
}

.offer-management-actions {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
}

.offer-management-main-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.55rem;
}

.offer-management-action-btn {
  border-radius: 0.75rem !important;
  font-weight: 700;
  letter-spacing: 0.01em;
}

.offer-management-action-btn--reject {
  background: linear-gradient(145deg, rgba(220, 38, 38, 0.94), rgba(127, 29, 29, 0.98)) !important;
  color: rgba(248, 250, 252, 0.98) !important;
}

.offer-management-action-btn--accept {
  background: linear-gradient(145deg, rgba(22, 163, 74, 0.94), rgba(20, 83, 45, 0.98)) !important;
  color: rgba(248, 250, 252, 0.98) !important;
}

.offer-management-action-btn--deliver {
  background: linear-gradient(145deg, rgba(251, 146, 60, 0.96), rgba(234, 88, 12, 0.98)) !important;
  color: rgba(248, 250, 252, 0.98) !important;
}

.chat-remaining-chars {
  text-align: right;
  color: rgba(203, 213, 225, 0.8);
  font-size: 0.7rem;
  margin-top: 0.25rem;
  font-weight: 600;
}

.desktop-composer-wrap {
  margin-top: 0.5rem;
}

:deep(.chat-textarea .v-field) {
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 0.9rem;
}

:deep(.chat-textarea .v-field--focused) {
  border-color: rgba(255, 157, 82, 0.64);
}

:deep(.chat-textarea textarea) {
  color: rgba(248, 250, 252, 0.95);
}

:deep(.chat-textarea textarea::placeholder) {
  color: rgba(203, 213, 225, 0.68);
}
</style>
