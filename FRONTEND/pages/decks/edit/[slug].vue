<script setup>
import { Icon } from "@iconify/vue";
import { useDeckStore } from "@/stores/useDeckStore";
import { copyDeckOnClipboard } from "@/utilities/copyDeckOnClipboard";

const snackbar = useSnackbar();
const { allCards } = await useOnePieceCards();
const mobileFloatMenu = useMobileFloatMenu();
const route = useRoute();
const router = useRouter();
const decksStore = useDeckStore();

const builderCards = computed(() => {
  if (leaderChoosen.value != null) {
    return allCards.filter((card) => {
      const cardHasLeaderColor = leaderChoosen.value?.color?.some((item) =>
        card.color.includes(item)
      );

      const cardIsNotTypeLeader = card.type !== "LEADER";
      return cardIsNotTypeLeader && cardHasLeaderColor;
    });
  } else {
    return allCards.filter((card) => card.type === "LEADER");
  }
});

const filteredCards = ref([]);
const paginatedCards = ref([]);
const openFilter = ref(false);
const cardsInDeck = ref([]);
const showDeck = ref(false);
const filterKey = ref(0);
const actionOnDeck = ref("info");
const deckName = ref("");
const leaderChoosen = ref(null);

watch(openFilter, (newValue) => {
  if (newValue) {
    document.documentElement.classList.add("overflow-hidden");
  } else {
    document.documentElement.classList.remove("overflow-hidden");
  }
});

const singleCardsInDeck = computed(() => {
  const uniqueCards = new Map();
  cardsInDeck.value.forEach((card) => {
    if (uniqueCards.has(card.id)) {
      uniqueCards.get(card.id).count++;
    } else {
      uniqueCards.set(card.id, { ...card, count: 1 });
    }
  });
  return Array.from(uniqueCards.values()).sort((a, b) => {
    return a.cost - b.cost || a.name.localeCompare(b.name);
  });
});

function handleFilteredUpdate(newFiltered) {
  filteredCards.value = newFiltered;
}

function handlePaginatedUpdate(newPaginated) {
  paginatedCards.value = newPaginated;
}

function chooseLeader(card) {
  filterKey.value++;
  leaderChoosen.value = card;
}

function addCardInDeck(card) {
  cardsInDeck.value.push(card);
}

function handleCardCopy(card) {
  if (actionOnDeck.value === "add") {
    addCardInDeck(card);
  } else if (actionOnDeck.value === "remove") {
    removeCardFromDeck(card);
  }
}

function removeCardFromDeck(cardToRemove) {
  // 1) ricavo l'array di soli ID
  const ids = cardsInDeck.value.map((c) => c.id);

  // 2) conto quante copie ho
  const count = ids.filter((id) => id === cardToRemove.id).length;

  if (count > 1) {
    // ci sono altre copie → ne tolgo una “diversa” (l'ultima nell'array)
    const idxToRemove = ids.lastIndexOf(cardToRemove.id);
    cardsInDeck.value.splice(idxToRemove, 1);
  } else if (count === 1) {
    // è l'ultima copia → tolgo quella e poi chiudo il fullscreen
    const idxToRemove = ids.indexOf(cardToRemove.id);
    cardsInDeck.value.splice(idxToRemove, 1);
  }
}

function getCopyInDeck(card) {
  return cardsInDeck.value.filter((c) => c.id === card.id).length;
}

function saveDeck() {
  const cardsInDeckIds = cardsInDeck.value.map((c) => c.id);
  const leaderId = leaderChoosen.value ? leaderChoosen.value.id : null;
  decksStore.editDeck(route.params.slug, leaderId, cardsInDeckIds);
  //router.push(`/decks/${existingDeckInStore.value.slug}`);
}

