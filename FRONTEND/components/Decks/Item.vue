<script setup>
import { Icon } from "@iconify/vue";
import { isSecretDeckSnapshot } from "@/utilities/deckPrivacy";

const props = defineProps({
  leaderId: {
    type: String,
    required: false,
  },
  currentDeck: {
    type: Object,
    required: true,
  },
  selectionMode: {
    type: Boolean,
    default: false,
  },
  selected: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(["click"]);

const { leaderCards } = await useOnePieceCards();
const leaderChoosen = computed(() => {
  const found = leaderCards?.find((card) => card.id === props.leaderId);
  return found;
});
const isSecretDeck = computed(() => isSecretDeckSnapshot(props.currentDeck));

const deckCardCount = computed(() => (
  Array.isArray(props.currentDeck?.cards) ? props.currentDeck.cards.length : 0
));

const deckCardCountLabel = computed(() => {
  if (isSecretDeck.value) {
    return props.currentDeck?.placeholder_label ?? "Dati del mazzo nascosti";
  }

  return deckCardCount.value;
});

const displayedLeaderName = computed(() => {
  if (isSecretDeck.value) {
    return props.currentDeck?.leader_name ?? "Leader segreto";
  }

  return leaderChoosen.value?.name
    ?? props.currentDeck?.leader_name
    ?? "Leader Unset";
});

const displayedDeckName = computed(() => {
  if (isSecretDeck.value) {
    return props.currentDeck?.name ?? "Mazzo anonimo";
  }

  return props.currentDeck?.name ?? "Deck senza nome";
});

const displayedLeaderColors = computed(() => {
  if (Array.isArray(leaderChoosen.value?.color) && leaderChoosen.value.color.length > 0) {
    return leaderChoosen.value.color;
  }

  if (Array.isArray(props.currentDeck?.leader_colors) && props.currentDeck.leader_colors.length > 0) {
    return props.currentDeck.leader_colors;
  }

  return [];
});

const viewerList = computed(() => leaderChoosen.value ? [leaderChoosen.value] : []);
const { show: viewerOpen, index: viewerIndex, open: openViewer } = useCardViewer(viewerList);

function handleItemClick(event) {
  emit("click", event);
}

function handleCardOpen() {
  if (props.selectionMode) return;
  openViewer();
}
</script>

<template>
  <div
    class="deck-item"
    :class="{
      'deck-item--selection-mode': selectionMode,
      'deck-item--selected': selected,
    }"
    @click="handleItemClick"
  >
    <div class="deck-item__texture" />
    <div class="deck-item__grain" />

    <div class="relative z-10 flex min-w-0 items-center gap-4">
      <div v-if="selectionMode" class="deck-item__selection" aria-hidden="true">
        <span
          class="deck-item__checkbox"
          :class="{ 'deck-item__checkbox--checked': selected }"
        >
          <Icon v-if="selected" icon="mdi:check" class="h-4 w-4" />
        </span>
      </div>

      <div class="deck-item__art">
        <div
          v-if="isSecretDeck"
          class="deck-item__art-placeholder deck-item__art-placeholder--secret"
        >
          <Icon icon="mdi:eye-off-outline" class="h-8 w-8" />
        </div>
        <Card
          v-else-if="leaderChoosen"
          :card="leaderChoosen"
          class="w-[68px] flex-none shadow-[0_15px_20px_rgba(0,0,0,0.58)]"
          @open="handleCardOpen"
        />
        <div
          v-else
          class="deck-item__art-placeholder"
        >
          <v-icon color="white" class="opacity-30" icon="mdi-help-circle-outline" />
        </div>
      </div>

      <FullscreenCardViewer
        v-if="leaderChoosen"
        v-model:show="viewerOpen"
        v-model:index="viewerIndex"
        :cards="viewerList"
        @close="viewerOpen = false"
      />

      <div class="flex min-w-0 flex-1 items-center justify-between gap-3 py-2">
        <div class="min-w-0 flex-1">
          <p class="truncate text-[10px] font-semibold uppercase tracking-[0.2em] text-[#ffd8b1]/88">
            {{ displayedLeaderName }}
          </p>
          <p class="mt-1 truncate text-[1rem] font-semibold text-slate-50 max-[430px]:text-[1.3rem]">
            {{ displayedDeckName }}
          </p>

          <div class="mt-3 flex flex-wrap items-center gap-2">
            <p
              v-if="isSecretDeck"
              class="deck-item__secret-copy"
            >
              {{ deckCardCountLabel }}
            </p>
            <p v-else class="text-[1rem] font-semibold leading-none text-slate-100/96 max-[430px]:text-[1rem]">
              {{ deckCardCountLabel }}
              <span class="text-slate-300/80">/ 50</span>
            </p>
          </div>
        </div>

        <div
          v-if="displayedLeaderColors.length > 0 && !isSecretDeck"
          class="deck-item__color-rail"
        >
          <div
            v-for="(color, idx) in displayedLeaderColors"
            :key="idx"
            :class="`bg-${color.toLowerCase()}`"
            class="deck-item__color-pill"
          />
        </div>

        <div v-else class="deck-item__color-rail">
          <div
            class="deck-item__color-pill"
            :class="isSecretDeck ? 'deck-item__color-pill--secret' : 'bg-slate-800/75'"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.deck-item {
  position: relative;
  isolation: isolate;
  cursor: pointer;
  overflow: hidden;
  border-radius: 10px 20px 20px 10px !important;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: linear-gradient(112deg, rgba(15, 20, 33, 0.92) 0%, rgba(8, 11, 19, 0.95) 52%, rgba(5, 7, 13, 0.95) 100%);
  box-shadow:
    0 18px 42px rgba(0, 0, 0, 0.62),
    inset 0 1px 0 rgba(255, 255, 255, 0.14),
    inset 0 -1px 0 rgba(255, 255, 255, 0.08);
  padding: 5px 12px !important;
  transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
}

.deck-item:hover {
  transform: translateY(-1px);
  border-color: rgba(255, 175, 120, 0.45);
  box-shadow:
    0 24px 46px rgba(0, 0, 0, 0.64),
    0 0 22px rgba(255, 122, 24, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.16);
}

.deck-item--selected {
  border-color: rgba(248, 113, 113, 0.55);
  box-shadow:
    0 24px 46px rgba(0, 0, 0, 0.64),
    0 0 26px rgba(239, 68, 68, 0.22),
    inset 0 0 0 1px rgba(248, 113, 113, 0.15),
    inset 0 1px 0 rgba(255, 255, 255, 0.16);
}

.deck-item__texture {
  pointer-events: none;
  position: absolute;
  inset: 0;
  background:
    radial-gradient(130% 120% at 0% 100%, rgba(255, 122, 24, 0.19) 0%, rgba(255, 122, 24, 0.09) 25%, transparent 54%),
    radial-gradient(90% 100% at 70% 22%, rgba(108, 132, 170, 0.2) 0%, transparent 48%),
    linear-gradient(120deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.02) 46%, rgba(8, 12, 22, 0) 72%);
}

