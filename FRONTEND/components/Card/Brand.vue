<script setup>
const props = defineProps({
  brand: {
    type: Object,
    required: true
  }
})
</script>

<template>
  <v-card class="h-100 pa-2" >
    <v-img
      width="100%"
      height="200px"
      :src="brand.logo_url"
      contain
    ></v-img>
    <v-divider class="my-2"></v-divider>
    <v-card-title class="text-center">
      {{brand.name}}
    </v-card-title>
  </v-card>
</template>