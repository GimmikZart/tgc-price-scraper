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
  website: {
    type: String,
    required: true
  },
  logoUrl: {
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
      :src="logoUrl"
      contain
    ></v-img>
    <v-card-title>
      {{name}}
    </v-card-title>
    <v-card-subtitle>
      {{website}}
    </v-card-subtitle>
    <v-card-actions>
      <v-spacer></v-spacer>
      <DialogsHandleBrand 
        :brand-id="id" 
        :name="name" 
        :logo-url="logoUrl" 
        :website="website"
      />
    </v-card-actions>
  </v-card>
</template>