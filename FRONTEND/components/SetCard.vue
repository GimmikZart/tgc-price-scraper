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
const emit = defineEmits(['refresh-data'])
const isReleased = computed(() => {
  return isProductReleased(props.publishDate);
});
</script>
<template>
  <v-card>
    <div class="p-3">
      <v-img
        width="100%"
        height="200px"
        :src="imageUrl"
        contain
      ></v-img>
    </div>
    
    <v-card-text>
      <v-card-title>
        <h3>{{game}}</h3>
      </v-card-title>
      <v-card-title>
        <h3>{{name}} - {{ code }}</h3>
      </v-card-title>
      <v-card-subtitle>
        Published: 
      </v-card-subtitle>
      <v-chip v-if="!isReleased" color="red">Non Rilasciato: {{publishDate}}</v-chip>
      <v-chip v-else color="green">Rilasciato: {{publishDate}}</v-chip>
    </v-card-text>
    
    <v-card-actions>
      <v-spacer></v-spacer>
      <DialogsHandleSet 
        :set-id="id" 
        :name="name" 
        :game-id="gameId"
        :code="code" 
        :image-url="imageUrl" 
        :publish-date="publishDate" 
        @refresh-data="emit('refresh-data')"
      />
    </v-card-actions>
  </v-card>
</template>