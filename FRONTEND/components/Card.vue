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
const cardsCountInCollection = ref(null);

const {
  data: cardCountInCollection,
  refresh: refreshCard,
  status,
} = await useAsyncData(
  `card-collection-${props.card.id}`,
  /* () => ["user-collection", userAuth.userLogged.id], */
  // funzione che torna la Promise
  () => fetchCardInCollection(userAuth.userLogged.id, props.card.id)
);

async function addCardInCollection() {
  await addCardToUserCollection(userAuth.userLogged.id, props.card.id);
  await refreshCard();
}

async function removeCardInCollection() {
  await removeCardToUserCollection(userAuth.userLogged.id, props.card.id);
  await refreshCard();
}
</script>
<template>
  <div :class="{ 'border-[1px] rounded-2xl border-white': editCollection }">
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
    <div
      v-if="cardIsOpen"
      class="fixed inset-0 bg-black/80 flex items-center justify-center z-50 px-10 cursor-zoom-out"
      @click="cardIsOpen = false"
    >
      <v-img
        :src="card.image"
        :lazy-src="card.image"
        class="h-3/4 w-auto"
        contain
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
    </div>
    <div v-if="editCollection" class="py-2 flex items-center justify-between">
      <v-btn variant="text" color="white" @click="removeCardInCollection">
        <v-icon size="25">mdi-minus-circle-outline</v-icon>
      </v-btn>
      <span class="font-bold text-2xl">{{ cardCountInCollection }}</span>
      <v-btn variant="text" color="white" @click="addCardInCollection">
        <v-icon size="25">mdi-plus-circle-outline</v-icon>
      </v-btn>
    </div>
  </div>
</template>
