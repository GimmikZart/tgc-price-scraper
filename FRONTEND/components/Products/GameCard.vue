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
    <v-card>
        <v-img
            width="100%"
            height="200px"
            :src="logoUrl"
            contain
        ></v-img>
        <v-card-text>
            <v-chip>{{ brand }}</v-chip>
            <v-card-title>
                {{name}}
            </v-card-title>
        </v-card-text>

        <v-card-actions>
            <v-btn color="black" variant="outlined" :to="`/${slug}`" block>SCEGLI</v-btn>
        </v-card-actions>
    </v-card>
</template>