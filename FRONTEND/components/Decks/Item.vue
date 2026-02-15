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
  <div
    class="group relative z-0 cursor-pointer overflow-hidden rounded-2xl border border-white/15 bg-slate-950/75 p-2 text-left shadow-[0_14px_36px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-2xl transition-all duration-200 hover:-translate-y-[1px] hover:border-[#ffb27d]/35 hover:shadow-[0_20px_44px_rgba(0,0,0,0.62),0_0_26px_rgba(255,122,24,0.2)]"
  >
    <div class="pointer-events-none absolute inset-0 bg-[radial-gradient(90%_75%_at_0%_100%,rgba(255,122,24,0.15),transparent_52%),linear-gradient(115deg,rgba(255,255,255,0.06),rgba(255,255,255,0.01)_45%,transparent_78%)]" />
    <div class="pointer-events-none absolute inset-x-3 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />
    <div class="pointer-events-none absolute -bottom-5 left-5 h-14 w-32 rounded-full bg-[#ff7a18]/20 blur-2xl" />

    <div class="relative z-10 flex min-w-0 items-center gap-3">
      <Card
        v-if="leaderChoosen"
        :card="leaderChoosen"
        class="w-[56px] flex-none rounded-md shadow-[0_8px_18px_rgba(0,0,0,0.45)] ring-1 ring-white/20"
        @open="openViewer"
      />
      <div
        v-else
        class="w-[56px] aspect-[2/3] rounded-md border border-white/15 bg-slate-800/70 flex-none"
      />

      <FullscreenCardViewer
        v-if="leaderChoosen"
        v-model:show="viewerOpen"
        v-model:index="viewerIndex"
        :cards="viewerList"
        @close="viewerOpen = false"
      />

      <div class="flex min-w-0 flex-1 items-center justify-between gap-3">
        <div class="min-w-0 flex-1 px-1">
          <p class="truncate text-[11px] font-medium uppercase tracking-[0.2em] text-slate-300/65">
            {{ leaderChoosen?.name ?? "Leader Unset" }}
          </p>
          <p class="mt-0.5 truncate text-3xl font-semibold leading-none text-slate-50">
            {{ currentDeck.name }}
          </p>

          <div class="mt-2 flex flex-wrap items-center gap-2">
            <p class="text-base font-medium text-slate-100/90">
              {{ currentDeck.cards.length }} / 50
            </p>

            <v-chip
              v-if="currentDeck.isLocal"
              size="small"
              class="!h-7 !rounded-full !border !border-[#ffb27d]/40 !bg-[#ff7a18]/14 !px-2 !text-xs !font-semibold !text-[#ffbf85]"
            >
              Bozza
              <Icon icon="mdi:offline" class="ml-1 text-base text-[#ff9f52]" />
            </v-chip>

            <v-chip
              v-else
              size="small"
              class="!h-7 !rounded-full !border !border-[#8de9b5]/35 !bg-[#26c281]/12 !px-2 !text-xs !font-semibold !text-[#9ff3c2]"
            >
              {{ getVisibilityLabel(currentDeck.visibility) }}
              <Icon
                icon="material-symbols-light:cloud-done-rounded"
                class="ml-1 text-base text-[#73e8aa]"
              />
            </v-chip>
          </div>
        </div>

        <div
          v-if="leaderChoosen"
          class="ml-1 flex h-[84px] w-[16px] shrink-0 flex-col gap-1"
        >
          <div
            v-for="(color, idx) in leaderChoosen.color"
            :key="idx"
            :style="{ borderColor: color == 'Black' ? 'gray' : 'transparent' }"
            :class="`bg-${color.toLowerCase()} ${color}` "
            class="h-full rounded-md border-[1px] border-opacity-50"
          />
          
        </div>

        <div v-else class="ml-1 flex h-[84px] w-[16px] shrink-0 flex-col gap-1" :style="{ borderColor: 'white' }">
          <div class="h-full rounded-md border-[1px] border-opacity-50 bg-slate-700/40" />
        </div>
      </div>
    </div>
  </div>
</template>
