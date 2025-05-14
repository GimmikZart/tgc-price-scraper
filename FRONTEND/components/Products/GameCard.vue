<script setup>
import { useRouter } from 'vue-router'

const props = defineProps({
  game: {
    type: Object,
    required: true,
  },
  editMode: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['edit-product']);
const router = useRouter()

const editClass = computed(() => {
  return {
    'border border-4 border-yellow-500 swing-anim': props.editMode,
  }
})

function handleClick() {
  if (props.editMode) {
    emit('edit-game', props.game)
  } else {
    router.push(`/${props.game.slug}`)
  }
}
</script>
<template>
    <v-card flat class="h-100 pa-2" :class="editClass" @click="handleClick" style="transition: all 0.1s ease-in-out;">
      <v-img
          width="100%"
          height="100px"
          :src="game.logo_url"
          contain
      ></v-img>
    </v-card>
</template>
<style>
@keyframes swing {
  0%   { transform: rotate(-0.5deg); }
  50%  { transform: rotate(0.5deg); }
  100% { transform: rotate(-0.5deg); }
}

.swing-anim {
  animation: swing 0.5s infinite ease-in-out;
}

</style>