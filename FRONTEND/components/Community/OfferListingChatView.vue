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
const isMarkingSeen = ref(false);
const offerManagementDialogRef = ref(null);
const messagesScrollRef = ref(null);
const messagesBottomRef = ref(null);
const realtimeSubscription = ref(null);
const bootstrapRunId = ref(0);

const currentUserId = computed(() => userAuth?.userLogged?.id ?? null);
const offerListingId = computed(() => {
  const parsedValue = Number(route.params.id);
  if (!Number.isInteger(parsedValue) || parsedValue <= 0) return null;
  return parsedValue;
});

const hasContext = computed(() => {
  return Boolean(chatContext.value?.offerListing && chatContext.value?.sellListing);
});

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
const currentOfferStatus = computed(() => chatContext.value?.offerListing?.status ?? null);
const isOfferRejected = computed(() => currentOfferStatus.value === OfferStatus.Rejected);
const isChatDisabledByStatus = computed(() => isOfferRejected.value);
const isSendEnabled = computed(() => {
  if (!viewerCanAccessChat.value) return false;
  if (isChatDisabledByStatus.value) return false;
  if (isSendingMessage.value) return false;
  const body = normalizedDraftMessage.value;
  return body.length > 0 && body.length <= 150;
});

const showRejectedChatWarning = computed(() => {
  if (!hasContext.value) return false;
  if (!viewerCanAccessChat.value) return false;
  return isOfferRejected.value;
});

const rejectedChatWarningMessage = computed(() => {
  if (props.viewerRole === "seller") {
    return "Hai rifiutato l'offerta. La chat e stata disattivata.";
  }
  return "Il venditore ha rifiutato l'offerta. La chat e stata disattivata.";
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

const firstUnseenIncomingMessageIndex = computed(() => {
  return messages.value.findIndex((message) => !hasSeenAt(message) && !isOwnMessage(message));
});

function parseMessageTimestamp(value) {
  const timestamp = new Date(value ?? 0).getTime();
  if (Number.isFinite(timestamp)) return timestamp;
  return 0;
}

function sortMessages(nextMessages) {
  return [...nextMessages].sort((leftMessage, rightMessage) => {
    const leftTimestamp = parseMessageTimestamp(leftMessage?.created_at);
    const rightTimestamp = parseMessageTimestamp(rightMessage?.created_at);
    if (leftTimestamp === rightTimestamp) {
      return Number(leftMessage?.id ?? 0) - Number(rightMessage?.id ?? 0);
    }
    return leftTimestamp - rightTimestamp;
  });
}

function setMessages(nextMessages = []) {
  const normalizedMessages = Array.isArray(nextMessages) ? nextMessages : [];
  messages.value = sortMessages(normalizedMessages);
}

function isOwnMessage(message) {
  if (!currentUserId.value) return false;
  return String(message?.sender_id) === String(currentUserId.value);
}

function hasSeenAt(message) {
  if (typeof message?.seen_at === "string") {
    return message.seen_at.trim().length > 0;
  }
  return Boolean(message?.seen_at);
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

function waitForNextFrame() {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || typeof window.requestAnimationFrame !== "function") {
      setTimeout(resolve, 16);
      return;
    }
    window.requestAnimationFrame(() => resolve());
  });
}

async function scrollMessagesToBottom(behavior = "smooth", attempts = 1) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    await nextTick();
    await waitForNextFrame();

    // scroll element deve essere l'elemento che nel DOM ha classe v-main
    const scrollElement = document.querySelector("html");
    const bottomAnchorElement = messagesBottomRef.value;
    if (!scrollElement) continue;

    if (bottomAnchorElement?.scrollIntoView) {
      bottomAnchorElement.scrollIntoView({
        block: "end",
        inline: "nearest",
        behavior,
      });
    }

    if (behavior === "smooth") {
      scrollElement.scrollTo({
        top: scrollElement.scrollHeight,
        behavior: "smooth",
      });
      return;
    }

    scrollElement.scrollTop = scrollElement.scrollHeight;

    const maxScrollTop = Math.max(scrollElement.scrollHeight - scrollElement.clientHeight, 0);
    const reachedBottom = Math.abs(maxScrollTop - scrollElement.scrollTop) <= 2;
    if (reachedBottom) return;
  }
}

function upsertMessage(nextMessage) {
  const parsedMessageId = Number(nextMessage?.id);
  if (!Number.isInteger(parsedMessageId) || parsedMessageId <= 0) return;

  const existingIndex = messages.value.findIndex((message) => Number(message?.id) === parsedMessageId);
  if (existingIndex === -1) {
    setMessages([...messages.value, nextMessage]);
    return;
  }

  const updatedMessages = [...messages.value];
  updatedMessages[existingIndex] = {
    ...updatedMessages[existingIndex],
    ...nextMessage,
  };
  setMessages(updatedMessages);
}

