<script setup>
import { ref, onMounted } from "vue";
import Toolbar from "@/components/Toolbar.vue";
import Card from "@/components/Card.vue";
import { useMyBreakpoints } from "@/composables/useMyBreakpoints";
import { useMobileFloatMenu } from "@/stores/useMobileFloatMenu";
import { fetchUserCollection } from "@/api/collection";
import { getAlbums, insertCardToAlbum } from "@/api/album";
import { Icon } from "@iconify/vue";

const route = useRoute();
const router = useRouter();
const { isMobile, isTablet, isDesktop } = useMyBreakpoints();
const mobileFloatMenu = useMobileFloatMenu();

const handleAlbum = ref(false); // id dell’album selezionato
const selectedAlbum = ref(null); // dati completi dell'album
const remainingSlots = ref(0);

const filteredCards = ref([]);
const paginatedCards = ref([]);
const openFilter = ref(false);
const editCollection = ref(false);
const userAuth = useUserAuth();

const {
  data: userCollection,
  refresh: refreshCard,
  status,
} = await useAsyncData(`user-collection-${userAuth.userLogged.id}`, () =>
  fetchUserCollection(userAuth.userLogged.id)
);

const { data: userAlbums, refresh: refreshAlbums } = await useAsyncData(
  `user-albums-${userAuth.userLogged.id}`,
  () => getAlbums()
);

function handleFilteredUpdate(newFiltered) {
  filteredCards.value = newFiltered;
}

function handlePaginatedUpdate(newPaginated) {
  paginatedCards.value = newPaginated;
}

const gridSystem = computed(() => {
  return {
    "grid-cols-2 px-2 pb-5 gap-2": isMobile.value,
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
    const selectedAlbumFromQuery = userAlbums.value.find(
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
        <span class="font-bold text-lg">
          {{ filteredCards.length }} carte
        </span>
        <v-btn
          v-if="isDesktop"
          class="text-white"
          variant="text"
          @click="openFilter = true"
        >
          <v-icon size="30">mdi-magnify</v-icon>
        </v-btn>
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
          {{ selectedAlbum.name }}
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
        :edit-collection="editCollection"
        @click="handleInsertAlbum(card)"
      />
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
          <span class="text-xs mr-3">Gestisci Collezione</span>
          <Icon class="text-xl" icon="fluent:collections-add-24-regular"></Icon>
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
