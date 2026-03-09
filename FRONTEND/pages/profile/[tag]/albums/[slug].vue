<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from "vue";
import { getPublicAlbumByUserTagAndSlug } from "@/api/album";

const route = useRoute();
const router = useRouter();
const snackbar = useSnackbar();
const gs = useGlobalSettings();

const profileTagSlug = computed(() => {
  const value = route.params?.tag;
  if (Array.isArray(value)) return String(value[0] ?? "");
  return typeof value === "string" ? value : "";
});
const albumSlug = computed(() => {
  const value = route.params?.slug;
  if (Array.isArray(value)) return String(value[0] ?? "");
  return typeof value === "string" ? value : "";
});

const { allCards } = await useOnePieceCards();
const album = ref(null);
const pending = ref(false);
const error = ref(null);

const itemsPerPage = 10;
const rawPage = route.query.page ? parseInt(route.query.page, 10) : null;
const rawFocus = route.query.focus ? parseInt(route.query.focus, 10) : null;

const qPage = ref(Number.isFinite(rawPage) && rawPage > 0
  ? rawPage
  : (Number.isFinite(rawFocus) && rawFocus >= 0
      ? Math.floor(rawFocus / itemsPerPage) + 1
      : 1)
);
const qFocus = ref(Number.isFinite(rawFocus) ? rawFocus : null);

const albumSlotsWithCards = computed(() => {
  const totalSlots = album.value?.slots ?? 0;
  const cardAlbumEntries = album.value?.card_album ?? [];
  if (totalSlots === 0 || !allCards.length) return [];

  const cardMap = new Map();
  cardAlbumEntries.forEach((entry) => {
    if (typeof entry.index === "number" && entry.collection?.card_id) {
      cardMap.set(entry.index, entry.collection.card_id);
    }
  });

  const slots = [];
  for (let i = 0; i < totalSlots; i++) {
    const cardId = cardMap.get(i);
    const found = allCards.find((card) => card.id === cardId);
    slots.push({ index: i, card: found || null });
  }
  return slots;
});

const totalPages = computed(() => {
  return Math.max(1, Math.ceil(albumSlotsWithCards.value.length / itemsPerPage));
});

watch(
  totalPages,
  (maxPage) => {
    if (qPage.value > maxPage) {
      qPage.value = maxPage;
    }
  },
  { immediate: true },
);

const paginatedCards = computed(() => {
  const start = (qPage.value - 1) * itemsPerPage;
  return albumSlotsWithCards.value.slice(start, start + itemsPerPage);
});

const paginatedCardFormatted = computed(() => {
  return paginatedCards.value.map((slot) => slot.card).filter((card) => card !== null);
});

const { show: viewerOpen, index: viewerIndex, open: openViewer } = useCardViewer(paginatedCardFormatted);

function goToProfile() {
  if (!profileTagSlug.value) return;
  router.push(`/profile/${encodeURIComponent(profileTagSlug.value)}`);
}

async function loadPublicAlbum() {
  if (!profileTagSlug.value || !albumSlug.value) return;

  pending.value = true;
  error.value = null;
  album.value = null;

  try {
    const publicAlbum = await getPublicAlbumByUserTagAndSlug(profileTagSlug.value, albumSlug.value);

    if (!publicAlbum) {
      snackbar.addMessage("Album non disponibile", "error");
      goToProfile();
      return;
    }

    album.value = publicAlbum;
  } catch (loadError) {
    error.value = loadError;
    snackbar.addMessage(loadError?.message || "Errore caricamento album", "error");
    goToProfile();
  } finally {
    pending.value = false;
  }
}

function getScrollRoot(startEl) {
  let el = startEl?.parentElement || document.body;
  const isScrollable = (node) => {
    const style = window.getComputedStyle(node);
    const overflowY = style.overflowY;
    return (overflowY === "auto" || overflowY === "scroll") && node.scrollHeight > node.clientHeight;
  };
  while (el && el !== document.body && el !== document.documentElement) {
    if (isScrollable(el)) return el;
    el = el.parentElement;
  }
  return window;
}

function getOffsetTopRelativeToRoot(el, root) {
  const elementRect = el.getBoundingClientRect();

  if (root === window) {
    return elementRect.top + window.scrollY;
  }

  const rootRect = root.getBoundingClientRect();
  return (elementRect.top - rootRect.top) + root.scrollTop;
}

function scrollRootToEl(el, headerOffsetPx = 0) {
  const root = getScrollRoot(el);
  const targetY = Math.max(0, getOffsetTopRelativeToRoot(el, root) - headerOffsetPx);

  if (root === window) {
    window.scrollTo({ top: targetY, behavior: "smooth" });
    return;
  }

  root.scrollTo({ top: targetY, behavior: "smooth" });
}

