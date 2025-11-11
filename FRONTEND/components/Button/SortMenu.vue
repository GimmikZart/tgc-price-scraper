<script setup>
import { computed } from 'vue'
import { useCardSort } from '@/composables/useCardSort'

const props = defineProps({
  modelKey: { type: String, default: 'name' },
  modelDir: { type: String, default: 'asc' },
})
const emit = defineEmits(['update:key', 'update:dir', 'change'])

const sort = useCardSort(props.modelKey, props.modelDir)
const icon = computed(() => sort.sortIcon.value || 'mdi-sort')
const label = computed(() => sort.sortLabel.value)

function choose(key, dir) {
  sort.setSort(key, dir)
  emit('update:key', key)
  emit('update:dir', dir)
  emit('change', { key, dir })
}
</script>

<template>
  <ButtonMenu
    :icon="icon"
    :label="label"
    color="orange"
    multi
    transition
  >
    <template #buttons>
      <div class="w-[200px] space-y-2">
        <!-- Sezione: Nome -->
        <div class="px-1">
          <div class="text-[10px] uppercase tracking-wide text-neutral-400 mb-1">Nome</div>
          <div class="grid grid-cols-2 gap-2">
            <ButtonMenu
              class="scale-90 -my-1"
              icon="mdi-sort-alphabetical-ascending"
              label="A→Z"
              transition
              :delay="60"
              :icon-color="(sort.sortKey === 'name' && sort.sortDir === 'asc') ? 'green' : null"
              @click="choose('name','asc')"
            />
            <ButtonMenu
              class="scale-90 -my-1"
              icon="mdi-sort-alphabetical-descending"
              label="Z→A"
              transition
              :delay="120"
              :icon-color="(sort.sortKey === 'name' && sort.sortDir === 'desc') ? 'green' : null"
              @click="choose('name','desc')"
            />
          </div>
        </div>

        <div class="h-px bg-neutral-800 mx-1"></div>

        <!-- Sezione: Costo -->
        <div class="px-1">
          <div class="text-[10px] uppercase tracking-wide text-neutral-400 mb-1">Costo</div>
          <div class="grid grid-cols-2 gap-2">
            <ButtonMenu
              class="scale-90 -my-1"
              icon="mdi-sort-numeric-ascending"
              label="Crescente"
              transition
              :delay="180"
              :icon-color="(sort.sortKey === 'cost' && sort.sortDir === 'asc') ? 'green' : null"
              @click="choose('cost','asc')"
            />
            <ButtonMenu
              class="scale-90 -my-1"
              icon="mdi-sort-numeric-descending"
              label="Decrescente"
              transition
              :delay="240"
              :icon-color="(sort.sortKey === 'cost' && sort.sortDir === 'desc') ? 'green' : null"
              @click="choose('cost','desc')"
            />
          </div>
        </div>

        <div class="h-px bg-neutral-800 mx-1"></div>

        <!-- Sezione: Power -->
        <div class="px-1">
          <div class="text-[10px] uppercase tracking-wide text-neutral-400 mb-1">Power</div>
          <div class="grid grid-cols-2 gap-2">
            <ButtonMenu
              class="scale-90 -my-1"
              icon="mdi-sort-numeric-ascending"
              label="Crescente"
              transition
              :delay="300"
              :icon-color="(sort.sortKey === 'power' && sort.sortDir === 'asc') ? 'green' : null"
              @click="choose('power','asc')"
            />
            <ButtonMenu
              class="scale-90 -my-1"
              icon="mdi-sort-numeric-descending"
              label="Decrescente"
              transition
              :delay="360"
              :icon-color="(sort.sortKey === 'power' && sort.sortDir === 'desc') ? 'green' : null"
              @click="choose('power','desc')"
            />
          </div>
        </div>
        <div class="h-px bg-neutral-800 mx-1"></div>
        <!-- Sezione: Prezzo -->
        <div class="px-1">
          <div class="text-[10px] uppercase tracking-wide text-neutral-400 mb-1">Prezzo</div>
          <div class="grid grid-cols-2 gap-2">
            <ButtonMenu
              class="scale-90 -my-1"
              icon="mdi-sort-numeric-ascending"
              label="Crescente"
              transition
              :delay="300"
              :icon-color="(sort.sortKey === 'price' && sort.sortDir === 'asc') ? 'green' : null"
              @click="choose('price','asc')"
            />
            <ButtonMenu
              class="scale-90 -my-1"
              icon="mdi-sort-numeric-descending"
              label="Decrescente"
              transition
              :delay="360"
              :icon-color="(sort.sortKey === 'price' && sort.sortDir === 'desc') ? 'green' : null"
              @click="choose('price','desc')"
            />
          </div>
        </div>
      </div>
    </template>
  </ButtonMenu>
</template>
