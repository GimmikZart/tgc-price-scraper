<script setup>
import { useElementBounding } from "@vueuse/core";
import SearchCardsIcon from "@/components/Navbar/icons/SearchCardsIcon.vue";
import CollectionIcon from "@/components/Navbar/icons/CollectionIcon.vue";
import DecksIcon from "@/components/Navbar/icons/DecksIcon.vue";
import WishlistIcon from "@/components/Navbar/icons/WishlistIcon.vue";
import SellCardsIcon from "@/components/Navbar/icons/SellCardsIcon.vue";
import TradesIcon from "@/components/Navbar/icons/TradesIcon.vue";
import ActivityIcon from "@/components/Navbar/icons/ActivityIcon.vue";
import TournamentsIcon from "@/components/Navbar/icons/TournamentsIcon.vue";
import MatchesIcon from "@/components/Navbar/icons/MatchesIcon.vue";
import StatsIcon from "@/components/Navbar/icons/StatsIcon.vue";
import MetaIcon from "@/components/Navbar/icons/MetaIcon.vue";
import SoonIcon from "@/components/Navbar/icons/SoonIcon.vue";
import ClubsIcon from "@/components/Navbar/icons/ClubsIcon.vue";
import FriendsIcon from "@/components/Navbar/icons/FriendsIcon.vue";
import ProfileIcon from "@/components/Navbar/icons/ProfileIcon.vue";
import PersonalModeIcon from "@/components/Navbar/icons/PersonalModeIcon.vue";
import MarketModeIcon from "@/components/Navbar/icons/MarketModeIcon.vue";
import PlayModeIcon from "@/components/Navbar/icons/PlayModeIcon.vue";
import SocialModeIcon from "@/components/Navbar/icons/SocialModeIcon.vue";

const SECTION_COLLECTION = "collection";
const SECTION_MARKET = "market";
const SECTION_PLAY = "play";
const SECTION_SOCIAL = "social";
const BUY_CARDS_PATH = "/community/buy-cards";
const OFFERS_PATH = "/community/offers";
const DOT_ARC_START_ANGLE = -76;
const DOT_ARC_END_ANGLE = 76;
const DOT_ARC_BASE_RADIUS = 22;
const DOT_ARC_VERTICAL_SHIFT = -6;

const nav = ref(null);
const route = useRoute();
const router = useRouter();
const globalSettings = useGlobalSettings();
const { height } = useElementBounding(nav);
const isModeSwitching = ref(false);

const navSections = [
  {
    key: SECTION_COLLECTION,
    centerLabel: "Io",
    centerIcon: PersonalModeIcon,
    items: [
      { key: "collection-search", to: "/me/cards", label: "Cerca", icon: SearchCardsIcon },
      { key: "collection-main", to: "/me/collection", label: "Collezione", icon: CollectionIcon },
      { key: "collection-decks", to: "/me/decks", label: "Deck", icon: DecksIcon },
      { key: "collection-wishlist", label: "Wishlist", icon: WishlistIcon, disabled: true },
    ],
  },
  {
    key: SECTION_MARKET,
    centerLabel: "Mercato",
    centerIcon: MarketModeIcon,
    items: [
      { key: "market-buy", to: "/community/buy-cards", label: "Compra", icon: SearchCardsIcon },
      { key: "market-sell", to: "/community/sell-cards", label: "Vendi", icon: SellCardsIcon },
      { key: "market-trades", label: "Scambi", icon: TradesIcon, disabled: true },
      { key: "market-activity", label: "Attività", icon: ActivityIcon, disabled: true },
    ],
  },
  {
    key: SECTION_PLAY,
    centerLabel: "Gioca",
    centerIcon: PlayModeIcon,
    items: [
      { key: "play-tournaments", label: "Tornei", icon: TournamentsIcon, disabled: true },
      { key: "play-matches", label: "Partite", icon: MatchesIcon, disabled: true },
      { key: "play-stats", label: "Stats", icon: StatsIcon, disabled: true },
      { key: "play-meta", label: "Meta", icon: MetaIcon, disabled: true },
    ],
  },
  {
    key: SECTION_SOCIAL,
    centerLabel: "Social",
    centerIcon: SocialModeIcon,
    items: [
      { key: "social-activity", label: "Attivita", icon: ActivityIcon, disabled: true },
      { key: "social-clubs", label: "Club", icon: ClubsIcon, disabled: true },
      { key: "social-friends", to: "/community/friends", label: "Amici", icon: FriendsIcon },
      { key: "social-profile", to: "/me/profile", label: "Profilo", icon: ProfileIcon },
    ],
  },
];

const navItemsBySection = Object.fromEntries(
  navSections.map((section) => [section.key, section.items]),
);

const isRouteMatch = (path, item) => {
  if (!item?.to || item.disabled) return false;

  if (
    item.to === BUY_CARDS_PATH
    && (path === OFFERS_PATH || path.startsWith(`${OFFERS_PATH}/`))
  ) {
    return true;
  }

  return path === item.to || path.startsWith(`${item.to}/`);
};

