<script setup>
import { useElementBounding } from "@vueuse/core";
import CardsIcon from "@/components/Navbar/icons/CardsIcon.vue";
import CollectionIcon from "@/components/Navbar/icons/CollectionIcon.vue";
import DecksIcon from "@/components/Navbar/icons/DecksIcon.vue";
import ProfileIcon from "@/components/Navbar/icons/ProfileIcon.vue";
import FriendsIcon from "@/components/Navbar/icons/FriendsIcon.vue";
import SearchCardsIcon from "@/components/Navbar/icons/SearchCardsIcon.vue";
import SellCardsIcon from "@/components/Navbar/icons/SellCardsIcon.vue";
import PersonalModeIcon from "@/components/Navbar/icons/PersonalModeIcon.vue";
import CommunityModeIcon from "@/components/Navbar/icons/CommunityModeIcon.vue";

const PERSONAL_MODE = "personal";
const COMMUNITY_MODE = "community";
const PERSONAL_MODE_LABEL = "Io";
const COMMUNITY_MODE_LABEL = "Community";
const BUY_CARDS_PATH = "/community/buy-cards";
const OFFERS_PATH = "/community/offers";

const nav = ref(null);
const route = useRoute();
const router = useRouter();
const globalSettings = useGlobalSettings();
const { height } = useElementBounding(nav);
const isModeSwitching = ref(false);

const personalNavItems = [
  { to: "/me/cards", label: "Carte", icon: CardsIcon },
  { to: "/me/collection", label: "Collezione", icon: CollectionIcon },
  { to: "/me/decks", label: "Mazzi", icon: DecksIcon },
  { to: "/me/profile", label: "Profilo", icon: ProfileIcon },
];

const communityNavItems = [
  { to: "/community/buy-cards", label: "Compra Carte", icon: SearchCardsIcon },
  { to: "/community/sell-cards", label: "Vendi Carte", icon: SellCardsIcon },
  { to: "/community/friends", label: "Amici", icon: FriendsIcon },
  { to: "/me/profile", label: "Profilo", icon: ProfileIcon },
];

const navItemsByMode = {
  [PERSONAL_MODE]: personalNavItems.map((item) => ({ ...item, key: item.to })),
  [COMMUNITY_MODE]: communityNavItems.map((item) => ({ ...item, key: item.to })),
};

const isRouteMatch = (path, item) => {
  if (
    item.to === BUY_CARDS_PATH
    && (path === OFFERS_PATH || path.startsWith(`${OFFERS_PATH}/`))
  ) {
    return true;
  }

  return path === item.to || path.startsWith(`${item.to}/`);
};

const findMatchByMode = (mode, path) => {
  const items = navItemsByMode[mode];
  return items.find((item) => isRouteMatch(path, item));
};

const getModeFromPath = (path) => {
  const personalMatch = findMatchByMode(PERSONAL_MODE, path);
  const communityMatch = findMatchByMode(COMMUNITY_MODE, path);

  if (communityMatch && !personalMatch) return COMMUNITY_MODE;
  return PERSONAL_MODE;
};

const currentMode = useState("mobile-nav-mode", () => getModeFromPath(route.path));
const visualActiveItemKey = useState("mobile-nav-active-item-key", () => {
  const currentModeMatch = findMatchByMode(currentMode.value, route.path);
  return currentModeMatch?.key ?? navItemsByMode[PERSONAL_MODE][0].key;
});

const currentModeItems = computed(() => navItemsByMode[currentMode.value]);
const sideSlots = computed(() => [
  { id: "left-0", item: currentModeItems.value[0] },
  { id: "left-1", item: currentModeItems.value[1] },
  { id: "right-0", item: currentModeItems.value[2] },
  { id: "right-1", item: currentModeItems.value[3] },
]);
const leftSlots = computed(() => sideSlots.value.slice(0, 2));
const rightSlots = computed(() => sideSlots.value.slice(2));

const toggleTargetMode = computed(() => {
  return currentMode.value === PERSONAL_MODE ? COMMUNITY_MODE : PERSONAL_MODE;
});

const toggleLabel = computed(() => {
  return currentMode.value === PERSONAL_MODE ? PERSONAL_MODE_LABEL : COMMUNITY_MODE_LABEL;
});

const toggleIcon = computed(() => {
  return currentMode.value === PERSONAL_MODE ? PersonalModeIcon : CommunityModeIcon;
});

