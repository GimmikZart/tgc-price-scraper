<script setup>
import { getVisibilityLabel } from "~/enums/visibility";
import { Icon } from "@iconify/vue";

const props = defineProps({
  leaderId: {
    type: String,
    required: false,
  },
  currentDeck: {
    type: Object,
    required: true,
  },
});

const { leaderCards } = useOnePieceCards();
const leaderChoosen = computed(() => {
  var found = leaderCards?.find((card) => card.id === props.leaderId);
  return found;
});

const viewerList = computed(() => leaderChoosen.value ? [leaderChoosen.value] : []);
const { show: viewerOpen, index: viewerIndex, open: openViewer } = useCardViewer(viewerList);
</script>

<template>
  <div class="deck-item">
    <div class="deck-item__texture" />
    <div class="deck-item__grain" />

    <div class="relative z-10 flex min-w-0 items-center gap-4">
      <div class="deck-item__art">
        <Card
          v-if="leaderChoosen"
          :card="leaderChoosen"
          class="w-[68px] flex-none shadow-[0_15px_20px_rgba(0,0,0,0.58)]"
          @open="openViewer"
        />
        <div
          v-else
          class="w-[68px] flex items-center justify-center aspect-[2/3] border border-white/15 bg-slate-800/70"
        >
          <v-icon color="white" class="opacity-30" icon="mdi-help-circle-outline"/> <!-- metti l'icona punto interrogativo -->
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
          <p class="truncate text-[11px] font-semibold uppercase tracking-[0.2em] text-[#ffd8b1]/88">
            {{ leaderChoosen?.name ?? "Leader Unset" }}
          </p>
          <p class="mt-1 truncate text-[2.05rem] font-semibold text-slate-50 max-[430px]:text-[1.65rem]">
            {{ currentDeck.name }}
          </p>

          <div class="mt-3 flex flex-wrap items-center gap-2">
            <p class="text-[2rem] font-semibold leading-none text-slate-100/96 max-[430px]:text-[1.55rem]">
              {{ currentDeck.cards.length }}
              <span class="text-slate-300/80">/ 50</span>
            </p>

            <v-chip
              v-if="currentDeck.isLocal"
              size="small"
              class="deck-item__chip deck-item__chip--draft"
            >
              Bozza
              <Icon icon="mdi:offline" class="deck-item__chip-icon" />
            </v-chip>

            <v-chip
              v-else
              size="small"
              class="deck-item__chip deck-item__chip--cloud"
            >
              {{ getVisibilityLabel(currentDeck.visibility) }}
              <Icon
                icon="material-symbols-light:cloud-done-rounded"
                class="deck-item__chip-icon"
              />
            </v-chip>
          </div>
        </div>

        <div
          v-if="leaderChoosen"
          class="deck-item__color-rail"
        >
          <div
            v-for="(color, idx) in leaderChoosen.color"
            :key="idx"
            :class="`bg-${color.toLowerCase()}`"
            class="deck-item__color-pill"
          />
        </div>

        <div v-else class="deck-item__color-rail">
          <div class="deck-item__color-pill bg-slate-800/75" />
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

.deck-item__streak {
  pointer-events: none;
  position: absolute;
  left: 0;
  right: 0;
  bottom: 8px;
  height: 48px;
  opacity: 0.82;
}

.deck-item__art {
  position: relative;
  z-index: 1;
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

.deck-item__chip {
  height: 30px !important;
  border-radius: 999px !important;
  border-width: 1px !important;
  padding: 0 10px !important;
  font-size: 0.76rem !important;
  font-weight: 700 !important;
  letter-spacing: 0.01em !important;
}

.deck-item__chip--draft {
  border-color: rgba(255, 175, 120, 0.38) !important;
  background: linear-gradient(135deg, rgba(255, 130, 30, 0.2), rgba(255, 130, 30, 0.08)) !important;
  color: #ffbf83 !important;
}

.deck-item__chip--cloud {
  border-color: rgba(134, 235, 188, 0.38) !important;
  background: linear-gradient(135deg, rgba(30, 180, 120, 0.2), rgba(30, 180, 120, 0.08)) !important;
  color: #a4f1c7 !important;
}

.deck-item__chip-icon {
  margin-left: 6px;
  font-size: 1rem;
}

@media (max-width: 520px) {
  .deck-item {
    border-radius: 24px;
    padding: 10px 11px;
  }
}
</style>
