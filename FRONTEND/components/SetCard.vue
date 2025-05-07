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
const isNotReleased = computed(() => {
  const today = new Date();
  const publishDate = new Date(props.publishDate);
  return publishDate > today;
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
        {{game}}
      </v-card-title>
      <v-card-title>
        {{name}} - {{ code }}
      </v-card-title>
      <v-card-subtitle>
        Published: {{publishDate}}
      </v-card-subtitle>
      <v-chip v-if="isNotReleased" color="red">Non Rilasciato</v-chip>
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