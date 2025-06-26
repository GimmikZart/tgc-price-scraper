<script setup>
import {
  fetchCardInCollection,
  addCardToUserCollection,
  removeCardToUserCollection,
} from "@/api/collection";
const props = defineProps({
  card: {
    type: Object,
    required: true,
  },
  editCollection: {
    type: Boolean,
  },
});

const userAuth = useUserAuth();
const cardIsOpen = ref(false);
const cardCountInCollection = ref(0);
const isLoading = ref(false);

async function loadCardCount() {
  if (!userAuth.userLogged?.id || !props.card?.id) return;
  isLoading.value = true;
  try {
    cardCountInCollection.value = await fetchCardInCollection(
      userAuth.userLogged.id,
      props.card.id
    );
  } catch (e) {
    console.error("Errore fetchCardInCollection", e);
  } finally {
    isLoading.value = false;
  }
}

async function addCardInCollection() {
  await addCardToUserCollection(userAuth.userLogged.id, props.card.id);
  await loadCardCount();
}

async function removeCardInCollection() {
  await removeCardToUserCollection(userAuth.userLogged.id, props.card.id);
  await loadCardCount();
}

onMounted(() => {
  loadCardCount();
});

watch(
  () => props.card.id,
  () => {
    loadCardCount();
  }
);

watch(
  () => props.editCollection,
  (v) => {
    if (v) loadCardCount();
  }
);
</script>
<template>
  <div
    class="flex flex-col justify-between"
    :class="{ 'border-[1px] border-white/30 rounded-lg': editCollection }"
  >
    <Transition
      appear
      enter-active-class="transition-all duration-300 ease-out"
      enter-from-class="translate-y-full"
      enter-to-class="translate-y-0"
      leave-active-class="transition-all duration-300 ease-out"
      leave-from-class="translate-y-0"
      leave-to-class="translate-y-full"
    >
      <div v-if="editCollection" class="p-2">
        <h3 class="font-bold mb-1">{{ card.name }}</h3>
        <h4 class="text-[10px]">{{ card.setName }}</h4>
      </div>
    </Transition>
    <div>
      <v-img
        :src="card.image"
        :lazy-src="card.image"
        width="100%"
        height="auto"
        class="border shadow-md cursor-zoom-in"
        cover
        @click="cardIsOpen = true"
        :alt="card.name"
      >
        <template v-slot:placeholder>
          <div class="d-flex align-center justify-center fill-height">
            <v-progress-circular
              color="grey-lighten-4"
              indeterminate
            ></v-progress-circular>
          </div>
        </template>
      </v-img>
      <slot name="actions" />
      <!-- TASTI COLLEZIONE -->
      <Transition
        appear
        enter-active-class="transition-all duration-300 ease-out"
        enter-from-class="-translate-y-full"
        enter-to-class="translate-y-0"
        leave-active-class="transition-all duration-300 ease-out"
        leave-from-class="translate-y-0"
        leave-to-class="-translate-y-full"
      >
        <div
          v-if="editCollection"
          class="flex gap-3 items-center justify-between"
        >
          <div class="w-full flex items-center justify-between">
            <v-btn
              variant="tonal"
              color="white"
              @click="removeCardInCollection"
            >
              <v-icon size="25" color="red">mdi-minus</v-icon>
            </v-btn>
            <span class="text-xl">{{ cardCountInCollection }}</span>
            <v-btn variant="tonal" color="white" @click="addCardInCollection">
              <v-icon size="25" color="green">mdi-plus</v-icon>
            </v-btn>
          </div>
        </div>
      </Transition>
    </div>

    <!-- CARTA APERTA -->
    <Teleport to="body">
      <div
        v-if="cardIsOpen"
        class="fixed inset-0 bg-black/80 flex flex-col items-center justify-center pb-[90px] pt-[50px] gap-5 z-50 px-10 cursor-zoom-out"
        @click.self="cardIsOpen = false"
      >
        <div class="text-center">
          <h3 class="text-white/80 font-light text-sm text-center">
            {{ card.setName }}
          </h3>
          <h3 class="text-white font-bold text-3xl">{{ card.name }}</h3>
          <h4 class="text-white">{{ card.code }}</h4>
        </div>

        <div class="w-full h-auto">
          <v-img
            :src="card.image"
            :lazy-src="card.image"
            class="w-full z-[50]"
            contain
            :alt="card.name"
          >
            <template v-slot:placeholder>
              <div class="d-flex align-center justify-center fill-height">
                <v-progress-circular
                  color="grey-lighten-4"
                  indeterminate
                ></v-progress-circular>
              </div>
            </template>
          </v-img>
        </div>
        <slot name="open-bottom" />
      </div>
    </Teleport>
  </div>
</template>
