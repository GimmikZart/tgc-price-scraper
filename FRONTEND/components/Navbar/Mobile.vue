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
import FriendsIcon from "@/components/Navbar/icons/FriendsIcon.vue";
import ProfileIcon from "@/components/Navbar/icons/ProfileIcon.vue";
import MarketModeIcon from "@/components/Navbar/icons/MarketModeIcon.vue";
import PlayModeIcon from "@/components/Navbar/icons/PlayModeIcon.vue";

const SECTION_COLLECTION = "collection";
const SECTION_MARKET = "market";
const SECTION_PLAY = "play";
const SECTION_PROFILE = "profile";
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
const isSectionNavigating = ref(false);
const isSectionMenuOpen = ref(false);

const navSections = [
  {
    key: SECTION_COLLECTION,
    centerLabel: "Collezione",
    centerIcon: CollectionIcon,
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
      { key: "market-activity", to: "/community/activity", label: "Attivita", icon: ActivityIcon },
    ],
  },
  {
    key: SECTION_PLAY,
    centerLabel: "Gioca",
    centerIcon: PlayModeIcon,
    items: [
      { key: "play-tournaments", to: "/play/tournaments", label: "Tornei", icon: TournamentsIcon },
      { key: "play-matches", to: "/play/matches", label: "Partite", icon: MatchesIcon },
      { key: "play-stats", label: "Stats", icon: StatsIcon, disabled: true },
      { key: "play-meta", label: "Meta", icon: MetaIcon, disabled: true },
    ],
  },
  {
    key: SECTION_PROFILE,
    centerLabel: "Profilo",
    centerIcon: ProfileIcon,
    items: [
      { key: "profile-dashboard", label: "Dashboard", icon: StatsIcon, disabled: true },
      { key: "profile-main", to: "/me/profile", label: "Profilo", icon: ProfileIcon },
      { key: "profile-friends", to: "/community/friends", label: "Amici", icon: FriendsIcon },
      { key: "profile-notifications", label: "Notifiche", icon: ActivityIcon, disabled: true },
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

const getItemByKey = (sectionKey, itemKey) => {
  const items = navItemsBySection[sectionKey] ?? [];
  return items.find((item) => item.key === itemKey) ?? null;
};

const getFirstEnabledItem = (sectionKey) => {
  const sectionItems = navItemsBySection[sectionKey] ?? [];
  return sectionItems.find((item) => !item.disabled && !!item.to) ?? null;
};

const getFallbackItem = (sectionKey) => {
  return getFirstEnabledItem(sectionKey)
    ?? (navItemsBySection[sectionKey] ?? [])[0]
    ?? null;
};

const currentSectionKey = useState("mobile-nav-section-v3", () => getSectionFromPath(route.path));
const visualActiveItemKey = useState("mobile-nav-active-item-v3", () => {
  const detectedSectionKey = getSectionFromPath(route.path);
  const currentMatch = findMatchBySection(detectedSectionKey, route.path);
  const fallbackItem = getFallbackItem(detectedSectionKey);
  return currentMatch?.key ?? fallbackItem?.key ?? null;
});
const lastVisitedItemKeyBySection = useState("mobile-nav-last-section-items-v2", () =>
  Object.fromEntries(
    navSections.map((section) => [section.key, getFallbackItem(section.key)?.key ?? null]),
  ),
);

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

const toggleLabel = computed(() => currentSection.value.centerLabel);
const toggleIcon = computed(() => currentSection.value.centerIcon);
const centerButtonAriaLabel = computed(() => {
  return isSectionMenuOpen.value ? "Chiudi menu sezioni" : "Apri menu sezioni";
});
const sectionMenuBackdropBottom = computed(() => Math.max(globalSettings.navbarHeight + 1, 0));
const sectionMenuPanelBottom = computed(() => Math.max(globalSettings.navbarHeight + 20, 0));

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

const sectionMenuEntries = computed(() => {
  return navSections.map((section) => ({
    ...section,
    isCurrent: section.key === currentSectionKey.value,
    targetItem: getSectionTargetItem(section.key),
  }));
});

function rememberSectionItem(sectionKey, itemKey) {
  if (!sectionKey || !itemKey) return;
  if (lastVisitedItemKeyBySection.value?.[sectionKey] === itemKey) return;

  lastVisitedItemKeyBySection.value = {
    ...lastVisitedItemKeyBySection.value,
    [sectionKey]: itemKey,
  };
}

function getSectionTargetItem(sectionKey) {
  const rememberedItemKey = lastVisitedItemKeyBySection.value?.[sectionKey];
  const rememberedItem = getItemByKey(sectionKey, rememberedItemKey);

  if (rememberedItem && !rememberedItem.disabled && rememberedItem.to) {
    return rememberedItem;
  }

  return getFallbackItem(sectionKey);
}

function closeSectionMenu() {
  isSectionMenuOpen.value = false;
}

function toggleSectionMenu() {
  if (isSectionNavigating.value) return;
  isSectionMenuOpen.value = !isSectionMenuOpen.value;
}

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
  rememberSectionItem(currentSectionKey.value, item.key);
  closeSectionMenu();
};

const selectSection = async (section) => {
  if (!section || isSectionNavigating.value) return;

  const targetItem = getSectionTargetItem(section.key);

  closeSectionMenu();

  if (!targetItem?.to) return;

  currentSectionKey.value = section.key;
  visualActiveItemKey.value = targetItem.key;
  rememberSectionItem(section.key, targetItem.key);

  if (isRouteMatch(route.path, targetItem)) return;

  isSectionNavigating.value = true;

  try {
    await router.push(targetItem.to);
  } finally {
    isSectionNavigating.value = false;
  }
};

function handleWindowKeydown(event) {
  if (event.key !== "Escape") return;
  closeSectionMenu();
}

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
    closeSectionMenu();

    const routeSection = findSectionByPath(path);
    if (!routeSection) return;

    currentSectionKey.value = routeSection.key;

    const modeAwareMatch = findMatchBySection(routeSection.key, path);
    if (modeAwareMatch) {
      visualActiveItemKey.value = modeAwareMatch.key;
      rememberSectionItem(routeSection.key, modeAwareMatch.key);
      return;
    }

    const fallbackItem = getFallbackItem(routeSection.key);
    visualActiveItemKey.value = fallbackItem?.key ?? null;
    rememberSectionItem(routeSection.key, fallbackItem?.key ?? null);
  },
  { immediate: true },
);