function exportDeck() {
  copyDeckOnClipboard(leaderChoosen.value, singleCardsInDeck.value);
  snackbar.addMessage("Deck copiato negli appunti", "success");
}
onMounted(() => {
  const existingDeckInStore = decksStore.getDeckBySlug(route.params.slug);
  if (existingDeckInStore) {
    deckName.value = existingDeckInStore.name;
    leaderChoosen.value = allCards.find(
      (c) => c.id === existingDeckInStore.leader
    );
    existingDeckInStore.cards.forEach((cardId) => {
      const card = allCards.find((c) => c.id === cardId);
      if (card) {
        cardsInDeck.value.push(card);
      }
    });
  }
});
</script>
<template>
  <section class="relative h-full">
    <Toolbar label="Crea Deck" class="rounded-b-xl">
      <template #actions>
        <p class="text-xl font-bold text-left">{{ cardsInDeck.length }} / 50</p>
      </template>
      <template #info>
        <p
          v-if="!leaderChoosen"
          class="text-lg border-[1px] p-2 rounded-lg text-center font-bold z-0"
        >
          SCEGLI IL LEADER
        </p>
        <div v-else class="pb-5 rounded-b-xl">
          <div
            class="min-h-[50px] text-lg bg-black border-[1px] p-2 rounded-lg flex text-center font-bold z-0"
          >
            <Card :card="leaderChoosen" class="w-[50px] flex-none" />
            <div class="w-full h-cover flex items-center justify-between">
              <div class="w-4/5 flex flex-col justify-between px-3 truncate">
                <p class="text-left text-xs">COMPONI MAZZO</p>
                <p class="w-auto text-left text-xl truncate">
                  {{ leaderChoosen.name }}
                </p>
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
          <div v-if="showDeck" class="mt-2 bg-black p-2 pb-10 gap-8 w-full">
            <div class="flex flex-col items-center gap-2 justify-center mb-5">
              <span class="text-xs">AL click sulla carta</span>
              <v-btn-toggle
                base-color="white"
                v-model="actionOnDeck"
                density="compact"
                divided
                variant="tonal"
              >
                <v-btn size="small" color="info" value="info"> Info </v-btn>
                <v-btn size="small" color="success" value="add">
                  Aggiungi
                </v-btn>
                <v-btn size="small" color="error" value="remove">
                  Rimuovi
                </v-btn>
              </v-btn-toggle>
            </div>

            <div class="grid grid-cols-4 gap-8">
              <div
                v-for="(card, idx) in singleCardsInDeck"
                :key="idx"
                class="relative bg-black w-full"
              >
                <Card
                  v-for="(copy, ydx) in card.count"
                  :key="ydx"
                  :card="card"
                  class="w-full top-0 left-0"
                  :class="{
                    absolute: ydx > 0,
                    'border-[2px] animate-pulse rounded-lg border-red-500':
                      copy > 4,
                  }"
                  :style="`transform: translateY(${ydx * 6}px) translateX(${
                    ydx * 5
                  }px) `"
                  @click="handleCardCopy(card)"
                  :disable-opening="actionOnDeck !== 'info'"
                >
                  <template #open-bottom>
                    <div class="text-3xl font-bold text-white">
                      x {{ card.count }}
                    </div>
                  </template>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </template>
    </Toolbar>
    <div
      v-if="showDeck"
      @click="showDeck = false"
      class="fixed top-0 left-0 h-screen w-full bg-black/60 backdrop-blur-[2px] z-[2]"
    ></div>
    <h4
      v-if="paginatedCards.length == 0"
      class="text-center text-gray-500 my-5"
    >
      La ricerca non ha prodotto risultati
    </h4>

    <div class="grid grid-cols-2 gap-3 px-2 pt-2 pb-32 transition-all">
      <Card v-for="(card, ix) in paginatedCards" :key="ix" :card="card">
        <template #actions>
          <v-btn
            v-if="!leaderChoosen"
            class="bg-gray-500"
            block
            variant="outlined"
            @click="chooseLeader(card)"
          >
            SCEGLI
          </v-btn>
          <div v-else class="w-full flex items-center justify-between">
            <v-btn variant="tonal" color="white">
              <v-icon size="25" color="red" @click="removeCardFromDeck(card)"
                >mdi-minus</v-icon
              >
            </v-btn>
            <span class="text-xl">{{ getCopyInDeck(card) }} </span>
            <v-btn variant="tonal" color="white" @click="addCardInDeck(card)">
              <v-icon size="25" color="green">mdi-plus</v-icon>
            </v-btn>
          </div>
        </template>
      </Card>
    </div>

    <CardViewPagination
      :items="filteredCards"
      :itemsPerPage="32"
      @update:paginated="handlePaginatedUpdate"
    />
    <CardViewFilter
      :key="filterKey"
      v-show="openFilter"
      :cards-list="builderCards"
      @update:filtered="handleFilteredUpdate"
      @close="openFilter = false"
      :multicolor="false"
      :hide-color-filter="leaderChoosen != null"
      :hide-type-filter="leaderChoosen == null"
    />
    <MobileFloatMenu :menu-open="mobileFloatMenu.open">
      <template #buttons>
        <v-btn
          :disabled="cardsInDeck.length != 50"
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
        <v-btn class="text-white" variant="text" @click="saveDeck">
          <span class="text-xs mr-3">Salva</span>
          <Icon class="text-2xl" icon="material-symbols:save-rounded"></Icon>
        </v-btn>
        <v-btn
          v-if="!showDeck"
          class="text-white"
          variant="text"
          @click="
            showDeck = true;
            mobileFloatMenu.close();
          "
        >
          <span class="text-xs mr-3">Mostra Mazzo</span>
          <Icon class="text-2xl" icon="mdi:show"></Icon>
        </v-btn>
        <v-btn
          v-else
          class="text-white"
          variant="text"
          @click="
            showDeck = false;
            mobileFloatMenu.close();
          "
        >
          <span class="text-xs mr-3">Nascondi Mazzo</span>
          <Icon class="text-2xl" icon="mdi:hide"></Icon>
        </v-btn>
        <v-btn
          class="text-white"
          variant="text"
          @click="
            openFilter = true;
            mobileFloatMenu.close();
          "
        >
          <span class="text-xs mr-3">Filtra</span>
          <Icon class="text-2xl" icon="material-symbols:search-rounded"></Icon>
        </v-btn>
      </template>
    </MobileFloatMenu>
  </section>
</template>
