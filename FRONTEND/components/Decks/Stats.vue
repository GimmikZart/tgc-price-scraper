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
</script>

<template>
  <div class="h-auto bg-black p-4 space-y-8">
    <h2 class="text-white text-2xl font-semibold">Deck Stats</h2>

    <div class="grid gap-6 md:grid-cols-3">
      <!-- DONUT: Distribuzione colori -->
      <div class="col-span-1 bg-white/5 rounded-2xl p-4">
        <h3 class="text-white font-medium mb-2">Distribuzione colori</h3>
        <ClientOnly>
          <DonutChart
            :data="donutData"
            :categories="donutCategories"
            :height="220"
            :arc-width="50"
            :pad-angle="0.00"
            type="half"
            :legend-position="'right'"
          >
            <div class="text-center">
              <div class="font-semibold">Label</div>
              <div class="text-muted">2 seconds ago</div>
            </div>
          </DonutChart>
        </ClientOnly>
      </div>

      <!-- BAR: Cost 0..10 -->
      <div class="col-span-1 bg-white/5 rounded-2xl p-4">
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
    </div>
  </div>
</template>
