<script setup>
import { isSecretDeckSnapshot } from "@/utilities/deckPrivacy";

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
  profileNavigable: {
    type: Boolean,
    default: true,
  },
});

const resolvedUsername = computed(() => props.profile?.display_name ?? props.profile?.username ?? "Utente");
const resolvedUserTag = computed(() => props.profile?.user_tag ?? "@utente");
const resolvedAvatarUrl = computed(() => props.profile?.avatar_url ?? null);
const normalizedDeck = computed(() => {
  if (!props.deck) return null;

  if (isSecretDeckSnapshot(props.deck)) {
    return {
      name: props.deck?.name ?? "Mazzo anonimo",
      cards: [],
      cards_count: null,
      is_secret: true,
      visibility: props.deck?.visibility ?? "secret",
      leader_name: props.deck?.leader_name ?? "Leader segreto",
      leader_colors: Array.isArray(props.deck?.leader_colors) ? props.deck.leader_colors : [],
      placeholder_label: props.deck?.placeholder_label ?? "Dati del mazzo nascosti",
    };
  }

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
    cards_count: cardsFromSnapshot.length ? cardsFromSnapshot.length : fallbackCards.length,
    leader_name: props.deck?.leader_name ?? null,
    leader_colors: Array.isArray(props.deck?.leader_colors) ? props.deck.leader_colors : [],
  };
});

const normalizedLeaderId = computed(() => {
  return props.deck?.leader_id ?? props.deck?.leader ?? null;
});

const statusDotClass = computed(() => {
  if (props.statusDotTone === "ready") {
    return "identity-and-deck__dot identity-and-deck__dot--ready";
  }

  return "identity-and-deck__dot identity-and-deck__dot--waiting";
});
</script>

<template>
  <div
    class="identity-and-deck"
    :class="{ 'identity-and-deck--compact': compactDeck }"
  >
    <UserIdentityHeader
      :username="resolvedUsername"
      :user-tag="resolvedUserTag"
      :profile-tag="resolvedUserTag"
      :avatar-url="resolvedAvatarUrl"
      size="sm"
      :navigable="profileNavigable"
    >
      <template v-if="showStatusDot" #trailing>
        <span :class="[statusDotClass, { 'identity-and-deck__dot--blink': blinkStatusDot }]" />
      </template>
    </UserIdentityHeader>

    <DecksItem
      v-if="deck"
      :leader-id="normalizedLeaderId"
      :current-deck="normalizedDeck"
    />

    <div v-else class="identity-and-deck__waiting-box">
      {{ waitingLabel }}
    </div>
  </div>
</template>

<style scoped>
.identity-and-deck {
  display: grid;
  gap: 0.5rem;
}

.identity-and-deck--compact {
  gap: 0.4rem;
}

.identity-and-deck__dot {
  width: 1.55rem;
  height: 1.55rem;
  border-radius: 9999px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.2);
}

.identity-and-deck__dot--waiting {
  background: rgba(251, 146, 60, 0.92);
  box-shadow: 0 0 12px rgba(251, 146, 60, 0.5);
}

.identity-and-deck__dot--ready {
  background: rgba(34, 197, 94, 0.92);
  box-shadow: 0 0 12px rgba(34, 197, 94, 0.42);
}

.identity-and-deck__dot--blink {
  animation: identity-and-deck-dot-blink 1.1s ease-in-out infinite;
}

.identity-and-deck__waiting-box {
  border: 1px solid rgba(251, 191, 36, 0.4);
  border-radius: 0.9rem;
  background: linear-gradient(145deg, rgba(161, 98, 7, 0.3), rgba(15, 23, 42, 0.7));
  color: rgba(254, 243, 199, 0.94);
  font-size: 0.78rem;
  font-weight: 700;
  line-height: 1.25;
  padding: 0.62rem 0.7rem;
}

@keyframes identity-and-deck-dot-blink {
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