async function waitForElReady(id, tries = 40, delayMs = 50) {
  for (let i = 0; i < tries; i++) {
    await nextTick();
    const el = document.getElementById(id);
    if (el && el.offsetHeight > 0 && el.offsetWidth > 0) {
      return el;
    }
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  return null;
}

async function scrollToFocusIfPresent() {
  if (qFocus.value == null) return;

  const el = await waitForElReady(`slot-${qFocus.value}`);
  if (!el) return;

  const HEADER_OFFSET = 100;
  scrollRootToEl(el, HEADER_OFFSET);
}

watch(
  () => [qPage.value, qFocus.value],
  () => { scrollToFocusIfPresent(); },
);

watch([profileTagSlug, albumSlug], () => {
  loadPublicAlbum();
}, { immediate: true });

onMounted(() => {
  gs.paginationHeight = 0;
  setTimeout(() => { scrollToFocusIfPresent(); }, 0);
  if (qFocus.value != null) {
    setTimeout(() => {
      qFocus.value = null;
      const newQuery = { ...route.query };
      delete newQuery.page;
      delete newQuery.focus;
      router.replace({ query: newQuery });
    }, 2000);
  }
});

onBeforeUnmount(() => {
  gs.paginationHeight = 0;
});

definePageMeta({ middleware: "auth" });
</script>


<template>
  <section class="h-full flex flex-col pb-[88px]">
    <Toolbar backButton :label="album?.name ?? 'Album'" />

    <v-container
      class="bg-stitched mt-4 pb-1 px-1 h-full pa-0 grid grid-cols-2 gap-1 border-l-8 border-blue-900"
    >
      <div
        v-if="pending"
        class="col-span-2 flex items-center justify-center p-6 text-sm text-white/60"
      >
        Caricamento album...
      </div>
      <div
        v-else-if="error"
        class="col-span-2 flex items-center justify-center p-6 text-sm text-red-300"
      >
        {{ error.message || "Errore durante il caricamento dell'album." }}
      </div>
      <template v-else>
        <div
          v-for="(slot, idx) in paginatedCards"
          :key="idx"
          :id="'slot-' + slot.index"
          class="w-full relative flex items-end pa-1 bg-black aspect-[5/7] border-[1px] border-white/20"
        >
          <template v-if="slot.card">
            <Card
              :key="slot.index"
              :card="slot.card"
              :class="qFocus === slot.index ? 'slide-in-slot' : ''"
              @open="openViewer"
              class="w-full h-auto z-[1]"
            />
          </template>

          <div
            v-else
            class="w-full h-full flex items-center justify-center text-xs text-white/30"
          >
            Slot {{ slot.index + 1 }}
          </div>
          <div
            class="absolute opacity-20 plastic-card w-full h-full bottom-0 left-0 z-[0]"
          ></div>
          <div
            class="absolute opacity-20 plastic-card w-full h-[90%] bottom-0 left-0 z-[1]"
          ></div>
        </div>
      </template>
    </v-container>
    <MobileFloatMenu :cols="1" class="z-30">
      <template #buttons>
        <MobilePaginationControl
          :page="qPage"
          :total-pages="totalPages"
          @update:page="qPage = $event"
        />
      </template>
    </MobileFloatMenu>

    <FullscreenCardViewer
      v-model:show="viewerOpen"
      v-model:index="viewerIndex"
      :cards="paginatedCardFormatted"
      @close="viewerOpen = false"
    />
  </section>
</template>
<style>
.bg-stitched {
  background-image: repeating-linear-gradient(
      to right,
      #2d2d2d,
      #2d2d2d 1px,
      transparent 1px,
      transparent 4px
    ),
    repeating-linear-gradient(
      to bottom,
      #2d2d2d,
      #2d2d2d 1px,
      transparent 1px,
      transparent 4px
    );
  background-size: 100% 100%;
}

.plastic-card {
  pointer-events: none;
  background-color: #1f1f1f;
  background-image: url("@/public/assets/images/sleeve-effect-1.png");
  background-size: cover;
  box-shadow: inset 0 0 4px rgba(255, 255, 255, 0.1),
    0 1px 4px rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(1px);
}

.slide-in-slot {
  animation: slide-in-slot 1.5s ease-out;
}

@keyframes slide-in-slot {
  0% {
    transform: translateY(-100%);
  }
  30% {
    transform: translateY(-30%);
  }
  100% {
    transform: translateY(0);
  }
}
</style>
