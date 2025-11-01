<script setup>
import { computed } from 'vue'
import { useCardSort } from '@/composables/useCardSort'

const props = defineProps({
  modelKey: { type: String, default: 'name' }, // 'name' | 'cost' | 'power'
  modelDir: { type: String, default: 'asc' },  // 'asc'  | 'desc'
})

const emit = defineEmits(['update:key', 'update:dir', 'change'])

const sort = useCardSort(props.modelKey, props.modelDir)

// Icona STRINGA, non Ref: fix al problema icone
const icon = computed(() => sort.sortIcon.value || 'mdi-sort')
const label = computed(() => sort.sortLabel.value) // es: "Name ↑"

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
      <!-- una voce = un ButtonMenu figlio -->
      <ButtonMenu
        v-for="(opt, i) in sort.options"
        :key="`${opt.key}-${opt.dir}`"
        :icon="opt.icon"
        :label="opt.label"
        :icon-color="(opt.key === sort.sortKey && opt.dir === sort.sortDir) ? 'green' : null"
        transition
        :delay="i * 60"
        @click="choose(opt.key, opt.dir)"
      />
    </template>
  </ButtonMenu>
</template>