const isVisualActiveItem = (item) => {
  return visualActiveItemKey.value === item.key;
};

const activeItemIndex = computed(() => {
  return currentModeItems.value.findIndex((item) => item.key === visualActiveItemKey.value);
});

const activeColumnIndex = computed(() => {
  const sideColumnMap = [0, 1, 3, 4];
  const normalizedIndex = activeItemIndex.value >= 0 ? activeItemIndex.value : 0;
  return sideColumnMap[normalizedIndex] ?? sideColumnMap[0];
});

const isCurrentRouteItem = (item) => {
  return isRouteMatch(route.path, item);
};

const selectItem = (item) => {
  visualActiveItemKey.value = item.key;
};

const toggleMode = async () => {
  if (isModeSwitching.value) return;

  const nextMode = toggleTargetMode.value;
  const nextModeFirstItem = navItemsByMode[nextMode][0];

  isModeSwitching.value = true;
  currentMode.value = nextMode;
  visualActiveItemKey.value = nextModeFirstItem.key;

  try {
    if (!isRouteMatch(route.path, nextModeFirstItem)) {
      await router.push(nextModeFirstItem.to);
    }
  } finally {
    isModeSwitching.value = false;
  }
};

watch(
  height,
  (newHeight) => {
    globalSettings.navbarHeight = newHeight;
  },
  { immediate: true },
);

watch(
  () => route.path,
  (path) => {
    const personalMatch = findMatchByMode(PERSONAL_MODE, path);
    const communityMatch = findMatchByMode(COMMUNITY_MODE, path);

    if (communityMatch && !personalMatch) {
      currentMode.value = COMMUNITY_MODE;
    } else if (personalMatch && !communityMatch) {
      currentMode.value = PERSONAL_MODE;
    }

    const modeAwareMatch = findMatchByMode(currentMode.value, path)
      || (currentMode.value === COMMUNITY_MODE ? personalMatch : communityMatch);
    if (modeAwareMatch) {
      visualActiveItemKey.value = modeAwareMatch.key;
    }
  },
  { immediate: true },
);

watch(currentMode, (mode) => {
  const hasVisibleActiveItem = navItemsByMode[mode].some(
    (item) => item.key === visualActiveItemKey.value,
  );
  if (!hasVisibleActiveItem) {
    visualActiveItemKey.value = navItemsByMode[mode][0].key;
  }
});
</script>

