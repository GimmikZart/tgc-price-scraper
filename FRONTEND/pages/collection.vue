<script setup></script>
<template>
  <section>
    <Toolbar label="La tua collezione">
      <template #actions>
        <span class="font-bold text-lg">
          {{ filteredCards.length }} carte
        </span>
        <v-btn
          v-if="isDesktop"
          class="text-white"
          variant="text"
          @click="openFilter = true"
        >
          <v-icon size="30">mdi-magnify</v-icon>
        </v-btn>
      </template>
    </Toolbar>
  </section>
</template>
