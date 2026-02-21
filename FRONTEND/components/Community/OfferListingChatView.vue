<script setup>
import {
  fetchOfferListingChatContext,
  fetchOfferListingChatMessages,
  markOfferListingChatMessagesAsSeen,
  sendOfferListingChatMessage,
  subscribeToOfferListingChatMessages,
} from "@/api/offerListingChat";

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
const messagesContainerRef = ref(null);
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
  if (isSendingMessage.value) return false;
  if (!normalizedDraftMessage.value) return false;
  return normalizedDraftMessage.value.length <= 150;
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

function scrollToBottom(behavior = "smooth") {
  nextTick(() => {
    const containerElement = messagesContainerRef.value;
    if (!containerElement) return;

    containerElement.scrollTo({
      top: containerElement.scrollHeight,
      behavior,
    });
  });
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
    scrollToBottom("auto");
  } catch (error) {
    messages.value = [];
    snackbar.addMessage(error.message || "Errore durante il caricamento dei messaggi", "error");
  } finally {
    isLoadingMessages.value = false;
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

  await loadChatContext();

  if (!hasContext.value || !viewerCanAccessChat.value) return;

  await loadChatMessages();
  if (import.meta.client) {
    await attachRealtimeSubscription();
  }
}

if (import.meta.client) {
  watch(offerListingId, bootstrapChat, { immediate: true });

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
          <!-- <CommunitySellListingInfoCard
            :listing="chatContext.sellListing"
            @open-card="handleOpenCard"
          /> -->

          <div class="mt-2">
            <CommunityOfferListingRow :offer-listing="chatContext.offerListing" />
          </div>
        </template>
      </template>
    </Toolbar>

    <div class="min-h-0 h-100 flex-1 px-3 pb-2">
      <div ref="messagesContainerRef" class="message-shell">
        <p v-if="isLoadingMessages" class="chat-state-message">Caricamento messaggi...</p>
        <p v-else-if="!hasContext" class="chat-state-message">Chat non trovata</p>
        <p v-else-if="!viewerCanAccessChat" class="chat-state-message">Non puoi accedere a questa chat</p>
        <p v-else-if="!hasMessages" class="chat-state-message">Nessun messaggio per ora</p>

        <div v-else class="space-y-2 h-full overflow-y-auto pb-1">
          <article
            v-for="message in 20"
            :key="message.id"
            class="message-row"
            :class="isOwnMessage(message) ? 'is-own' : 'is-other'"
          >
            <div class="message-bubble">
              <p class="message-body"><!-- {{ message.body }} -->ciao </p>
              <div class="message-meta">
                <span><!-- {{ formatMessageTime(message.created_at) }} --> oggi</span>

                <v-icon
                  v-if="isOwnMessage(true/* message */)"
                  size="13"
                  :color="message.seen_at ? '#4ade80' : 'rgba(203,213,225,0.82)'"
                >
                  mdi-check-all
                </v-icon>
              </div>
            </div>
          </article>
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
          :disabled="!viewerCanAccessChat || isSendingMessage"
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
            :disabled="!viewerCanAccessChat || isSendingMessage"
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

.message-shell {
  height: calc(100% - 172px);
  border-radius: 0.9rem;
  padding: 0.8rem;
  background: linear-gradient(135deg, rgba(15, 23, 42, 0.84), rgba(7, 10, 16, 0.86));
}

.message-row {
  display: flex;
  flex-direction: column;
  width: 100%;
}

.message-row.is-own {
  justify-content: flex-end;
}

.message-row.is-other {
  justify-content: flex-start;
}

.message-bubble {
  max-width: min(82%, 320px);
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
  align-items: end;
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
