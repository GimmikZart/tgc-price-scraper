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
  logoUrl: {
    type: String,
    required: true
  },
  website: {
    type: String,
    required: true
  },
  priceSelector: {
    type: String,
    required: true
  },
  imageSelector: {
    type: String,
    required: true
  },
})
</script>
<template>
  <v-card min-width="300"
  >
    <v-img
      width="100%"
      height="200px"
      :src="logoUrl"
      contain
    ></v-img>

    <v-card-title>
      {{name}}
    </v-card-title>

    <v-card-subtitle>
      {{website}}
    </v-card-subtitle>
    <v-card-text>
      <div class="flex flex-col gap-2">
        <p>Price Selector: {{priceSelector}}</p>
        <p>Image Selector: {{imageSelector}}</p>
      </div>
    </v-card-text>

    <v-card-actions>
      <v-spacer></v-spacer>
      <DialogsHandleStore 
        :store-id="id" 
        :name="name" 
        :logoUrl="logoUrl" 
        :website="website" 
        :price-selector="priceSelector" 
        :image-selector="imageSelector"
      />
    </v-card-actions>
  </v-card>
</template>