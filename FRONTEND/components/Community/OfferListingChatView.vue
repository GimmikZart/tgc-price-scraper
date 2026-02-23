<script setup>
import {
  acceptOfferListingProposal,
  fetchOfferListingChatContext,
  fetchOfferListingChatMessages,
  markOfferListingAsDelivered,
  markOfferListingAsReceived,
  markOfferListingChatMessagesAsSeen,
  rejectOfferListingProposal,
  revokeOfferListingDelivery,
  revokeOfferListingReception,
  sendOfferListingChatMessage,
  subscribeToOfferListingChatMessages,
  updateOwnOfferListingProposal,
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
const router = useRouter();
const snackbar = useSnackbar();
const userAuth = useUserAuth();
const { isMobile } = useMyBreakpoints();
const NEW_SELL_PATH = "/community/sell-cards/new-sell";

const chatContext = ref(null);
const messages = ref([]);
const draftMessage = ref("");
const isLoadingContext = ref(true);
const isLoadingMessages = ref(false);
const isSendingMessage = ref(false);
const isUpdatingOfferStatus = ref(false);
const isUpdatingOfferProposal = ref(false);
const isMarkingSeen = ref(false);
const offerManagementDialogRef = ref(null);
const offerPurchaseManagementDialogRef = ref(null);
const offerEditDialogRef = ref(null);
const offerDeliverConfirmDialogRef = ref(null);
const offerReceiveConfirmDialogRef = ref(null);
const offerEditQuantity = ref(1);
const offerEditValue = ref("");
const messagesScrollRef = ref(null);
const messagesBottomRef = ref(null);
const realtimeSubscription = ref(null);
const bootstrapRunId = ref(0);
const hasTradeCompletionRedirected = ref(false);

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
const isOfferDelivered = computed(() => Boolean(chatContext.value?.offerListing?.delivered_at));
const isOfferReceived = computed(() => Boolean(chatContext.value?.offerListing?.received_at));
const isTradeCompleted = computed(() => isOfferDelivered.value && isOfferReceived.value);
const tradeCompletionRedirectPath = computed(() => {
  const parsedSellListingId = Number(chatContext.value?.sellListing?.id);
  if (!Number.isInteger(parsedSellListingId) || parsedSellListingId <= 0) return null;

  if (props.viewerRole === "seller") {
    return `/community/sell-cards/${parsedSellListingId}`;
  }

  return `/community/offers/${parsedSellListingId}`;
});
const showTradeStatusSection = computed(() => {
  return isOfferDelivered.value || isOfferReceived.value;
});
const counterpartyIdentity = computed(() => {
  if (!hasContext.value) return null;

  const sellerProfile = chatContext.value?.sellListing?.sellerProfile ?? null;
  const offererProfile = chatContext.value?.offerListing?.offererProfile ?? null;

  if (props.viewerRole === "seller") {
    return {
      username: offererProfile?.username ?? chatContext.value?.offerListing?.offererUsername ?? null,
      userTag: offererProfile?.user_tag ?? chatContext.value?.offerListing?.offererUserTag ?? null,
      avatarUrl: offererProfile?.avatar_url ?? null,
    };
  }

  return {
    username: sellerProfile?.username ?? chatContext.value?.sellListing?.sellerUsername ?? null,
    userTag: sellerProfile?.user_tag ?? chatContext.value?.sellListing?.sellerUserTag ?? null,
    avatarUrl: sellerProfile?.avatar_url ?? chatContext.value?.sellListing?.sellerAvatarUrl ?? null,
  };
});
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
const canManagePurchase = computed(() => {
  if (props.viewerRole !== "offerer") return false;
  if (!viewerCanAccessChat.value) return false;

  const parsedOfferListingId = Number(chatContext.value?.offerListing?.id);
  return Number.isInteger(parsedOfferListingId) && parsedOfferListingId > 0;
});
const canShowSellerActionButton = computed(() => {
  if (!canManageOfferStatus.value) return false;
  return !isOfferRejected.value;
});
const canShowOffererActionButton = computed(() => {
  if (!canManagePurchase.value) return false;
  return !isOfferRejected.value;
});
const hasChatActionButton = computed(() => {
  return canShowSellerActionButton.value || canShowOffererActionButton.value;
});
const canCreateNewSellListing = computed(() => props.viewerRole === "seller");

const canRejectOffer = computed(() => {
  if (!canManageOfferStatus.value) return false;
  if (isUpdatingOfferStatus.value) return false;
  if (isOfferDelivered.value) return false;
  return currentOfferStatus.value !== OfferStatus.Rejected;
});
const canMarkAsDelivered = computed(() => {
  if (!canManageOfferStatus.value) return false;
  if (isUpdatingOfferStatus.value) return false;
  return !isOfferDelivered.value;
});
const canRevokeDelivery = computed(() => {
  if (!canManageOfferStatus.value) return false;
  if (isUpdatingOfferStatus.value) return false;
  return isOfferDelivered.value;
});
const canMarkAsReceived = computed(() => {
  if (!canManagePurchase.value) return false;
  if (isUpdatingOfferProposal.value) return false;
  return !isOfferReceived.value;
});
const canRevokeReception = computed(() => {
  if (!canManagePurchase.value) return false;
  if (isUpdatingOfferProposal.value) return false;
  return isOfferReceived.value;
});
const canEditOfferProposal = computed(() => {
  if (!canManagePurchase.value) return false;
  if (isUpdatingOfferProposal.value) return false;
  return !isOfferReceived.value;
});

const canRevokeRejectedOffer = computed(() => {
  if (!canManageOfferStatus.value) return false;
  if (isUpdatingOfferStatus.value) return false;
  return isOfferRejected.value;
});
const maxOfferQuantity = computed(() => {
  const parsedQuantity = Number(chatContext.value?.sellListing?.quantity);
  if (!Number.isInteger(parsedQuantity) || parsedQuantity < 1) return 1;
  return parsedQuantity;
});
const offerEditQuantityModel = computed({
  get() {
    const parsedQuantity = Number(offerEditQuantity.value);
    if (!Number.isInteger(parsedQuantity) || parsedQuantity < 1) return 1;
    return Math.min(parsedQuantity, maxOfferQuantity.value);
  },
  set(newValue) {
    const parsedQuantity = Number(newValue);
    const normalizedQuantity = !Number.isInteger(parsedQuantity) || parsedQuantity < 1 ? 1 : parsedQuantity;
    offerEditQuantity.value = Math.min(normalizedQuantity, maxOfferQuantity.value);
  },
});
const canSubmitOfferEdit = computed(() => {
  if (!canManagePurchase.value) return false;
  if (isUpdatingOfferProposal.value) return false;
  if (isOfferReceived.value) return false;

  const parsedOffer = Number(offerEditValue.value);
  const parsedQuantity = Number(offerEditQuantityModel.value);

  if (!Number.isFinite(parsedOffer) || parsedOffer <= 0) return false;
  return Number.isInteger(parsedQuantity) && parsedQuantity > 0;
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

function closeOfferPurchaseManagementDialog() {
  offerPurchaseManagementDialogRef.value?.closeDialog?.();
}

function closeOfferEditDialog() {
  offerEditDialogRef.value?.closeDialog?.();
}

function closeOfferDeliverConfirmDialog() {
  offerDeliverConfirmDialogRef.value?.closeDialog?.();
}

function closeOfferReceiveConfirmDialog() {
  offerReceiveConfirmDialogRef.value?.closeDialog?.();
}

async function redirectToTradeDetailsIfCompleted() {
  if (!isTradeCompleted.value) return;
  if (hasTradeCompletionRedirected.value) return;

  const targetPath = tradeCompletionRedirectPath.value;
  if (!targetPath) return;
  if (route.path === targetPath) return;

  hasTradeCompletionRedirected.value = true;
  await router.push(targetPath);
}

function openNewSellListingPage() {
  if (!canCreateNewSellListing.value) return;
  if (route.path === NEW_SELL_PATH || route.path === `${NEW_SELL_PATH}/`) return;
  void router.push(NEW_SELL_PATH);
}

function resetOfferEditDraft() {
  offerEditQuantity.value = 1;
  offerEditValue.value = "";
}

function hydrateOfferEditDraftFromContext() {
  const parsedQuantity = Number(chatContext.value?.offerListing?.quantity);
  const parsedOffer = Number(chatContext.value?.offerListing?.offer);

  offerEditQuantity.value = Number.isInteger(parsedQuantity) && parsedQuantity > 0
    ? Math.min(parsedQuantity, maxOfferQuantity.value)
    : 1;
  offerEditValue.value = Number.isFinite(parsedOffer) && parsedOffer > 0
    ? parsedOffer.toFixed(2)
    : "";
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

async function handleRejectOffer() {
  if (!canRejectOffer.value) return;
  await handleUpdateOfferStatus(OfferStatus.Rejected);
}

async function handleOpenOfferDeliverDialog(closeDialog) {
  if (!canManageOfferStatus.value) return;

  if (isOfferDelivered.value) {
    closeDialog?.();
    snackbar.addMessage("Consegna gia confermata", "info");
    return;
  }

  closeDialog?.();
  await nextTick();
  offerDeliverConfirmDialogRef.value?.openDialog?.();
}

async function handleConfirmOfferDelivery() {
  if (!canManageOfferStatus.value) return;

  const parsedOfferListingId = Number(chatContext.value?.offerListing?.id);
  if (!Number.isInteger(parsedOfferListingId) || parsedOfferListingId <= 0) return;

  if (isOfferDelivered.value) {
    closeOfferDeliverConfirmDialog();
    snackbar.addMessage("Consegna gia confermata", "info");
    return;
  }

  isUpdatingOfferStatus.value = true;

  try {
    const updatedOfferListing = await markOfferListingAsDelivered(parsedOfferListingId);
    applyUpdatedOfferListing(updatedOfferListing);
    closeOfferDeliverConfirmDialog();
    snackbar.addMessage("Consegna confermata", "success");
  } catch (error) {
    snackbar.addMessage(error.message || "Errore durante la conferma della consegna", "error");
  } finally {
    isUpdatingOfferStatus.value = false;
  }
}

async function handleRevokeOfferDelivery() {
  if (!canRevokeDelivery.value) return;

  const parsedOfferListingId = Number(chatContext.value?.offerListing?.id);
  if (!Number.isInteger(parsedOfferListingId) || parsedOfferListingId <= 0) return;

  isUpdatingOfferStatus.value = true;

  try {
    const updatedOfferListing = await revokeOfferListingDelivery(parsedOfferListingId);
    applyUpdatedOfferListing(updatedOfferListing);
    snackbar.addMessage("Consegna revocata", "success");
  } catch (error) {
    snackbar.addMessage(error.message || "Errore durante la revoca della consegna", "error");
  } finally {
    isUpdatingOfferStatus.value = false;
  }
}

async function handleDeliverManagementAction(closeDialog) {
  if (isOfferDelivered.value) {
    closeDialog?.();
    await handleRevokeOfferDelivery();
    return;
  }

  await handleOpenOfferDeliverDialog(closeDialog);
}

async function handleOpenOfferEditDialog(closeDialog) {
  if (!canEditOfferProposal.value) return;

  hydrateOfferEditDraftFromContext();
  closeDialog?.();
  await nextTick();
  offerEditDialogRef.value?.openDialog?.();
}

async function handleOpenOfferPurchaseReceivedDialog(closeDialog) {
  if (!canManagePurchase.value) return;

  if (isOfferReceived.value) {
    closeDialog?.();
    snackbar.addMessage("Ricezione gia confermata", "info");
    return;
  }

  closeDialog?.();
  await nextTick();
  offerReceiveConfirmDialogRef.value?.openDialog?.();
}

async function handleConfirmOfferReception() {
  if (!canManagePurchase.value) return;

  const parsedOfferListingId = Number(chatContext.value?.offerListing?.id);
  if (!Number.isInteger(parsedOfferListingId) || parsedOfferListingId <= 0) return;

  if (isOfferReceived.value) {
    closeOfferReceiveConfirmDialog();
    snackbar.addMessage("Ricezione gia confermata", "info");
    return;
  }

  isUpdatingOfferProposal.value = true;

  try {
    const updatedOfferListing = await markOfferListingAsReceived(parsedOfferListingId);
    applyUpdatedOfferListing(updatedOfferListing);
    closeOfferReceiveConfirmDialog();
    closeOfferPurchaseManagementDialog();
    snackbar.addMessage("Ricezione confermata", "success");
  } catch (error) {
    snackbar.addMessage(error.message || "Errore durante la conferma della ricezione", "error");
  } finally {
    isUpdatingOfferProposal.value = false;
  }
}

async function handleRevokeOfferReception() {
  if (!canRevokeReception.value) return;

  const parsedOfferListingId = Number(chatContext.value?.offerListing?.id);
  if (!Number.isInteger(parsedOfferListingId) || parsedOfferListingId <= 0) return;

  isUpdatingOfferProposal.value = true;

  try {
    const updatedOfferListing = await revokeOfferListingReception(parsedOfferListingId);
    applyUpdatedOfferListing(updatedOfferListing);
    snackbar.addMessage("Ricezione revocata", "success");
  } catch (error) {
    snackbar.addMessage(error.message || "Errore durante la revoca della ricezione", "error");
  } finally {
    isUpdatingOfferProposal.value = false;
  }
}

async function handlePurchaseReceivedAction(closeDialog) {
  if (isOfferReceived.value) {
    closeDialog?.();
    await handleRevokeOfferReception();
    return;
  }

  await handleOpenOfferPurchaseReceivedDialog(closeDialog);
}

async function handleSubmitOfferEdit() {
  if (!canManagePurchase.value) return;

  const parsedOfferListingId = Number(chatContext.value?.offerListing?.id);
  if (!Number.isInteger(parsedOfferListingId) || parsedOfferListingId <= 0) return;

  const parsedQuantity = Number(offerEditQuantityModel.value);
  if (!Number.isInteger(parsedQuantity) || parsedQuantity < 1) {
    snackbar.addMessage("Inserisci una quantita valida", "error");
    return;
  }

  if (parsedQuantity > maxOfferQuantity.value) {
    snackbar.addMessage(`Quantita massima disponibile: ${maxOfferQuantity.value}`, "error");
    return;
  }

  const parsedOffer = Number(offerEditValue.value);
  if (!Number.isFinite(parsedOffer) || parsedOffer <= 0) {
    snackbar.addMessage("Inserisci un importo valido per l'offerta", "error");
    return;
  }

  isUpdatingOfferProposal.value = true;

  try {
    const updatedOfferListing = await updateOwnOfferListingProposal({
      offerListingId: parsedOfferListingId,
      quantity: parsedQuantity,
      offer: parsedOffer,
    });

    applyUpdatedOfferListing(updatedOfferListing);
    closeOfferEditDialog();
    closeOfferPurchaseManagementDialog();
    snackbar.addMessage("Offerta modificata con successo", "success");
  } catch (error) {
    snackbar.addMessage(error.message || "Errore durante la modifica dell'offerta", "error");
  } finally {
    isUpdatingOfferProposal.value = false;
  }
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
  hasTradeCompletionRedirected.value = false;
  closeOfferManagementDialog();
  closeOfferPurchaseManagementDialog();
  closeOfferEditDialog();
  closeOfferDeliverConfirmDialog();
  closeOfferReceiveConfirmDialog();
  resetOfferEditDraft();

  await loadChatContext();
  if (runId !== bootstrapRunId.value) return;
  await redirectToTradeDetailsIfCompleted();
  if (hasTradeCompletionRedirected.value) return;
  if (!hasContext.value || !viewerCanAccessChat.value) return;

  await loadChatMessages();
  if (runId !== bootstrapRunId.value) return;
  await attachRealtimeSubscription();
}

if (import.meta.client) {
  watch(offerListingId, () => {
    bootstrapChat();
  }, { immediate: true });

  watch(
    () => [isTradeCompleted.value, tradeCompletionRedirectPath.value],
    async ([completed, targetPath]) => {
      if (!completed || !targetPath) return;
      await redirectToTradeDetailsIfCompleted();
    },
    { immediate: true },
  );

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
          :username="counterpartyIdentity?.username"
          :user-tag="counterpartyIdentity?.userTag"
          :avatar-url="counterpartyIdentity?.avatarUrl"
          size="sm"
        />
      </template>
      <template #info>
        <p v-if="isLoadingContext" class="chat-state-message">Caricamento chat...</p>
        <p v-else-if="!hasContext" class="chat-state-message">Chat non trovata</p>
        <template v-else>
          <div class="chat-context-row">
            <CommunityOfferListingRow :offer-listing="chatContext.offerListing" class="chat-context-offer-row">
              <template v-if="chatContext.sellListing.card" #left>
                <Card
                  :card="chatContext.sellListing.card"
                  class="chat-context-card"
                  disable-opening
                />
              </template>
            </CommunityOfferListingRow>
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
          <div v-else class="chat-info-box">
            <h3 class="text-sm text-blue-500 text-center font-bold">Regolamento</h3>
            <ul class="chat-info-message list-disc list-inside">
              <li class="text-xs">Non fornire informazioni personali o sensibili.</li>
              <li class="text-xs">Prediligi scambio a mano. Diffida da spedizioni o pagamenti anticipati.</li>
              <li class="text-xs">Deckspedia non si assume responsabilità riguardante l'autenticità dei prodotti.</li>
            </ul>
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
        <div class="chat-toolbar-stack">
          <ButtonMenu
            v-if="canCreateNewSellListing"
            icon="mdi:cash-plus"
            label="Nuova vendita"
            transition
            :delay="100"
            icon-color="green"
            @click="openNewSellListingPage"
          />

          <div v-if="showTradeStatusSection" class="chat-sale-status">
            <div
              class="chat-sale-status-card"
              :class="isOfferDelivered ? 'chat-sale-status-card--completed' : 'chat-sale-status-card--pending'"
            >
              <span class="chat-sale-status-role">Venditore</span>
              <div class="chat-sale-status-line">
                <v-icon size="15" class="chat-sale-status-icon">
                  {{ isOfferDelivered ? "mdi-check-circle" : "mdi-timer-sand" }}
                </v-icon>
                <span>{{ isOfferDelivered ? "Consegna confermata" : "In attesa consegna" }}</span>
              </div>
            </div>

            <div
              class="chat-sale-status-card"
              :class="isOfferReceived ? 'chat-sale-status-card--completed' : 'chat-sale-status-card--pending'"
            >
              <span class="chat-sale-status-role">Offerente</span>
              <div class="chat-sale-status-line">
                <v-icon size="15" class="chat-sale-status-icon">
                  {{ isOfferReceived ? "mdi-check-circle" : "mdi-timer-sand" }}
                </v-icon>
                <span>{{ isOfferReceived ? "Ricezione confermata" : "In attesa ricezione" }}</span>
              </div>
            </div>
          </div>

          <div
            class="chat-composer chat-composer-mobile"
            :class="hasChatActionButton ? 'with-status-actions' : 'without-status-actions'"
          >
            <div v-if="canShowSellerActionButton" class="proposal-response-wrap">
            <DialogsGeneric ref="offerManagementDialogRef" :disabled="isUpdatingOfferStatus || isOfferRejected">
              <template #button>
                <button
                  type="button"
                  class="proposal-response-toggle-btn"
                  :disabled="isUpdatingOfferStatus || isOfferRejected"
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
                      :class="[
                        'offer-management-action-btn',
                        isOfferDelivered
                          ? 'offer-management-action-btn--revoke'
                          : 'offer-management-action-btn--deliver',
                      ]"
                      :disabled="isOfferDelivered ? !canRevokeDelivery : !canMarkAsDelivered"
                      :loading="isUpdatingOfferStatus"
                      @click="handleDeliverManagementAction(closeDialog)"
                    >
                      {{ isOfferDelivered ? 'Revoca consegna' : 'Consegna' }}
                    </v-btn>
                  </div>

                </div>
              </template>
            </DialogsGeneric>

            <DialogsGeneric ref="offerDeliverConfirmDialogRef" :disabled="isUpdatingOfferStatus">
              <template #button>
                <span class="offer-edit-hidden-trigger" aria-hidden="true" />
              </template>

              <template #title>Sicuro di voler concludere la vendita?</template>

              <template #content>
                <p class="offer-management-description">
                  Una volta che anche l'offerente indicherà che ha ricevuto l'oggetto, la trattativa sarà conclusa e la chat verrà distrutta. Vuoi continuare?
                </p>
              </template>

              <template #actions="{ closeDialog }">
                <v-spacer />
                <v-btn
                  variant="flat"
                  class="offer-finalization-dialog-cancel-btn"
                  :disabled="isUpdatingOfferStatus"
                  @click="closeDialog"
                >
                  Annulla
                </v-btn>
                <v-btn
                  variant="flat"
                  class="offer-management-action-btn offer-management-action-btn--deliver"
                  :disabled="!canMarkAsDelivered"
                  :loading="isUpdatingOfferStatus"
                  @click="handleConfirmOfferDelivery"
                >
                  Procedi
                </v-btn>
              </template>
            </DialogsGeneric>
          </div>
          <div v-else-if="canShowOffererActionButton" class="proposal-response-wrap">
            <DialogsGeneric ref="offerPurchaseManagementDialogRef" :disabled="isUpdatingOfferProposal">
              <template #button>
                <button
                  type="button"
                  class="purchase-management-toggle-btn"
                  :disabled="isUpdatingOfferProposal"
                  title="Gestione acquisto"
                >
                  <v-icon size="18">mdi-cart-check</v-icon>
                </button>
              </template>

              <template #title>Gestione acquisto</template>

              <template #content>
                <p class="offer-management-description">Gestisci la tua proposta di acquisto.</p>
              </template>

              <template #actions="{ closeDialog }">
                <div class="offer-management-actions">
                  <div class="offer-management-main-actions">
                    <v-btn
                      block
                      variant="flat"
                      class="offer-management-action-btn offer-management-action-btn--edit"
                      :disabled="!canEditOfferProposal"
                      @click="handleOpenOfferEditDialog(closeDialog)"
                    >
                      Modifica
                    </v-btn>

                    <v-btn
                      block
                      variant="flat"
                      :class="[
                        'offer-management-action-btn',
                        isOfferReceived
                          ? 'offer-management-action-btn--revoke'
                          : 'offer-management-action-btn--received',
                      ]"
                      :disabled="isOfferReceived ? !canRevokeReception : !canMarkAsReceived"
                      :loading="isUpdatingOfferProposal"
                      @click="handlePurchaseReceivedAction(closeDialog)"
                    >
                      {{ isOfferReceived ? 'Revoca ricezione' : 'Oggetto ricevuto' }}
                    </v-btn>
                  </div>
                </div>
              </template>
            </DialogsGeneric>

            <DialogsGeneric ref="offerReceiveConfirmDialogRef" :disabled="isUpdatingOfferProposal">
              <template #button>
                <span class="offer-edit-hidden-trigger" aria-hidden="true" />
              </template>

              <template #title>Sicuro di voler concludere l'acquisto?</template>

              <template #content>
                <p class="offer-management-description">
                  Una volta che anche il venditore indicherà di aver ceduto l'oggetto, la trattativa sarà conclusa e la chat verrà distrutta. Vuoi continuare?
                </p>
              </template>

              <template #actions="{ closeDialog }">
                <v-spacer />
                <v-btn
                  variant="flat"
                  class="offer-finalization-dialog-cancel-btn"
                  :disabled="isUpdatingOfferProposal"
                  @click="closeDialog"
                >
                  Annulla
                </v-btn>
                <v-btn
                  variant="flat"
                  class="offer-management-action-btn offer-management-action-btn--received"
                  :disabled="!canMarkAsReceived"
                  :loading="isUpdatingOfferProposal"
                  @click="handleConfirmOfferReception"
                >
                  Procedi
                </v-btn>
              </template>
            </DialogsGeneric>

            <DialogsGeneric ref="offerEditDialogRef" :disabled="isUpdatingOfferProposal">
              <template #button>
                <span class="offer-edit-hidden-trigger" aria-hidden="true" />
              </template>

              <template #title>Modifica offerta</template>

              <template #content>
                <div class="space-y-4">
                  <div>
                    <p class="offer-management-field-label mb-1">Quantita</p>
                    <CardCounter
                      v-model="offerEditQuantityModel"
                      :min="1"
                      :max="maxOfferQuantity"
                      :outer-padding="false"
                    />
                  </div>

                  <InputTextField
                    v-model="offerEditValue"
                    label="Offerta"
                    type="number"
                    min="0.01"
                    step="0.01"
                  />
                </div>
              </template>

              <template #actions="{ closeDialog }">
                <v-spacer />
                <v-btn
                  variant="text"
                  class="offer-edit-dialog-cancel-btn"
                  :disabled="isUpdatingOfferProposal"
                  @click="closeDialog"
                >
                  Annulla
                </v-btn>
                <v-btn
                  variant="flat"
                  class="offer-management-action-btn offer-management-action-btn--edit"
                  :disabled="!canSubmitOfferEdit"
                  :loading="isUpdatingOfferProposal"
                  @click="handleSubmitOfferEdit"
                >
                  Procedi
                </v-btn>
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

.chat-info-box {
  margin-top: 0.45rem;
  border: 1px solid rgba(33, 95, 165, 0.34);
  border-radius: 0.75rem;
  padding: 0.55rem 0.65rem;
  background: linear-gradient(145deg, rgba(33, 95, 165, 0.25), rgba(30, 41, 59, 0.35));
}


.chat-warning-message {
  color: rgba(254, 226, 226, 0.94);
  font-size: 0.8rem;
  font-weight: 600;
  line-height: 1.3;
}

.chat-info-message {
  color: rgba(203, 213, 225, 0.86);
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

.chat-toolbar-stack {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.chat-sale-status {
  width: 100%;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.45rem;
}

.chat-sale-status-card {
  border-radius: 0.82rem;
  border: 1px solid transparent;
  padding: 0.42rem 0.52rem;
  min-width: 0;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.14),
    0 8px 18px rgba(0, 0, 0, 0.24);
}

.chat-sale-status-card--pending {
  border-color: rgba(251, 146, 60, 0.46);
  background: linear-gradient(145deg, rgba(251, 146, 60, 0.3), rgba(234, 88, 12, 0.2));
  color: rgba(255, 237, 213, 0.98);
}

.chat-sale-status-card--completed {
  border-color: rgba(34, 197, 94, 0.45);
  background: linear-gradient(145deg, rgba(22, 163, 74, 0.34), rgba(20, 83, 45, 0.22));
  color: rgba(220, 252, 231, 0.98);
}

.chat-sale-status-role {
  display: block;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  opacity: 0.95;
}

.chat-sale-status-line {
  margin-top: 0.16rem;
  display: flex;
  align-items: center;
  gap: 0.28rem;
  font-size: 0.74rem;
  font-weight: 700;
  line-height: 1.2;
}

.chat-sale-status-icon {
  flex: 0 0 auto;
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

.purchase-management-toggle-btn {
  display: grid;
  place-content: center;
  width: 2.8rem;
  height: 2.8rem;
  border-radius: 999px;
  border: 1px solid rgba(34, 197, 94, 0.45);
  background: linear-gradient(155deg, rgba(22, 163, 74, 0.95), rgba(20, 83, 45, 0.98));
  color: rgba(240, 253, 244, 0.95);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.18),
    0 10px 18px rgba(0, 0, 0, 0.32);
  transition: transform 160ms ease, filter 160ms ease, opacity 160ms ease;
}

.purchase-management-toggle-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  filter: brightness(1.08);
}

.purchase-management-toggle-btn:disabled {
  opacity: 0.58;
  cursor: not-allowed;
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

.offer-management-action-btn--edit {
  background: linear-gradient(145deg, rgba(251, 146, 60, 0.96), rgba(234, 88, 12, 0.98)) !important;
  color: rgba(248, 250, 252, 0.98) !important;
}

.offer-management-action-btn--received {
  background: linear-gradient(145deg, rgba(22, 163, 74, 0.94), rgba(20, 83, 45, 0.98)) !important;
  color: rgba(248, 250, 252, 0.98) !important;
}

.offer-management-action-btn--deliver {
  background: linear-gradient(145deg, rgba(22, 163, 74, 0.94), rgba(20, 83, 45, 0.98)) !important;
  color: rgba(248, 250, 252, 0.98) !important;
}

.offer-management-action-btn--revoke {
  background: linear-gradient(145deg, rgba(220, 38, 38, 0.94), rgba(127, 29, 29, 0.98)) !important;
  color: rgba(248, 250, 252, 0.98) !important;
}

.offer-management-field-label {
  color: rgba(248, 250, 252, 0.92);
  font-size: 0.82rem;
  font-weight: 600;
}

.offer-edit-hidden-trigger {
  display: none;
  width: 0;
  height: 0;
  overflow: hidden;
}

.offer-edit-dialog-cancel-btn {
  color: rgba(241, 245, 249, 0.9) !important;
}

.offer-finalization-dialog-cancel-btn {
  border-radius: 0.75rem !important;
  border: 1px solid rgba(96, 165, 250, 0.42) !important;
  background: linear-gradient(155deg, rgba(30, 64, 175, 0.94), rgba(15, 23, 42, 0.96)) !important;
  color: rgba(239, 246, 255, 0.95) !important;
  font-weight: 700;
  letter-spacing: 0.01em;
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
