<script setup>
import { ref, onMounted } from "vue";
import Toolbar from "@/components/Toolbar.vue";
import Card from "@/components/Card.vue";
import { useMyBreakpoints } from "@/composables/useMyBreakpoints";
import { useMobileFloatMenu } from "@/stores/useMobileFloatMenu";
import { fetchUserCollection } from "@/api/collection";
import { getAlbums, insertCardToAlbum } from "@/api/album";
import { Icon } from "@iconify/vue";
import {
  fetchCardCountInCollection,
  addCardToUserCollection,
  removeCardToUserCollection,
} from "@/api/collection";

const route = useRoute();
const router = useRouter();
const { isMobile, isTablet, isDesktop } = useMyBreakpoints();
const mobileFloatMenu = useMobileFloatMenu();

const handleAlbum = ref(false); // id dell’album selezionato
const selectedAlbum = ref(null); // dati completi dell'album

const filteredCards = ref([]);
const paginatedCards = ref([]);
const openFilter = ref(false);
const editCollection = ref(false);
const userAuth = useUserAuth();

const { data: userCollection } = await useAsyncData(
  `user-collection-${userAuth.userLogged.id}`,
  () => fetchUserCollection(userAuth.userLogged.id)
);

async function addCardInCollection(card) {
  card.count = ++card.count;
  await addCardToUserCollection(userAuth.userLogged.id, card.id);
}

async function removeCardInCollection(card) {
  card.count = --card.count;
  await removeCardToUserCollection(userAuth.userLogged.id, card.id);
}

async function loadCollectionCardCounts() {
  if (!userAuth.userLogged?.id) return;
  const userId = userAuth.userLogged.id;

  await Promise.all(
    paginatedCards.value.map(async (card) => {
      try {
        const c = await fetchCardCountInCollection(userId, card.id);
        card.count = c;
      } catch (e) {
        console.error("Errore fetch count per", card.id, e);
        card.count = 0;
      }
    })
  );
}

watch(editCollection, async () => {
  if (editCollection.value) await loadCollectionCardCounts();
});

function handleFilteredUpdate(newFiltered) {
  filteredCards.value = newFiltered;
}

function handlePaginatedUpdate(newPaginated) {
  paginatedCards.value = newPaginated;
}

const gridSystem = computed(() => {
  return {
    "grid-cols-2 px-2 pb-10 gap-2": isMobile.value,
    "grid-cols-4": isTablet.value,
    "grid-cols-8 px-4 pb-20": isDesktop.value,
  };
});

watch(openFilter, (newValue) => {
  if (newValue) {
    document.documentElement.classList.add("overflow-hidden");
  } else {
    document.documentElement.classList.remove("overflow-hidden");
  }
});

watch(selectedAlbum, async (newAlbum) => {
  if (!newAlbum) {
    router.push({ query: {} }); // pulisci query
    return;
  }
});

const handleInsertAlbum = async (card) => {
  if (handleAlbum.value) {
    if (!selectedAlbum.value) {
      snackbar.addMessage(
        "Seleziona un album prima di aggiungere la carta",
        "error"
      );
      return;
    }
  }

  const cardIndex = parseInt(route.query?.index) || 0;

  const response = await insertCardToAlbum(
    selectedAlbum.value,
    card.id,
    cardIndex
  );
  console.log("Response from insertCardToAlbum:", response);

  if (response) router.push(`/collection/album/${selectedAlbum.value.slug}`);
};

onMounted(async () => {
  filteredCards.value = userCollection.value;
  if (route.query.album) {
    handleAlbum.value = true;
    const userAlbums = await getAlbums();
    const selectedAlbumFromQuery = userAlbums.find(
      (a) => a.slug === route.query.album
    );

    selectedAlbum.value = selectedAlbumFromQuery;
  }
});
</script>

<template>
  <section class="relative h-full">
    <Toolbar label="La tua collezione">
      <template #actions>
        <MobileFloatMenu>
          <template #buttons>
            <v-btn
              class="text-white"
              variant="text"
              @click="
                editCollection = !editCollection;
                mobileFloatMenu.close();
              "
            >
              <span v-if="!editCollection" class="text-xs mr-3"
                >Gestisci Collezione</span
              >
              <span v-else class="text-xs mr-3">Termina Gestione</span>
              <Icon
                class="text-xl"
                icon="fluent:collections-add-24-regular"
              ></Icon>
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
              <Icon
                class="text-2xl"
                icon="material-symbols:search-rounded"
              ></Icon>
            </v-btn>
          </template>
        </MobileFloatMenu>
      </template>
    </Toolbar>

    <div>
      <div
        v-if="handleAlbum"
        class="fixed bg-black/80 backdrop-blur-[3px] p-3 w-full flex justify-around top-[50px] left-0 z-[100] px-3 text-sm text-white/70"
      >
        <!-- GESTIONE ALBUM -->
        <h5>Aggiungi ad Album</h5>
        <Icon icon="icomoon-free:arrow-right" class="text-xl" />
        <span class="font-bold">
          {{ selectedAlbum?.name }}
        </span>
      </div>
      <!-- ------------------- -->
      <h4
        v-if="paginatedCards.length == 0"
        class="text-center text-gray-500 my-5"
      >
        La ricerca non ha prodotto risultati
      </h4>
    </div>

    <div class="grid px-2 pt-2" :class="gridSystem">
      <Card
        v-for="(card, ix) in paginatedCards"
        :key="ix"
        :card="card"
        :handle-cards="editCollection"
        @addCard="addCardInCollection(card)"
        @removeCard="removeCardInCollection(card)"
        :card-count="card.count"
        :disable-opening="handleAlbum"
        @click="handleInsertAlbum(card)"
      >
        <template #open-bottom>
          <div
            class="flex text-white font-bold text-3xl items-center justify-center"
          >
            x{{ card.count }}
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
      v-show="openFilter"
      :cards-list="userCollection"
      @update:filtered="handleFilteredUpdate"
      @close="openFilter = false"
    />
  </section>
</template>
