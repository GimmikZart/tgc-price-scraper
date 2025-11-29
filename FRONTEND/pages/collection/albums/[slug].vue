<script setup>
import { ref, computed, onMounted, watch, nextTick } from "vue";
import { useRoute } from "vue-router";
import { getAlbum, removeCardFromAlbum, addPage } from "@/api/album";
import { Icon } from "@iconify/vue";

const route = useRoute();
const router = useRouter();
const gs = useGlobalSettings();

const slug = route.params.slug;
const paginatedCards = ref([]);
const { allCards } = await useOnePieceCards();

const editMode = ref(false);

// --- parametri da query
const itemsPerPage = 10; // deve combaciare con CardViewPagination
const rawPage  = route.query.page ? parseInt(route.query.page) : null;
const rawFocus = route.query.focus ? parseInt(route.query.focus) : null;

// pagina iniziale: se manca `page`, la ricavo da `focus`
const qPage  = ref(Number.isFinite(rawPage) && rawPage > 0
  ? rawPage
  : (Number.isFinite(rawFocus) && rawFocus >= 0
      ? Math.floor(rawFocus / itemsPerPage) + 1
      : 1)
);
const qFocus = ref(Number.isFinite(rawFocus) ? rawFocus : null);

const paginatedCardFormatted = computed(() => {
  return paginatedCards.value.map((slot) => slot.card).filter((c) => c !== null);
});

const { show: viewerOpen, index: viewerIndex, open: openViewer } = useCardViewer(paginatedCardFormatted);

const { data: album, error, refresh: refreshAlbum, pending } =
  await useAsyncData(`album-${slug}`, () => getAlbum(slug));

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

function handlePaginatedUpdate(newPaginated) {
  paginatedCards.value = newPaginated;
}

async function removeCard(idx) {
  await removeCardFromAlbum(album.value, idx);
  refreshAlbum();
}

function goToSelectCard(idx) {
  router.push({
    path: "/collection",
    query: { album: album.value.slug, index: idx },
  });
}

/* ===== SCROLL UTILS ROBUSTE ===== */

// trova il primo ancestor scrollabile; se non c'è, usa window
function getScrollRoot(startEl) {
  let el = startEl?.parentElement || document.body;
  const isScrollable = (node) => {
    const s = window.getComputedStyle(node);
    const oy = s.overflowY;
    return (oy === "auto" || oy === "scroll") && node.scrollHeight > node.clientHeight;
  };
  while (el && el !== document.body && el !== document.documentElement) {
    if (isScrollable(el)) return el;
    el = el.parentElement;
  }
  return window; // fallback
}

// top dell'elemento relativo al suo scrollRoot
function getOffsetTopRelativeToRoot(el, root) {
  const elRect = el.getBoundingClientRect();

  if (root === window) {
    return elRect.top + window.scrollY;
  } else {
    const rootRect = root.getBoundingClientRect();
    return (elRect.top - rootRect.top) + root.scrollTop;
  }
}

// scroll “vero” sul root corretto (con eventuale offset header se serve)
function scrollRootToEl(el, headerOffsetPx = 0) {
  const root = getScrollRoot(el);
  const targetY = Math.max(0, getOffsetTopRelativeToRoot(el, root) - headerOffsetPx);

  if (root === window) {
    window.scrollTo({ top: targetY, behavior: "smooth" });
  } else {
    root.scrollTo({ top: targetY, behavior: "smooth" });
  }
}

// attende che l’elemento esista e sia “rendered” (ha dimensioni)
async function waitForElReady(id, tries = 40, delayMs = 50) {
  for (let i = 0; i < tries; i++) {
    await nextTick();
    const el = document.getElementById(id);
    if (el && el.offsetHeight > 0 && el.offsetWidth > 0) {
      return el;
    }
    await new Promise((r) => setTimeout(r, delayMs));
  }
  return null;
}

async function scrollToFocusIfPresent() {
  if (qFocus.value == null) return;

  // aspetta che il DOM della pagina corrente sia pronto
  const el = await waitForElReady(`slot-${qFocus.value}`);
  if (!el) return;

  // se hai una navbar fissa in alto, metti la sua altezza qui (px)
  const HEADER_OFFSET = 100;
  scrollRootToEl(el, HEADER_OFFSET);
}

async function addNewPage() {
  await addPage(album.value);
  refreshAlbum();

}

/* ===== TRIGGER SCROLL =====
   Scatena lo scroll quando:
   - cambia il buffer paginato (nuova pagina)
   - cambia il focus
*/
watch(
  () => [paginatedCards.value.length, qFocus.value],
  () => { scrollToFocusIfPresent(); }
);

