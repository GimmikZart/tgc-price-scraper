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

function getCopyInDeck(card) {
  return cardsInDeck.value.filter((c) => c.id === card.id).length;
}

function addCardInDeck(card) {
  cardsInDeck.value.push(card);
}

function removeCardFromDeck(cardToRemove) {
  const ids = cardsInDeck.value.map((c) => c.id);

  const count = ids.filter((id) => id === cardToRemove.id).length;

  if (count > 1) {
    const idxToRemove = ids.lastIndexOf(cardToRemove.id);
    cardsInDeck.value.splice(idxToRemove, 1);
  } else if (count === 1) {
    const idxToRemove = ids.indexOf(cardToRemove.id);
    cardsInDeck.value.splice(idxToRemove, 1);
  }
}

function saveDeck() {
  const cardsInDeckIds = cardsInDeck.value.map((c) => c.id);
  const leaderId = leaderChoosen.value ? leaderChoosen.value.id : null;
  decksStore.editDeck(route.params.slug, leaderId, cardsInDeckIds);
  snackbar.addMessage("Deck salvato in locale con successo", "success");
  mobileFloatMenu.close();
  router.push(`/decks/${route.params.slug}`);
}

function exportDeck() {
  copyDeckOnClipboard(leaderChoosen.value, singleCardsInDeck.value);
  snackbar.addMessage("Deck copiato negli appunti", "success");
  mobileFloatMenu.close();
}

onMounted(() => {
  mobileFloatMenu.close();
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

provide("cardsInDeck", cardsInDeck);
provide("addCardInDeck", addCardInDeck);
provide("removeCardFromDeck", removeCardFromDeck);
</script>
<template>
  <section class="relative">
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
        <div v-else class="rounded-b-xl">
          <div
            class="text-lg bg-black border-[1px] p-2 rounded-lg flex text-center font-bold z-0"
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
          <div
            v-if="showDeck"
            class="flex flex-col items-center gap-2 justify-center mt-2"
          >
            <span class="text-xs">AL click sulla carta</span>
            <v-btn-toggle
              base-color="white"
              v-model="actionOnDeck"
              density="compact"
              divided
              variant="tonal"
            >
              <v-btn size="small" color="info" value="info"> Info </v-btn>
              <v-btn size="small" color="success" value="add"> Aggiungi </v-btn>
              <v-btn size="small" color="error" value="remove"> Rimuovi </v-btn>
            </v-btn-toggle>
          </div>
        </div>
      </template>
    </Toolbar>
    <CardViewDeck v-if="showDeck" :action-on-deck="actionOnDeck" />

    <div v-else>
      <h4
        v-if="paginatedCards.length == 0"
        class="text-center text-gray-500 my-5"
      >
        La ricerca non ha prodotto risultati
      </h4>
      <div class="grid grid-cols-2 gap-3 px-2 pt-2 pb-32 transition-all">
        <Card
          v-for="(card, ix) in paginatedCards"
          :key="ix"
          :card="card"
          :choose-card="!leaderChoosen"
          :handle-cards="leaderChoosen != null"
          @chooseCard="chooseLeader(card)"
          @addCard="addCardInDeck(card)"
          @removeCard="removeCardFromDeck(card)"
          :card-count="getCopyInDeck(card)"
        >
        </Card>
      </div>
    </div>

    <CardViewPagination
      ref="pagination"
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
        <DialogsHandleDelete @delete="deleteDeck" :slug="route.params.slug" />
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
          v-if="!showDeck && leaderChoosen"
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
          v-else-if="showDeck && leaderChoosen"
          class="text-white"
          variant="text"
          @click="
            showDeck = false;
            mobileFloatMenu.close();
          "
        >
          <span class="text-xs mr-3">Lista Carte</span>
          <Icon class="text-2xl" icon="streamline:cards"></Icon>
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
