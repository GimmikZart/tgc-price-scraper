<script setup>
import { Icon } from "@iconify/vue";
import { updateDeckVisibility } from "~/api/decks";
import { getVisibilityLabel } from "~/enums/visibility";
import { copyDeckOnClipboard } from "@/utilities/copyDeckOnClipboard";
import { usePageLoader } from "@/stores/usePageLoader";

const snackbar = useSnackbar();
const route = useRoute();
const pageLoader = usePageLoader();

const currentDeck = ref({
  name: "",
  slug: "",
  leader: null,
  cards: [],
  visibility: "private",
  location: "local",
});
const leaderChoosen = ref(null);
const router = useRouter();
const { allCards } = await useOnePieceCards();
const mobileFloatMenu = useMobileFloatMenu();
const cardsInDeck = ref([]);
const { getLocal, getCloud } = useDeckManager();

function goToEditDeck() {
  router.push(`/decks/edit/${route.params.slug}`);
}

const singleCardsInDeck = computed(() => {
  const uniqueCards = new Map();
  currentDeck.value.cards.forEach((card) => {
    const cardData = allCards.find((c) => c.id === card);
    if (uniqueCards.has(cardData)) {
      uniqueCards.get(cardData).count++;
    } else {
      uniqueCards.set(cardData, { ...cardData, count: 1 });
    }
  });
  return Array.from(uniqueCards.values()).sort((a, b) => {
    return a.cost - b.cost || a.name.localeCompare(b.name);
  });
});

const leaderCards = computed(() => {
  return allCards.filter((card) => card.type === "LEADER");
});

function chooseLeader(cardId) {
  currentDeck.value.leader = cardId;
  const leaderCard = leaderCards.value.find((c) => c.id === cardId);
  leaderChoosen.value = leaderCard || null;
}

async function getDeckFromSlug(slug) {
  if (!slug) return;
  // 1) Provo a prendere il draft locale
  const local = await getLocal(slug);
  if (local) {
    currentDeck.value = local;
    chooseLeader(local.leader);
    return;
  }

  // 2) Non esiste in locale → prendo dal cloud e creo il draft
  const cloudDeck = await getCloud(slug);
  if (cloudDeck) {
    currentDeck.value = cloudDeck;
    chooseLeader(cloudDeck.leader);
  }
}

const updateVisibility = async (newValue) => {
  await updateDeckVisibility(currentDeck.value.slug, newValue);
};

function exportDeck() {
  copyDeckOnClipboard(leaderChoosen.value, singleCardsInDeck.value);
  snackbar.addMessage("Deck copiato negli appunti", "success");
}

onMounted(async () => {
  pageLoader.startLoading();
  await getDeckFromSlug(route.params.slug);
  pageLoader.stopLoading();
  if(leaderChoosen.value === null) {
    snackbar.addMessage("Mazzo non trovato", "error");
    router.push(`/decks/edit/${currentDeck.value.slug}`);
  }
});

definePageMeta({
  ssr: false,
});

provide("addCardInDeck", null);
provide("removeCardFromDeck", null);
provide("item", currentDeck);
</script>
<template>
  <Toolbar v-if="leaderChoosen" :label="`Mazzo ${currentDeck.name}`">
    <template #actions>
      <MobileFloatMenu :menu-open="mobileFloatMenu.open">
        <template #buttons>
          <DialogsHandleDelete @delete="deleteDeck" />
          <v-btn
            :disabled="currentDeck.cards.length != 50"
            class="text-white"
            variant="text"
            @click="exportDeck"
          >
            <span class="text-xs mr-3">Esporta</span>
            <Icon
              class="text-2xl"
              icon="material-symbols:export-notes-outline"
            ></Icon>
          </v-btn>
          <DialogsHandleVisibility
            v-if="!currentDeck.isLocal"
            @update-visibility="(newValue) => updateVisibility(newValue)"
          />
          <v-btn @click="goToEditDeck()" variant="text">
            <span class="text-xs mr-3">Modifica</span>
            <Icon class="text-2xl" icon="iconoir:wrench"></Icon>
          </v-btn>
        </template>
      </MobileFloatMenu>
    </template>
    <template #info>
      <div
        class="text-lg bg-black p-2 px-5 rounded-lg flex text-center font-bold z-0"
      >
        <Card :card="leaderChoosen" class="w-[50px] flex-none" />
        <div class="w-full h-cover flex items-center justify-between">
          <div class="w-4/5 flex flex-col justify-between px-3 truncate">
            <p class="text-left text-xs">Leader</p>
            <p class="w-auto text-left text-xl truncate">
              {{ leaderChoosen.name }}
            </p>
            <div class="flex gap-3 items-center">
              <p class="text-sm font-normal text-left">
                {{ currentDeck.cards.length }} / 50
              </p>
              <v-chip
                v-if="currentDeck.isLocal"
                color="orange"
                size="small"
                class="text-xs"
              >
                Locale
                <Icon icon="mdi:offline" class="text-orange text-lg ml-1" />
              </v-chip>
              <v-chip v-else size="small" color="green" class="text-xs">
                {{ getVisibilityLabel(currentDeck.visibility) }}
                <Icon
                  icon="material-symbols-light:cloud-done-rounded"
                  class="text-green text-lg ml-1"
                />
              </v-chip>
            </div>
          </div>
          <div class="w-1/5 h-full grow flex gap-1 flex-col">
            <div
              v-for="(color, idx) in leaderChoosen.color"
              :key="idx"
              :class="`bg-${color.toLowerCase()}`"
              class="text-xs px-2 h-full rounded flex items-center justify-center border-[1px] border-white/20"
            >
              {{ color }}
            </div>
          </div>
        </div>
      </div>
    </template>
  </Toolbar>
  <CardViewDeck :single-cards-in-deck="singleCardsInDeck" />
</template>