const findMatchBySection = (sectionKey, path) => {
  const items = navItemsBySection[sectionKey] ?? [];
  return items.find((item) => isRouteMatch(path, item));
};

const findSectionByPath = (path) => {
  return navSections.find((section) => findMatchBySection(section.key, path)) ?? null;
};

const getSectionFromPath = (path) => {
  return findSectionByPath(path)?.key ?? SECTION_COLLECTION;
};

const getFirstEnabledItem = (sectionKey) => {
  const sectionItems = navItemsBySection[sectionKey] ?? [];
  return sectionItems.find((item) => !item.disabled && !!item.to) ?? null;
};

const currentSectionKey = useState("mobile-nav-section-v2", () => getSectionFromPath(route.path));
const visualActiveItemKey = useState("mobile-nav-active-item-v2", () => {
  const detectedSectionKey = getSectionFromPath(route.path);
  const currentMatch = findMatchBySection(detectedSectionKey, route.path);
  const fallbackItem = getFirstEnabledItem(detectedSectionKey)
    ?? (navItemsBySection[detectedSectionKey] ?? [])[0]
    ?? null;
  return currentMatch?.key ?? fallbackItem?.key ?? null;
});

const currentSectionItems = computed(() => navItemsBySection[currentSectionKey.value] ?? navItemsBySection[SECTION_COLLECTION]);
const sideSlots = computed(() => [
  { id: "left-0", item: currentSectionItems.value[0] },
  { id: "left-1", item: currentSectionItems.value[1] },
  { id: "right-0", item: currentSectionItems.value[2] },
  { id: "right-1", item: currentSectionItems.value[3] },
]);
const leftSlots = computed(() => sideSlots.value.slice(0, 2));
const rightSlots = computed(() => sideSlots.value.slice(2));

const currentSectionIndex = computed(() => {
  return navSections.findIndex((section) => section.key === currentSectionKey.value);
});

const currentSection = computed(() => {
  return navSections.find((section) => section.key === currentSectionKey.value) ?? navSections[0];
});

const normalizedCurrentSectionIndex = computed(() => {
  return currentSectionIndex.value >= 0 ? currentSectionIndex.value : 0;
});

const toggleTargetSection = computed(() => {
  const sourceIndex = currentSectionIndex.value >= 0 ? currentSectionIndex.value : 0;
  const targetIndex = (sourceIndex + 1) % navSections.length;
  return navSections[targetIndex];
});

const toggleLabel = computed(() => currentSection.value.centerLabel);
const toggleIcon = computed(() => currentSection.value.centerIcon);

const centerLabelTextClass = computed(() => {
  const labelLength = toggleLabel.value?.length ?? 0;

  if (labelLength >= 10) {
    return "text-[7px] tracking-[0.02em]";
  }
  if (labelLength >= 8) {
    return "text-[7.5px] tracking-[0.03em]";
  }
  return "text-[8.5px] tracking-[0.05em]";
});

function getSectionDotStyle(index, total) {
  const safeTotal = Math.max(total, 1);
  const radius = DOT_ARC_BASE_RADIUS;

  if (safeTotal === 1) {
    return {
      transform: `translate(0px, ${-radius + DOT_ARC_VERTICAL_SHIFT}px)`,
    };
  }

  const progress = index / (safeTotal - 1);
  const angle = DOT_ARC_START_ANGLE + (DOT_ARC_END_ANGLE - DOT_ARC_START_ANGLE) * progress;
  const radians = (angle * Math.PI) / 180;
  const x = Math.sin(radians) * radius;
  const y = -Math.cos(radians) * radius + DOT_ARC_VERTICAL_SHIFT;

  return {
    transform: `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px)`,
  };
}

const isVisualActiveItem = (item) => {
  if (!item || item.disabled) return false;
  return visualActiveItemKey.value === item.key;
};

