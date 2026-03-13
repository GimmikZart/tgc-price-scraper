<script setup>
const props = defineProps({
  profile: {
    type: Object,
    default: null,
  },
  deck: {
    type: Object,
    default: null,
  },
  waitingLabel: {
    type: String,
    default: "In attesa scelta mazzo",
  },
  showStatusDot: {
    type: Boolean,
    default: false,
  },
  statusDotTone: {
    type: String,
    default: "waiting",
  },
  blinkStatusDot: {
    type: Boolean,
    default: false,
  },
  compactDeck: {
    type: Boolean,
    default: false,
  },
});

const resolvedUsername = computed(() => props.profile?.display_name ?? props.profile?.username ?? "Utente");
const resolvedUserTag = computed(() => props.profile?.user_tag ?? "@utente");
const resolvedAvatarUrl = computed(() => props.profile?.avatar_url ?? null);
const normalizedDeck = computed(() => {
  if (!props.deck) return null;

  const cardsFromSnapshot = Array.isArray(props.deck.cards)
    ? props.deck.cards
    : [];
  const cardsCountFromSnapshot = Number(props.deck.cards_count);

  const fallbackCards = Number.isInteger(cardsCountFromSnapshot) && cardsCountFromSnapshot > 0
    ? Array.from({ length: cardsCountFromSnapshot }, () => "__snapshot__")
    : [];

  return {
    name: props.deck?.name ?? "Mazzo non selezionato",
    cards: cardsFromSnapshot.length ? cardsFromSnapshot : fallbackCards,
  };
});

const normalizedLeaderId = computed(() => {
  return props.deck?.leader_id ?? props.deck?.leader ?? null;
});

const statusDotClass = computed(() => {
  if (props.statusDotTone === "ready") {
    return "match-room-participant__dot match-room-participant__dot--ready";
  }

  return "match-room-participant__dot match-room-participant__dot--waiting";
});
</script>

<template>
  <div class="space-y-2">
    <UserIdentityHeader
      :username="resolvedUsername"
      :user-tag="resolvedUserTag"
      :profile-tag="resolvedUserTag"
      :avatar-url="resolvedAvatarUrl"
      size="sm"
    >
      <template v-if="showStatusDot" #trailing>
        <span :class="[statusDotClass, { 'match-room-participant__dot--blink': blinkStatusDot }]" />
      </template>
    </UserIdentityHeader>

    <DecksItem
      v-if="deck"
      :leader-id="normalizedLeaderId"
      :current-deck="normalizedDeck"
    />

    <div v-else class="match-room-participant__waiting-box">
      {{ waitingLabel }}
    </div>
  </div>
</template>

<style scoped>
.match-room-participant__dot {
  width: 1.55rem;
  height: 1.55rem;
  border-radius: 9999px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.2);
}

.match-room-participant__dot--waiting {
  background: rgba(251, 146, 60, 0.92);
  box-shadow: 0 0 12px rgba(251, 146, 60, 0.5);
}

.match-room-participant__dot--ready {
  background: rgba(34, 197, 94, 0.92);
  box-shadow: 0 0 12px rgba(34, 197, 94, 0.42);
}

.match-room-participant__dot--blink {
  animation: match-room-dot-blink 1.1s ease-in-out infinite;
}

.match-room-participant__waiting-box {
  border: 1px solid rgba(251, 191, 36, 0.4);
  border-radius: 0.9rem;
  background: linear-gradient(145deg, rgba(161, 98, 7, 0.3), rgba(15, 23, 42, 0.7));
  color: rgba(254, 243, 199, 0.94);
  font-size: 0.78rem;
  font-weight: 700;
  line-height: 1.25;
  padding: 0.62rem 0.7rem;
}

@keyframes match-room-dot-blink {
  0% {
    opacity: 1;
    transform: scale(1);
  }

  50% {
    opacity: 0.45;
    transform: scale(0.88);
  }

  100% {
    opacity: 1;
    transform: scale(1);
  }
}
</style>