<template>
  <nav
    ref="nav"
    class="fixed inset-x-0 bottom-0 z-[1000] flex justify-center pb-[max(env(safe-area-inset-bottom),0px)]"
  >
    <div
      class="w-full max-w-[520px] border border-white/15 bg-slate-950/70 shadow-[0_22px_48px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.16)] backdrop-blur-2xl"
    >
      <div class="relative grid h-[86px] grid-cols-5 items-end gap-0 px-2 pb-2 pt-1">
        <div class="pointer-events-none absolute inset-y-2 left-2 right-2">
          <div
            class="h-full w-1/5 rounded-2xl bg-[#ff7a18]/10 shadow-[0_0_24px_rgba(255,122,24,0.42),inset_0_0_0_1px_rgba(255,183,124,0.2)] transition-transform duration-300 ease-out"
            :style="{ transform: `translateX(${activeColumnIndex * 100}%)` }"
          />
        </div>

        <div
          v-for="slot in leftSlots"
          :key="slot.id"
          class="relative h-full overflow-hidden"
        >
          <Transition name="nav-item-slide">
            <NuxtLink
              :key="`${currentMode}-${slot.item.key}`"
              :to="slot.item.to"
              class="group absolute inset-0 flex flex-col items-center justify-center gap-1 rounded-2xl pb-2 transition-all duration-200 ease-out"
              :class="isVisualActiveItem(slot.item)
                ? 'text-[#ff9d52]'
                : 'text-slate-200/70 hover:text-slate-100/90'"
              :aria-current="isCurrentRouteItem(slot.item) ? 'page' : undefined"
              @click="selectItem(slot.item)"
            >
              <span
                class="relative flex h-9 w-9 items-center justify-center rounded-xl transition-all duration-200 ease-out"
                :class="isVisualActiveItem(slot.item)
                  ? 'scale-105 bg-[#ff7a18]/20 shadow-[0_0_22px_rgba(255,122,24,0.55)]'
                  : 'scale-100 bg-transparent group-hover:bg-white/5'"
              >
                <component
                  :is="slot.item.icon"
                  :active="isVisualActiveItem(slot.item)"
                  class="h-6 w-6"
                />
              </span>

              <span
                class="text-[10px] font-medium leading-none tracking-wide transition-all duration-200 ease-out"
                :class="isVisualActiveItem(slot.item) ? 'opacity-100 text-[#ffd1a9]' : 'opacity-70'"
              >
                {{ slot.item.label }}
              </span>
            </NuxtLink>
          </Transition>
        </div>

        <div class="relative flex h-full items-start justify-center">
          <button
            type="button"
            class="group relative -mt-2 flex h-[66px] w-[66px] flex-col items-center justify-center rounded-full border border-[#ffb27d]/45 bg-slate-950 text-[#ffd1a9] shadow-[0_0_30px_rgba(255,122,24,0.5),0_14px_24px_rgba(0,0,0,0.55)] transition-all duration-200 ease-out hover:scale-[1.03] hover:border-[#ffd0a5] disabled:cursor-wait disabled:opacity-95"
            :disabled="isModeSwitching"
            @click="toggleMode"
          >
            <span class="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-b from-[#ff9d52]/28 to-[#ff7a18]/10" />
            <template v-if="isModeSwitching">
              <span class="relative flex h-7 w-7 items-center justify-center">
                <span class="h-6 w-6 animate-spin rounded-full border-2 border-[#ffd9b8]/30 border-t-[#ffd9b8]" />
              </span>
              <span class="relative mt-0.5 text-[10px] font-semibold uppercase tracking-[0.08em]">
                Cambio
              </span>
            </template>

            <template v-else>
              <Transition name="center-swap" mode="out-in">
                <component
                  :is="toggleIcon"
                  :key="`icon-${currentMode}`"
                  active
                  class="relative h-7 w-7"
                />
              </Transition>
              <Transition name="center-swap" mode="out-in">
                <span
                  :key="`label-${currentMode}`"
                  class="relative mt-0.5 text-[10px] font-semibold uppercase tracking-[0.08em]"
                >
                  {{ toggleLabel }}
                </span>
              </Transition>
            </template>
          </button>
        </div>

        <div
          v-for="slot in rightSlots"
          :key="slot.id"
          class="relative h-full overflow-hidden"
        >
          <Transition name="nav-item-slide">
            <NuxtLink
              :key="`${currentMode}-${slot.item.key}`"
              :to="slot.item.to"
              class="group absolute inset-0 flex flex-col items-center justify-center gap-1 rounded-2xl pb-2 transition-all duration-200 ease-out"
              :class="isVisualActiveItem(slot.item)
                ? 'text-[#ff9d52]'
                : 'text-slate-200/70 hover:text-slate-100/90'"
              :aria-current="isCurrentRouteItem(slot.item) ? 'page' : undefined"
              @click="selectItem(slot.item)"
            >
              <span
                class="relative flex h-9 w-9 items-center justify-center rounded-xl transition-all duration-200 ease-out"
                :class="isVisualActiveItem(slot.item)
                  ? 'scale-105 bg-[#ff7a18]/20 shadow-[0_0_22px_rgba(255,122,24,0.55)]'
                  : 'scale-100 bg-transparent group-hover:bg-white/5'"
              >
                <component
                  :is="slot.item.icon"
                  :active="isVisualActiveItem(slot.item)"
                  class="h-6 w-6"
                />
              </span>

              <span
                class="text-[10px] font-medium leading-none tracking-wide transition-all duration-200 ease-out"
                :class="isVisualActiveItem(slot.item) ? 'opacity-100 text-[#ffd1a9]' : 'opacity-70'"
              >
                {{ slot.item.label }}
              </span>
            </NuxtLink>
          </Transition>
        </div>
      </div>
    </div>
  </nav>
</template>

<style scoped>
.nav-item-slide-enter-active,
.nav-item-slide-leave-active {
  transition: transform 280ms cubic-bezier(0.22, 1, 0.36, 1), opacity 240ms ease;
}

.nav-item-slide-enter-from,
.nav-item-slide-leave-to {
  opacity: 0;
  transform: translateY(115%);
}

.center-swap-enter-active,
.center-swap-leave-active {
  transition: opacity 180ms ease, transform 180ms ease;
}

.center-swap-enter-from,
.center-swap-leave-to {
  opacity: 0;
  transform: scale(0.9);
}
</style>