function removeMessage(messageId) {
  const parsedMessageId = Number(messageId);
  if (!Number.isInteger(parsedMessageId) || parsedMessageId <= 0) return;
  setMessages(messages.value.filter((message) => Number(message?.id) !== parsedMessageId));
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
    snackbar.addMessage(error.message || "Errore durante l'aggiornamento della proposta", "error");
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
    snackbar.addMessage(error.message || "Errore durante il refresh dei messaggi letti", "error");
  } finally {
    isMarkingSeen.value = false;
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

async function loadChatMessages() {
  if (!offerListingId.value) {
    setMessages([]);
    return;
  }

  isLoadingMessages.value = true;

  try {
    const fetchedMessages = await fetchOfferListingChatMessages(offerListingId.value);
    setMessages(fetchedMessages);
    await markIncomingMessagesAsSeen();
  } catch (error) {
    setMessages([]);
    snackbar.addMessage(error.message || "Errore durante il caricamento dei messaggi", "error");
  } finally {
    isLoadingMessages.value = false;
  }

  if (messages.value.length > 0) {
    await scrollMessagesToBottom("auto", 10);
  }
}

async function handleSendMessage() {
  if (!isSendEnabled.value) return;
  if (!offerListingId.value) return;

  isSendingMessage.value = true;

  try {
    const insertedMessage = await sendOfferListingChatMessage({
      offerListingId: offerListingId.value,
      body: normalizedDraftMessage.value,
    });

    upsertMessage(insertedMessage);
    draftMessage.value = "";
    await scrollMessagesToBottom("smooth");
  } catch (error) {
    snackbar.addMessage(error.message || "Errore durante l'invio del messaggio", "error");
  } finally {
    isSendingMessage.value = false;
  }
}

async function detachRealtimeSubscription() {
  const subscription = realtimeSubscription.value;
  realtimeSubscription.value = null;

  if (!subscription?.unsubscribe) return;

  try {
    await subscription.unsubscribe();
  } catch (error) {
    snackbar.addMessage(error.message || "Errore durante la chiusura realtime della chat", "error");
  }
}

async function attachRealtimeSubscription() {
  if (!offerListingId.value) return;
  if (!viewerCanAccessChat.value) return;

  await detachRealtimeSubscription();

  realtimeSubscription.value = subscribeToOfferListingChatMessages(offerListingId.value, {
    onInsert: async (newMessage) => {
      upsertMessage(newMessage);
      if (!isOwnMessage(newMessage)) {
        await markIncomingMessagesAsSeen();
      }
      await scrollMessagesToBottom("smooth");
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
}

async function bootstrapChat() {
  const runId = bootstrapRunId.value + 1;
  bootstrapRunId.value = runId;

  await detachRealtimeSubscription();
  setMessages([]);
  draftMessage.value = "";
  chatContext.value = null;
  closeOfferManagementDialog();

  await loadChatContext();
  if (runId !== bootstrapRunId.value) return;
  if (!hasContext.value || !viewerCanAccessChat.value) return;

  await loadChatMessages();
  if (runId !== bootstrapRunId.value) return;
  await attachRealtimeSubscription();
}

if (import.meta.client) {
  watch(offerListingId, () => {
    bootstrapChat();
  }, { immediate: true });

  watch(() => messagesScrollRef.value, async (scrollElement) => {
    if (!scrollElement) return;
    if (!hasMessages.value) return;
    await scrollMessagesToBottom("auto", 3);
  }, { flush: "post" });

  watch(
    () => [isLoadingContext.value, isLoadingMessages.value, hasMessages.value],
    async ([loadingContext, loadingMessages, visibleMessages]) => {
      if (loadingContext || loadingMessages || !visibleMessages) return;
      await scrollMessagesToBottom("auto", 10);
    },
    { flush: "post" },
  );

  onBeforeUnmount(() => {
    detachRealtimeSubscription();
  });
}

</script>

<template>
  <section class="relative h-fit flex flex-col overflow-hidden">
    <Toolbar fixed back-button>
      <template #content>
        <p v-if="isLoadingContext" class="chat-state-message text-start">Chat</p>
        <UserIdentityHeader 
          v-else
          :username="chatContext.sellListing.sellerProfile.username" 
          :user-tag="chatContext.sellListing.sellerProfile.user_tag"
          :avatar-url="chatContext.sellListing.sellerProfile.avatar_url"
          size="sm"
        />
      </template>
      <template #info>
        <p v-if="isLoadingContext" class="chat-state-message">Caricamento chat...</p>
        <p v-else-if="!hasContext" class="chat-state-message">Chat non trovata</p>
        <template v-else>
          <div class="chat-context-row">
            <Card :card="chatContext.sellListing.card" class="chat-context-card" />
            <CommunityOfferListingRow :offer-listing="chatContext.offerListing" class="chat-context-offer-row" />
          </div>

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

    <section class="chat-container flex flex-col justify-between gap-[0.6rem] rounded-[0.9rem] border border-[rgba(255,255,255,0.16)] bg-[linear-gradient(140deg,rgba(14,21,33,0.96),rgba(9,13,22,0.96))] px-[0.55rem] py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_12px_22px_rgba(0,0,0,0.34)]">
      <template v-for="(message, index) in messages" :key="message.id">
        <div v-if="index === firstUnseenIncomingMessageIndex" class="new-messages-divider">
          <span class="new-messages-label">Nuovi messaggi</span>
          <span class="new-messages-line" />
        </div>

        <article class="message-row" :class="isOwnMessage(message) ? 'is-own' : 'is-other'">
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
    </section>

    <MobileFloatMenu v-if="isMobile" :cols="1">
      <template #buttons>
        <div
          class="chat-composer chat-composer-mobile"
          :class="canManageOfferStatus ? 'with-status-actions' : 'without-status-actions'"
        >
          <div v-if="canManageOfferStatus" class="proposal-response-wrap">
            <DialogsGeneric ref="offerManagementDialogRef" :disabled="isUpdatingOfferStatus">
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

          <div class="chat-send-wrap">
            <v-btn
              icon
              color="orange"
              size="medium"
              class="chat-send-btn"
              :disabled="!isSendEnabled"
              :loading="isSendingMessage"
              @click="handleSendMessage"
            >
              <v-icon icon="mdi-send" />
            </v-btn>
            <span class="chat-remaining-chars">{{ remainingCharacters }} / 150</span>
          </div>
        </div>
      </template>
    </MobileFloatMenu>
  </section>
</template>

<style scoped>

.chat-container{
  height: calc(100% - 320px);
  border-radius: 1rem;
  overflow: auto;
  padding: 1rem;
  margin: 0.5rem;
  margin-top: 0;
}
.chat-content {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
}

.chat-state-message {
  text-align: center;
  color: rgba(241, 245, 249, 0.82);
  font-size: 0.86rem;
  font-weight: 600;
  padding: 0.55rem 0;
}

.chat-context-row {
  display: flex;
  align-items: center;
}

.chat-context-card {
  position: relative;
  overflow: hidden;
  border-radius: 0.72rem;
  flex: 0 0 auto;
  aspect-ratio: 5/7;
  height: 100% !important;
  min-width: 3rem;
}

.chat-context-offer-row {
  flex: 1;
  min-width: 0;
}

.chat-context-card :deep(.card-shell.card-surface) {
  position: relative;
  width: 100%;
  height: 100% !important;
  min-height: 0;
}

.chat-context-card :deep(.card-image) {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100% !important;
  object-fit: cover;
}

.chat-context-card :deep(.image-skeleton) {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100% !important;
  aspect-ratio: auto;
}

.chat-top-info {
  margin-top: 0.35rem;
  display: grid;
  grid-template-columns: minmax(84px, 104px) 1fr;
  gap: 0.6rem;
  align-items: start;
}

.chat-top-info--without-card {
  grid-template-columns: 1fr;
}

.chat-top-info-card-wrap {
  width: 100%;
}

.chat-top-info-right {
  min-width: 0;
}

.chat-offerer-summary {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
}

.chat-offerer-summary-message {
  margin: 0;
  color: rgba(248, 250, 252, 0.94);
  font-size: 0.88rem;
  font-weight: 600;
  line-height: 1.25;
}

.chat-offerer-summary-chip {
  border-radius: 0.72rem !important;
  font-weight: 700;
  margin-left: 0.25rem;
  margin-right: 0.25rem;
  vertical-align: middle;
}

.chat-offerer-summary-copies {
  color: #ff9d52;
  font-weight: 700;
}

:deep(.chat-offerer-info-card) {
  width: 100%;
}

:deep(.chat-offerer-info-card > div:last-child) {
  min-width: 0;
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
  min-height: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  border-radius: 0.9rem;
  padding: 0.8rem;
  background: linear-gradient(135deg, rgba(15, 23, 42, 0.84), rgba(7, 10, 16, 0.86));
}

.message-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding-bottom: 0.2rem;
}

.message-stack {
  min-height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  gap: 0.5rem;
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
  width: min(70%, 450px);
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

.message-bottom-anchor {
  width: 100%;
  height: 1px;
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

.desktop-composer-wrap {
  margin-top: 0.1rem;
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

.chat-send-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
}

.chat-send-btn {
  min-width: 2.8rem !important;
  min-height: 2.8rem !important;
  border-radius: 999px !important;
}

.chat-remaining-chars {
  text-align: right;
  color: rgba(203, 213, 225, 0.8);
  font-size: 0.7rem;
  margin-top: 0.25rem;
  font-weight: 600;
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

@media (max-width: 450px) {
  .chat-top-info {
    grid-template-columns: minmax(74px, 88px) 1fr;
    gap: 0.5rem;
  }

  :deep(.chat-offerer-info-card) {
    flex-direction: column;
    gap: 0.55rem;
  }

  :deep(.chat-offerer-info-card > div:first-child) {
    width: min(62%, 180px);
    min-width: 0;
  }

  :deep(.chat-offerer-info-card > div:last-child) {
    width: 100%;
  }
}
</style>
