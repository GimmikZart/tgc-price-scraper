<script setup>
const props = defineProps({
  id: {
    type: Number,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  game: {
    type: String,
    required: true
  },
  gameId: {
    type: Number,
    required: true
  },
  code: {
    type: String,
    required: false
  },
  imageUrl: {
    type: String,
    required: true
  },
  publishDate: {
    type: String,
    required: true
  },
})
</script>
<template>
  <v-card>
    <v-img
      width="100%"
      height="200px"
      :src="imageUrl"
      contain
    ></v-img>
    <v-card-title>
      {{game}}
    </v-card-title>
    <v-card-title>
      {{name}} - {{ code }}
    </v-card-title>

    <v-card-subtitle>
      Published: {{publishDate}}
    </v-card-subtitle>
    <v-card-actions>
      <v-spacer></v-spacer>
      <DialogsHandleSet 
        :set-id="id" 
        :name="name" 
        :game-id="gameId"
        :code="code" 
        :image-url="imageUrl" 
        :publish-date="publishDate" />
    </v-card-actions>
  </v-card>
</template>