<script setup>
import { computed } from 'vue'

const props = defineProps({
  currentDeck: { type: Object, required: true },
})

// Comodità: tutte le carte “espanse” già moltiplicate per count
const expandedCards = computed(() => {
  const arr = []
  for (const c of props.currentDeck ?? []) {
    console.log("card in deck:", c);
    
    const copies = c.count
    for (let i = 0; i < copies; i++) arr.push(c)
  }
  return arr
})

/** -------------------- BAR: distribuzione cost (0..10) --------------- */
const costBuckets = computed(() => {
  const buckets = Array.from({ length: 11 }, (_, i) => ({ cost: i, qty: 0 }))
  for (const c of expandedCards.value) {
    const k = Number.isFinite(c.cost) ? Math.max(0, Math.min(10, c.cost)) : null
    if (k !== null) buckets[k].qty++
  }
  return buckets
})

const costCategories = { qty: { name: 'Costi', color: '#60a5fa' } }
const costXAxisFormatter = (i) => `${costBuckets.value[i]?.cost ?? ''}`
/* --------------------------------------------------------------------- */

</script>

<template>
  <div class="h-auto bg-black p-4 space-y-8">
    <h2 class="text-white text-2xl font-semibold">Deck Stats</h2>

    <div class="grid gap-6 md:grid-cols-3">
    

      <!-- BAR: Cost 0..10 -->
      <div class="col-span-1 bg-white/5 rounded-2xl p-4">
        <h3 class="text-white font-medium mb-2">I tuoi costi</h3>
        <ClientOnly>
          <BarChart
            :data="costBuckets"
            :height="200"
            :categories="costCategories"
            :y-axis="['qty']"
            :x-num-ticks="11"
            :y-grid-line="true"
            :radius="5"
            :x-formatter="costXAxisFormatter"
            :hide-legend="true"
          />
        </ClientOnly>
      </div>
    </div>
  </div>
</template>
