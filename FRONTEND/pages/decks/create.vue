<script setup>
import { Icon } from "@iconify/vue";
const { allCards } = await useOnePieceCards();
const mobileFloatMenu = useMobileFloatMenu();

const builderCards = computed(() => {
  if (leaderChoosen.value) {
    return allCards.filter((card) => {
      const cardHasLeaderColor = leaderChoosen.value.color.some((item) =>
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
    return a.name.localeCompare(b.name);
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
</script>
<template>
  <section class="relative h-full">
    <Toolbar label="Crea Deck">
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
        <div v-else class="pb-5">
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
          <div
            v-if="showDeck"
            class="mt-2 bg-black grid grid-cols-4 p-2 pb-10 gap-8"
          >
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
                :class="{ absolute: ydx > 0 }"
                :style="`transform: translateY(${ydx * 6}px) translateX(${
                  ydx * 5
                }px) `"
              >
                <template #open-bottom>
                  <div class="z-[50]" @click.stop>
                    <div class="text-xl text-center text-white">
                      {{ card.count }}x {{ card.code }}
                    </div>
                    <div class="flex gap-5 w-full">
                      <v-btn
                        size="large"
                        class="grow"
                        color="white"
                        variant="outlined"
                        @click.stop="removeCardFromDeck(card)"
                      >
                        <v-icon size="30" color="red">mdi-minus</v-icon>
                      </v-btn>
                      <v-btn
                        size="large"
                        class="grow"
                        color="white"
                        variant="outlined"
                        @click.stop="addCardInDeck(card)"
                      >
                        <v-icon size="30" color="green">mdi-plus</v-icon>
                      </v-btn>
                    </div>
                  </div>
                </template>
              </Card>
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