// tentativo extra subito dopo il mount (nel caso arrivi già tutto pronto)
onMounted(() => {
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

definePageMeta({ middleware: "auth" });
</script>


<template>
  <section class="h-full flex flex-col pb-[120px]">
    <Toolbar backButton :label="`${album.name}`">
    </Toolbar>

    <v-container
      class="bg-stitched mt-4 pb-1 px-1 h-full pa-0 grid grid-cols-2 gap-1 border-l-8 border-blue-900"
    >
      <div
        v-for="(slot, idx) in paginatedCards"
        :key="idx"
        :id="'slot-' + slot.index"
        class="w-full relative flex items-end pa-1 bg-black aspect-[5/7] border-[1px] border-white/20"
      >
        <template v-if="slot.card">
          <Card :key="slot.id" :card="slot.card" :class="qFocus === slot.index ? 'slide-in-slot' : ''" @open="openViewer(slot.card)" class="w-full h-auto z-[1]" />
          <div
            v-if="gs.albumIsHandling"
            :class="{'remove-button-appear' : qFocus === slot.index}"
            class="absolute left-0 bottom-0 bg-black/80 h-[90%] w-full flex flex-col items-center justify-center z-[2]"
          >
            <div
            class="flex flex-col items-center"
              @click="removeCard(slot.index)"
            >
              <Icon icon="fluent:square-hint-arrow-back-16-filled" class="text-4xl text-red"></Icon>
              <span class="text-xs text-red">Rimuovi da album</span>
            </div>
          </div>
        </template>

        <div
          v-else-if="gs.albumIsHandling"
          class="w-full h-full flex flex-col items-center justify-center"
        >
          <h3 class="text-lg font-semibold mb-2">Slot {{ slot.index + 1 }}</h3>
          <v-btn
            variant="text"
            icon
            class="text-white"
            @click="goToSelectCard(slot.index)"
          >
            <Icon icon="heroicons:plus-16-solid" class="text-5xl"></Icon>
          </v-btn>
        </div>
        <div
          class="absolute opacity-20 plastic-card w-full h-full bottom-0 left-0 z-[0]"
        ></div>
        <div
          class="absolute opacity-20 plastic-card w-full h-[90%] bottom-0 left-0 z-[1]"
        ></div>
      </div>
    </v-container>
    <CardViewPagination
      :items="albumSlotsWithCards"
      :itemsPerPage="10"
      :initial-page="qPage"
      @update:paginated="handlePaginatedUpdate"
    />

    <MobileFloatMenu :cols="editMode ? 3 : 2" :fromBottom="gs.navbarHeight + gs.paginationHeight" class="z-30" >
      <template #buttons>

        <template v-if="!editMode">
          <ButtonMenu
            v-if="!gs.albumIsHandling"
            icon="ph:swap"
            label="Gestisci"
            @click="gs.toggleAlbumHandling()"
          />
          <ButtonMenu
            v-else
            icon="el:ok"
            label="Termina"
            color="green"
            @click="gs.toggleAlbumHandling()"
          />
        </template>

        <ButtonMenu
          v-if="editMode"
          icon="streamline-ultimate:card-add-1-bold"
          label="Aggiungi Pagina"
          @click="addNewPage()"
        />

        <DialogsHandleRemoveAlbumPage v-if="editMode" :album="album" @refresh="refreshAlbum()"/>

        <DialogsRenameAlbum v-if="editMode" :album="album" @refresh="refreshAlbum()"/>

        <DialogsHandleRemoveAlbum v-if="editMode" :album-id="album.id" />

        <ButtonMenu
          v-if="!editMode"
          icon="ic:baseline-settings"
          label="Opzioni"
          @click="editMode = true"
        />
        <ButtonMenu
          v-else
          icon="mdi:settings-off"
          label="Termina"
          @click="editMode = false"
        />
      </template>
    </MobileFloatMenu>


    <!-- Viewer full-screen centralizzato -->
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
  /* background-image: linear-gradient(
    145deg,
    rgba(255, 255, 255, 0.08) 0%,
    rgba(255, 255, 255, 0) 30%
  ); */
  box-shadow: inset 0 0 4px rgba(255, 255, 255, 0.1),
    0 1px 4px rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(1px);
}

.slide-in-slot {
  animation: slide-in-slot 1.5s ease-out;
}

.remove-button-appear {
  opacity: 0!important;
  animation: remove-button-appear 2s ease-out;
  animation-delay: 2s;
  animation-fill-mode: backwards;
}

@keyframes remove-button-appear {
  0% {
    opacity: 0;
  }
  100% {
    opacity: 1!important;
  }
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
