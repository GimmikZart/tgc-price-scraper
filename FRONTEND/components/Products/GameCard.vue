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
  brand: {
    type: String,
    required: true
  },
  slug: {
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
    <v-card class="pa-5" variant="flat">
      <NuxtLink :to="`/${slug}`">
        <v-img
            width="100%"
            height="100px"
            :src="logoUrl"
            contain
        ></v-img>
      </NuxtLink>
    </v-card>
</template>