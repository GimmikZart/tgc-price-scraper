<script setup>
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/it'
import 'dayjs/locale/en'
import { useRouter } from 'vue-router'

dayjs.extend(relativeTime)
dayjs.locale('it')

const props = defineProps({
    set: {
        type: Object,
        required: true,
    },
    editMode: {
        type: Boolean,
        default: false,
    },
})

const emit = defineEmits(['edit-set']);
const router = useRouter()

const editClass = computed(() => {
  return {
    'border border-4 border-yellow-500 swing-anim': props.editMode,
  }
});


const isReleased = computed(() => {
    return isProductReleased(props.set.publish_date);
});

const releaseDate = computed(() => {
    if (props.set.publish_date) {
        return dayjs(props.set.publish_date).fromNow()
    }
    return null
});

function handleClick() {
  if (props.editMode) {
    emit('edit-set', props.set)
  } else {
    router.push(`${props.set.game.slug}/${props.set.slug}`)
  }
}
</script>
<template>
    <v-card flat class="h-100 pa-2" :class="editClass" @click="handleClick" style="transition: all 0.1s ease-in-out;">
        <div class="h-100 flex flex-col justify-between">
            <v-img
                width="100%"
                height="200px"
                :src="set.image_url"
                contain
            ></v-img>
            <v-card-text class="pa-2 lg:pa-4">
                <h3 class="text-xs font-bold text-black/50 lg:text-base">{{ set.code }} </h3>
                <h3 class="lg:text-xl font-bold text-truncate">{{ set.name }}</h3>
                <div class="text-xs flex items-center gap-2 mt-2">
                    <v-icon v-if="!isReleased" icon="mdi-timer-sand" color="red" size="15"></v-icon>
                    <v-icon v-else icon="mdi-check-outline" color="green" size="15"></v-icon>
                    <span :class="isReleased ? 'text-green' : 'text-red'">{{releaseDate}}</span>
                </div>
                <div class="flex items-center justify-end gap-1 mt-4">
                    <v-icon icon="mdi-cube-outline" color="black" size="20"></v-icon>
                    <span class="text-xs lg:text-base">{{ set.products }}</span>
                </div>
            </v-card-text>
        </div>
    </v-card>
</template>