const activeItemIndex = computed(() => {
  return currentSectionItems.value.findIndex((item) => item.key === visualActiveItemKey.value);
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
  if (!item || item.disabled || !item.to) return;
  visualActiveItemKey.value = item.key;
};

const toggleMode = async () => {
  if (isModeSwitching.value) return;

  const nextSection = toggleTargetSection.value;
  const nextSectionFirstItem = getFirstEnabledItem(nextSection.key) ?? nextSection.items[0];

  isModeSwitching.value = true;
  currentSectionKey.value = nextSection.key;
  visualActiveItemKey.value = nextSectionFirstItem?.key ?? null;

  try {
    if (nextSectionFirstItem?.to && !isRouteMatch(route.path, nextSectionFirstItem)) {
      await router.push(nextSectionFirstItem.to);
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
    const routeSection = findSectionByPath(path);
    if (!routeSection) return;

    currentSectionKey.value = routeSection.key;

    const modeAwareMatch = findMatchBySection(routeSection.key, path);
    if (modeAwareMatch) {
      visualActiveItemKey.value = modeAwareMatch.key;
    }
  },
  { immediate: true },
);

watch(currentSectionKey, (sectionKey) => {
  const visibleItems = navItemsBySection[sectionKey] ?? [];
  const hasVisibleActiveItem = visibleItems.some((item) => item.key === visualActiveItemKey.value);
  if (hasVisibleActiveItem) return;

  const fallbackItem = getFirstEnabledItem(sectionKey) ?? visibleItems[0] ?? null;
  visualActiveItemKey.value = fallbackItem?.key ?? null;
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
        <div class="pointer-events-none absolute bottom-2 left-2 right-2">
          <div
            class="w-1/5 transition-transform duration-300 ease-out"
            :style="{ transform: `translateX(${activeColumnIndex * 100}%)` }"
          >
            <div class="mx-auto h-[3px] w-8 rounded-full bg-[#ff7a18]" />
          </div>
        </div>

        <div
          v-for="slot in leftSlots"
          :key="slot.id"
          class="relative h-full overflow-hidden"
        >
          <Transition name="nav-item-slide">
            <button
              v-if="slot.item.disabled"
              :key="`${currentSectionKey}-${slot.item.key}`"
              type="button"
              class="group absolute inset-0 flex flex-col items-center justify-center gap-1 rounded-2xl pb-2 text-slate-500/70 transition-all duration-200 ease-out"
              disabled
              aria-disabled="true"
            >
              <span
                class="relative flex h-9 w-9 items-center justify-center rounded-xl transition-all duration-200 ease-out"
              >
                <component
                  :is="slot.item.icon"
                  :active="false"
                  class="h-6 w-6"
                />
              </span>

              <span class="text-[10px] font-medium leading-none tracking-wide opacity-70">
                {{ slot.item.label }}
              </span>
            </button>

            <NuxtLink
              v-else
              :key="`${currentSectionKey}-${slot.item.key}`"
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
                  ? 'scale-105'
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
            class="mode-toggle-button group relative flex h-[66px] w-[66px] flex-col items-center justify-center rounded-full border border-[#ff7a18] bg-slate-900 text-[#ffd1a9] transition-all duration-200 ease-out hover:scale-[1.03] hover:border-[#ff7a18] disabled:cursor-wait disabled:opacity-95"
            :disabled="isModeSwitching"
            @click="toggleMode"
          >
            <span class="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-b from-[#ff9d52]/28 to-[#ff7a18]/10" />
            <div class="mode-dots" aria-hidden="true">
              <span
                v-for="(section, index) in navSections"
                :key="`mode-dot-${section.key}`"
                class="mode-dot"
                :class="{ 'mode-dot--active': index === normalizedCurrentSectionIndex }"
                :style="getSectionDotStyle(index, navSections.length)"
              />
            </div>
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
                  :key="`icon-${currentSectionKey}`"
                  active
                  class="relative h-7 w-7"
                />
              </Transition>
              <Transition name="center-swap" mode="out-in">
                <span
                  :key="`label-${currentSectionKey}`"
                  class="relative mt-0.5 whitespace-nowrap text-center font-semibold uppercase leading-[1]"
                  :class="centerLabelTextClass"
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
            <button
              v-if="slot.item.disabled"
              :key="`${currentSectionKey}-${slot.item.key}`"
              type="button"
              class="group absolute inset-0 flex flex-col items-center justify-center gap-1 rounded-2xl pb-2 text-slate-500/70 transition-all duration-200 ease-out"
              disabled
              aria-disabled="true"
            >
              <span
                class="relative flex h-9 w-9 items-center justify-center rounded-xl transition-all duration-200 ease-out"
              >
                <component
                  :is="slot.item.icon"
                  :active="false"
                  class="h-6 w-6"
                />
              </span>

              <span class="text-[10px] font-medium leading-none tracking-wide opacity-70">
                {{ slot.item.label }}
              </span>
            </button>

            <NuxtLink
              v-else
              :key="`${currentSectionKey}-${slot.item.key}`"
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
                  ? 'scale-105'
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

.mode-toggle-button {
  box-shadow: 0 0 0 0.2rem #ff7a18;
}

.mode-toggle-button:hover {
  box-shadow: 0 0 0 0.24rem #ff7a18;
}

.mode-dots {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 2;
}

.mode-dot {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 6px;
  height: 6px;
  margin-left: -3px;
  margin-top: -3px;
  border-radius: 9999px;
  border: 1px solid rgba(255, 178, 125, 0.82);
  background: rgba(15, 23, 42, 0.75);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.12);
}

.mode-dot--active {
  border-color: rgba(255, 157, 82, 0.95);
  background: rgba(255, 122, 24, 0.9);
  box-shadow: 0 0 10px rgba(255, 122, 24, 0.45);
}
</style>
