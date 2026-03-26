<script setup>
import { computed } from 'vue'
import { useCardSort } from '@/composables/useCardSort'

const props = defineProps({
  modelKey: { type: String, default: 'publish_date' },
  modelDir: { type: String, default: 'desc' },
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
        <div class="px-1">
          <div class="text-[10px] uppercase tracking-wide text-neutral-400 mb-1">Data Uscita</div>
          <div class="grid grid-cols-2 gap-2">
            <ButtonMenu
              class="scale-90 -my-1"
              icon="mdi-calendar-blank-outline"
              label="Piu recenti"
              transition
              :delay="30"
              :icon-color="(sort.sortKey === 'publish_date' && sort.sortDir === 'desc') ? 'green' : null"
              @click="choose('publish_date','desc')"
            />
            <ButtonMenu
              class="scale-90 -my-1"
              icon="mdi-calendar-blank-outline"
              label="Piu vecchie"
              transition
              :delay="60"
              :icon-color="(sort.sortKey === 'publish_date' && sort.sortDir === 'asc') ? 'green' : null"
              @click="choose('publish_date','asc')"
            />
          </div>
        </div>

        <div class="h-px bg-neutral-800 mx-1"></div>

        <div class="px-1">
          <div class="text-[10px] uppercase tracking-wide text-neutral-400 mb-1">Nome</div>
          <div class="grid grid-cols-2 gap-2">
            <ButtonMenu
              class="scale-90 -my-1"
              icon="mdi-sort-alphabetical-ascending"
              label="A-Z"
              transition
              :delay="90"
              :icon-color="(sort.sortKey === 'name' && sort.sortDir === 'asc') ? 'green' : null"
              @click="choose('name','asc')"
            />
            <ButtonMenu
              class="scale-90 -my-1"
              icon="mdi-sort-alphabetical-descending"
              label="Z-A"
              transition
              :delay="120"
              :icon-color="(sort.sortKey === 'name' && sort.sortDir === 'desc') ? 'green' : null"
              @click="choose('name','desc')"
            />
          </div>
        </div>

        <div class="h-px bg-neutral-800 mx-1"></div>

        <div class="px-1">
          <div class="text-[10px] uppercase tracking-wide text-neutral-400 mb-1">Costo evocazione</div>
          <div class="grid grid-cols-2 gap-2">
            <ButtonMenu
              class="scale-90 -my-1"
              icon="mdi-sort-numeric-ascending"
              label="Crescente"
              transition
              :delay="150"
              :icon-color="(sort.sortKey === 'cost' && sort.sortDir === 'asc') ? 'green' : null"
              @click="choose('cost','asc')"
            />
            <ButtonMenu
              class="scale-90 -my-1"
              icon="mdi-sort-numeric-descending"
              label="Decrescente"
              transition
              :delay="180"
              :icon-color="(sort.sortKey === 'cost' && sort.sortDir === 'desc') ? 'green' : null"
              @click="choose('cost','desc')"
            />
          </div>
        </div>

        <div class="h-px bg-neutral-800 mx-1"></div>

        <div class="px-1">
          <div class="text-[10px] uppercase tracking-wide text-neutral-400 mb-1">Power</div>
          <div class="grid grid-cols-2 gap-2">
            <ButtonMenu
              class="scale-90 -my-1"
              icon="mdi-sort-numeric-ascending"
              label="Crescente"
              transition
              :delay="210"
              :icon-color="(sort.sortKey === 'power' && sort.sortDir === 'asc') ? 'green' : null"
              @click="choose('power','asc')"
            />
            <ButtonMenu
              class="scale-90 -my-1"
              icon="mdi-sort-numeric-descending"
              label="Decrescente"
              transition
              :delay="240"
              :icon-color="(sort.sortKey === 'power' && sort.sortDir === 'desc') ? 'green' : null"
              @click="choose('power','desc')"
            />
          </div>
        </div>

        <div class="h-px bg-neutral-800 mx-1"></div>

        <div class="px-1">
          <div class="text-[10px] uppercase tracking-wide text-neutral-400 mb-1">Prezzo di mercato</div>
          <div class="grid grid-cols-2 gap-2">
            <ButtonMenu
              class="scale-90 -my-1"
              icon="mdi-sort-numeric-ascending"
              label="Crescente"
              transition
              :delay="270"
              :icon-color="(sort.sortKey === 'price' && sort.sortDir === 'asc') ? 'green' : null"
              @click="choose('price','asc')"
            />
            <ButtonMenu
              class="scale-90 -my-1"
              icon="mdi-sort-numeric-descending"
              label="Decrescente"
              transition
              :delay="300"
              :icon-color="(sort.sortKey === 'price' && sort.sortDir === 'desc') ? 'green' : null"
              @click="choose('price','desc')"
            />
          </div>
        </div>
      </div>
    </template>
  </ButtonMenu>
</template>