.deck-item__grain {
  pointer-events: none;
  position: absolute;
  inset: 0;
  opacity: 0.3;
  mix-blend-mode: soft-light;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160' viewBox='0 0 160 160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.88' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)' opacity='0.37'/%3E%3C/svg%3E");
  background-size: 230px 230px;
}

.deck-item__art {
  position: relative;
  z-index: 1;
}

.deck-item__art-placeholder {
  width: 68px;
  aspect-ratio: 2 / 3;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: rgba(30, 41, 59, 0.7);
}

.deck-item__art-placeholder--secret {
  border-color: rgba(255, 255, 255, 0.1);
  border-radius: 0.85rem;
  background:
    radial-gradient(circle at top, rgba(71, 85, 105, 0.18), transparent 38%),
    linear-gradient(180deg, rgba(2, 6, 23, 0.96), rgba(0, 0, 0, 0.98));
  color: rgba(248, 250, 252, 0.72);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.04),
    inset 0 0 0 1px rgba(255, 255, 255, 0.03);
}

.deck-item__selection {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 28px;
}

.deck-item__checkbox {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 7px;
  border: 1px solid rgba(255, 255, 255, 0.24);
  background: rgba(255, 255, 255, 0.05);
  color: #fff5f5;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.12),
    inset 0 -1px 0 rgba(0, 0, 0, 0.28);
}

.deck-item__checkbox--checked {
  border-color: rgba(248, 113, 113, 0.48);
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.92), rgba(127, 29, 29, 0.98));
  box-shadow:
    0 0 18px rgba(239, 68, 68, 0.24),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
}

.deck-item__color-rail {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 18px;
  min-width: 18px;
  height: 88px;
}

.deck-item__color-pill {
  flex: 1;
  border-radius: 9px;
  border: 1px solid rgba(255, 255, 255, 0.28);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.3),
    inset 0 -1px 0 rgba(0, 0, 0, 0.35),
    0 0 8px rgba(0, 0, 0, 0.24);
}

.deck-item__color-pill--secret {
  border-color: rgba(255, 255, 255, 0.08);
  background:
    linear-gradient(180deg, rgba(30, 41, 59, 0.7), rgba(2, 6, 23, 0.95));
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.05),
    inset 0 -1px 0 rgba(0, 0, 0, 0.4);
}

.deck-item__secret-copy {
  font-size: 0.82rem;
  font-weight: 700;
  line-height: 1.2;
  color: rgba(203, 213, 225, 0.84);
}

@media (max-width: 520px) {
  .deck-item {
    border-radius: 24px;
    padding: 5px 6px;
  }

  .deck-item__selection {
    min-width: 24px;
  }
}
</style>
