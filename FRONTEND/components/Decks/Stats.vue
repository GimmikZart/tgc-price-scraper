<script setup>
import { computed } from 'vue'

const props = defineProps({
  // ⬇️ currentDeck è l'ARRAY di carte
  currentDeck: { type: Array, required: true },
})

/* -------- Palette One Piece “classica” (puoi cambiare i codici) ------- */
const COLOR_HEX = {
  Red:    '#ef4444',
  Green:  '#22c55e',
  Blue:   '#3b82f6',
  Purple: '#a855f7',
  Black:  '#111827',
  Yellow: '#eab308',
  // opzionale fallback se compaiono colori non mappati:
  // Colorless: '#9ca3af',
}

/* Copie espanse: ogni carta ripetuta per count */
const expandedCards = computed(() => {
  const out = []
  for (const c of (props.currentDeck ?? [])) {
    const copies = Number.isFinite(c.count) ? c.count : 1
    for (let i = 0; i < copies; i++) out.push(c)
  }
  return out
})

/* ---------------------- DONUT: distribuzione colori ------------------- */
const colorCountMap = computed(() => {
  const m = new Map()
  for (const c of expandedCards.value) {
    const colors = c.color ?? c.colors ?? []
    for (const col of colors) {
      const key = String(col)
      m.set(key, (m.get(key) ?? 0) + 1) // conta per copia
    }
  }
  return m
})

/* Etichette ordinate per frequenza (desc) */
const donutLabels = computed(() =>
  [...colorCountMap.value.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([k]) => k)
)

/* Percentuali allineate alle label */
const donutData = computed(() => {
  const total = [...colorCountMap.value.values()].reduce((a, b) => a + b, 0)
  if (!total) return []
  return donutLabels.value.map(lbl =>
    +(colorCountMap.value.get(lbl) * 100 / total).toFixed(2)
  )
})

/* Categories per nuxt-charts con colore fissato a mano */
const donutCategories = computed(() =>
  Object.fromEntries(
    donutLabels.value.map(lbl => [
      lbl,
      { name: lbl, color: COLOR_HEX[lbl] ?? '#9ca3af' } // fallback grigio
    ])
  )
)

/* ---------------------- BAR: cost (resta il tuo) ---------------------- */
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

/* ---------------------- CategoryDistribution: distribuzione abilità ---------------------- */
const abilityCountMap = computed(() => {
  const m = new Map()
  for (const c of expandedCards.value) {
    const abilities = c.abilityKeywords || ['Nessuna']
    for (const ab of abilities) {
      const key = String(ab.replace(/[\[\]]/g, ""))
      m.set(key, (m.get(key) ?? 0) + 1) // conta per copia
    }
  }
  return m
})
</script>

<template>
  <div class="h-auto bg-black p-4 space-y-8">
    <h2 class="text-white text-2xl font-semibold">Deck Stats</h2>

    <div class="grid gap-6 md:grid-cols-3">
      <!-- BAR: Cost 0..10 -->
      <div class="col-span-1 bg-white/5 rounded-2xl p-5">
        <h3 class="text-white font-medium mb-2">I tuoi costi (0–10)</h3>
        <ClientOnly>
          <BarChart
            :data="costBuckets"
            :height="220"
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

      <!-- TRACKER: triggers -->
      <div class="col-span-1 bg-white/5 rounded-2xl p-5">
        <h3 class="text-white font-medium mb-2">Triggers 
          <span class="text-white/50 text-xs ml-3">( {{ expandedCards.filter(c => c.trigger).length }} / {{ expandedCards.length }} )</span>
        </h3>
        <div class="w-full flex gap-1 justify-start">
          <div 
            v-for="card in [...expandedCards].sort((a, b) => (a.trigger ? -1 : 1))"
            :key="card.id" 
            class="h-[40px] bg-white/20" 
            :class="{ 'bg-yellow': card.trigger != null }" 
            :style="`width: ${(1 / 50) * 100}%`">
          </div>
          <div 
            v-for="cardUnset in 50 - expandedCards.length" 
            :key="cardUnset" 
            class="h-[40px] bg-white/5" 
            :style="`width: ${(1 / 50) * 100}%`">
          </div>
        </div>
      </div>

      <!-- DONUT: Distribuzione colori -->
      <div v-if="donutData[1]" class="col-span-1 bg-white/5 rounded-2xl p-5">
        <h3 class="text-white font-medium mb-2">Distribuzione colori</h3>
        <ClientOnly>
          <DonutChart
            :data="donutData"
            :categories="donutCategories"
            :height="220"
            :arc-width="50"
            :pad-angle="0.00"
            type="half"
            :legend-position="'center'"
          >
            <div class="text-center mt-12 p-1 px-3 rounded-full">
              <div class=" text-base bg-white/20 px-3 rounded-full font-bold">
                <span :style="{ color: donutCategories[donutLabels[0]].color }">
                  {{ donutData[0].toFixed() }}%
                </span>
                <span class="text-white mx-1">/</span>
                <span :style="{ color: donutCategories[donutLabels[1]].color }">
                  {{ donutData[1].toFixed() }}%
                </span>
              </div>
            </div>
          </DonutChart>
        </ClientOnly>
      </div>
      <div class="col-span-1 bg-white/5 rounded-2xl p-5">
        <h3 class="text-white/50 text-center font-medium mb-2">More incoming...</h3>
      </div>
    </div>
  </div>
</template>
