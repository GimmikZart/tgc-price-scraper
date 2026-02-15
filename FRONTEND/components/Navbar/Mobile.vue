<script setup>
import { useElementBounding } from "@vueuse/core";
import CardsIcon from "@/components/Navbar/icons/CardsIcon.vue";
import CollectionIcon from "@/components/Navbar/icons/CollectionIcon.vue";
import DecksIcon from "@/components/Navbar/icons/DecksIcon.vue";
import ProfileIcon from "@/components/Navbar/icons/ProfileIcon.vue";

const nav = ref(null);
const route = useRoute();
const globalSettings = useGlobalSettings();
const { height } = useElementBounding(nav);

const navItems = [
  { to: "/cards", label: "Carte", icon: CardsIcon },
  { to: "/collection", label: "Collezione", icon: CollectionIcon },
  { to: "/decks", label: "Mazzi", icon: DecksIcon },
  { to: "/user", label: "Profilo", icon: ProfileIcon },
];

const getRouteItemIndex = (path) => {
  return navItems.findIndex((item) => path === item.to || path.startsWith(`${item.to}/`));
};

const routeItemIndex = computed(() => getRouteItemIndex(route.path));
const visualItemIndex = useState("mobile-nav-visual-item-index", () => {
  const initialIndex = getRouteItemIndex(route.path);
  return initialIndex >= 0 ? initialIndex : 0;
});

const isActiveItem = (index) => visualItemIndex.value === index;
const moveGlowToItem = (index) => {
  visualItemIndex.value = index;
};

watch(
  height,
  (newHeight) => {
    globalSettings.navbarHeight = newHeight;
  },
  { immediate: true },
);

watch(
  routeItemIndex,
  (newIndex) => {
    if (newIndex >= 0) {
      visualItemIndex.value = newIndex;
    }
  },
  { immediate: true },
);
</script>

<template>
  <nav
    ref="nav"
    class="fixed inset-x-0 bottom-0 z-[1000] flex justify-center"
  >
    <div
      class="w-full max-w-[520px] border border-white/15 bg-slate-950/70 shadow-[0_22px_48px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.16)] backdrop-blur-2xl"
    >
      <div class="relative grid h-[72px] grid-cols-4 px-2 py-2">
        <div class="pointer-events-none absolute inset-y-2 left-2 right-2">
          <div
            class="h-full w-1/4 rounded-2xl bg-[#ff7a18]/10 shadow-[0_0_24px_rgba(255,122,24,0.42),inset_0_0_0_1px_rgba(255,183,124,0.2)] transition-transform duration-300 ease-out"
            :style="{ transform: `translateX(${visualItemIndex * 100}%)` }"
          />
        </div>

        <NuxtLink
          v-for="(item, index) in navItems"
          :key="item.to"
          :to="item.to"
          class="group relative flex flex-col items-center justify-center gap-1 rounded-2xl transition-all duration-200 ease-out pb-2"
          :class="isActiveItem(index) ? 'text-[#ff9d52]' : 'text-slate-200/70 hover:text-slate-100/90'"
          :aria-current="routeItemIndex === index ? 'page' : undefined"
          @click="moveGlowToItem(index)"
        >
          <span
            class="relative flex h-9 w-9 items-center justify-center rounded-xl transition-all duration-200 ease-out"
            :class="isActiveItem(index)
              ? 'scale-105 bg-[#ff7a18]/20 shadow-[0_0_22px_rgba(255,122,24,0.55)]'
              : 'scale-100 bg-transparent group-hover:bg-white/5'"
          >
            <component
              :is="item.icon"
              :active="isActiveItem(index)"
              class="h-6 w-6"
            />
          </span>

          <span
            class="text-[11px] font-medium leading-none tracking-wide transition-all duration-200 ease-out"
            :class="isActiveItem(index) ? 'opacity-100 text-[#ffd1a9]' : 'opacity-70'"
          >
            {{ item.label }}
          </span>
        </NuxtLink>
      </div>
    </div>
  </nav>
</template>