watch(currentSectionKey, (sectionKey) => {
  const visibleItems = navItemsBySection[sectionKey] ?? [];
  const hasVisibleActiveItem = visibleItems.some((item) => item.key === visualActiveItemKey.value);
  if (hasVisibleActiveItem) return;

  const fallbackItem = getSectionTargetItem(sectionKey) ?? visibleItems[0] ?? null;
  visualActiveItemKey.value = fallbackItem?.key ?? null;
  rememberSectionItem(sectionKey, fallbackItem?.key ?? null);
});

onMounted(() => {
  window.addEventListener("keydown", handleWindowKeydown);
});

onBeforeUnmount(() => {
  window.removeEventListener("keydown", handleWindowKeydown);
});
</script>

<template>
  <div>
    <Transition name="section-menu-backdrop">
      <button
        v-if="isSectionMenuOpen"
        type="button"
        class="fixed inset-x-0 top-0 z-[1005] bg-[rgba(3,6,13,0.52)] backdrop-blur-[12px]"
        :style="{ bottom: `${sectionMenuBackdropBottom}px` }"
        aria-label="Chiudi menu sezioni"
        @click="closeSectionMenu"
      ></button>
    </Transition>

    <div
      class="pointer-events-none fixed inset-x-0 z-[1015] flex justify-center px-3"
      :style="{ bottom: `${sectionMenuPanelBottom}px` }"
    >
      <Transition name="section-menu-panel">
        <div
          v-if="isSectionMenuOpen"
          role="menu"
          aria-label="Sezioni app"
          class="pointer-events-auto w-full max-w-[340px] rounded-[30px] border border-white/12 bg-[rgba(9,15,28,0.92)] p-2 shadow-[0_28px_65px_rgba(0,0,0,0.62),inset_0_1px_0_rgba(255,255,255,0.14)] backdrop-blur-2xl"
          @click.stop
        >
          <div class="grid gap-2">
            <button
              v-for="section in sectionMenuEntries"
              :key="`section-menu-${section.key}`"
              type="button"
              role="menuitem"
              class="group flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-all duration-200 ease-out disabled:cursor-not-allowed disabled:opacity-45"
              :class="section.isCurrent
                ? 'border-[#ff9d52]/45 bg-[linear-gradient(135deg,rgba(255,122,24,0.24),rgba(255,122,24,0.08))] text-[#fff1e4] shadow-[0_16px_30px_rgba(255,122,24,0.16)]'
                : 'border-white/10 bg-white/[0.03] text-slate-200/85 hover:border-white/20 hover:bg-white/[0.05] hover:text-white'"
              :disabled="isSectionNavigating || !section.targetItem?.to"
              @click="selectSection(section)"
            >
              <span
                class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-slate-950/65 transition-all duration-200 ease-out"
                :class="section.isCurrent
                  ? 'text-[#ffb27d] shadow-[0_0_24px_rgba(255,122,24,0.24)]'
                  : 'text-slate-300/85 group-hover:text-[#ffd1a9]'"
              >
                <component
                  :is="section.centerIcon"
                  active
                  class="h-6 w-6"
                />
              </span>

              <span class="min-w-0 flex-1">
                <span class="block truncate text-[13px] font-semibold uppercase tracking-[0.14em]">
                  {{ section.centerLabel }}
                </span>
              </span>

              <span
                class="inline-flex min-w-[62px] items-center justify-center rounded-full border px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.16em] transition-colors duration-200"
                :class="section.isCurrent
                  ? 'border-[#ffb27d]/35 bg-[#ff7a18]/14 text-[#ffd7b6]'
                  : 'border-white/10 bg-black/20 text-slate-400/80 group-hover:border-white/20 group-hover:text-slate-200/85'"
              >
                {{ section.isCurrent ? "Attuale" : "Apri" }}
              </span>
            </button>
          </div>
        </div>
      </Transition>
    </div>

    <nav
      ref="nav"
      class="fixed inset-x-0 bottom-0 z-[1010] flex justify-center pb-[max(env(safe-area-inset-bottom),0px)]"
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
              :class="{ 'mode-toggle-button--open': isSectionMenuOpen }"
              :disabled="isSectionNavigating"
              :aria-expanded="isSectionMenuOpen"
              aria-haspopup="menu"
              :aria-label="centerButtonAriaLabel"
              @click="toggleSectionMenu"
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
  </div>
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

.section-menu-backdrop-enter-active,
.section-menu-backdrop-leave-active {
  transition: opacity 220ms ease;
}

.section-menu-backdrop-enter-from,
.section-menu-backdrop-leave-to {
  opacity: 0;
}

.section-menu-panel-enter-active,
.section-menu-panel-leave-active {
  transition: opacity 240ms ease, transform 280ms cubic-bezier(0.22, 1, 0.36, 1);
}

.section-menu-panel-enter-from,
.section-menu-panel-leave-to {
  opacity: 0;
  transform: translateY(20px) scale(0.96);
}

.mode-toggle-button {
  box-shadow: 0 0 0 0.2rem #ff7a18;
}

.mode-toggle-button:hover {
  box-shadow: 0 0 0 0.24rem #ff7a18;
}

.mode-toggle-button--open {
  transform: translateY(-2px) scale(1.02);
  box-shadow: 0 0 0 0.24rem rgba(255, 157, 82, 0.95), 0 16px 34px rgba(255, 122, 24, 0.3);
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
