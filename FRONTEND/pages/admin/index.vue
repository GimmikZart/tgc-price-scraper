<script setup>
definePageMeta({
  middleware: "admin",
});

async function scrapeAllPrices() {
  if (!selectedFile.value) {
    snackbar.addMessage('Seleziona prima un file', 'warning')
    return
  }
  if (!cards.value?.length) {
    snackbar.addMessage('Nessuna carta nel file selezionato', 'warning')
    return
  }

  try {
    scraping.value = true
    snackbar.addMessage('Scrape avviato. Controlla i log e la cartella debug-scrape/cardtrader', 'success')
    // invio solo ciò che serve: lista carte (backend userà SOLO la prima con slugs[0].url)
    await $fetch('/api/scrape-cards-price', {
      method: 'POST',
    })
    // Il backend risponde 204, qui non arriva nulla.
    snackbar.addMessage('Scrape terminato senza errori.', 'success')
  } catch (err) {
    console.error(err)
    snackbar.addMessage('Errore durante l’avvio dello scrape', 'error', err)
  } finally {
    scraping.value = false
  }
}
</script>
<template>
  <section>
    <Toolbar label="Admin"> </Toolbar>
    <v-container class="flex flex-wrap gap-3 justify-start items-end">
      <DialogsHandleScrapingOPCards class="h-[100px]" />
      <!-- <v-btn height="100px" to="/stores">Vai a Negozi</v-btn>
      <v-btn height="100px" to="/games">Vai a Giochi</v-btn>
      <v-btn height="100px" to="/brands">Vai a Brands</v-btn> -->
      <AdminActionsUpdateCardsListOnDb height="100px" />
      <v-btn to="admin/set-illustration-type">SETTA ILLUSTRAZIONI</v-btn>
      <v-btn to="admin/set-price-services">SETTA SLUGS SERVIZI PREZZI</v-btn>
      <v-btn @click="scrapeAllPrices">SCRAPA PREZZI</v-btn>
    </v-container>
  </section>
</template>
