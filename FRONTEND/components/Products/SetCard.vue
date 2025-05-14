<script setup>
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/it'
import 'dayjs/locale/en'

dayjs.extend(relativeTime)
dayjs.locale('it')

const props = defineProps({
    id: {
        type: Number,
        required: true
    },
    name: {
        type: String,
        required: true
    },
    code: {
        type: String,
        required: false
    },
    imageUrl: {
        type: String,
        required: true
    },
    publishDate: {
        type: String,
        required: true
    },
    setSlug: {
        type: String,
        required: true
    },
    products: {
        type: Number,
        required: true
    },
    gameSlug: {
        type: String,
        required: true
    },
})

const isReleased = computed(() => {
    return isProductReleased(props.publishDate);
});

const releaseDate = computed(() => {
    if (props.publishDate) {
        return dayjs(props.publishDate).fromNow()
    }
    return null
});
</script>
<template>
    <v-card class="h-100" variant="flat">
        <NuxtLink :to="`${gameSlug}/${setSlug}`">
            <div class="h-100 pa-3 flex flex-col justify-between">
                <v-img
                    width="100%"
                    height="200px"
                    :src="imageUrl"
                    contain
                ></v-img>
                <v-card-text class="pa-2 lg:pa-4">
                    <h3 class="text-xs font-bold text-black/50 lg:text-base">{{ code }} </h3>
                    <h3 class="lg:text-xl font-bold text-truncate">{{ name }}</h3>
                    <div class="text-xs flex items-center gap-2 mt-2">
                        <v-icon v-if="!isReleased" icon="mdi-timer-sand" color="red" size="15"></v-icon>
                        <v-icon v-else icon="mdi-check-outline" color="green" size="15"></v-icon>
                        <span :class="isReleased ? 'text-green' : 'text-red'">{{releaseDate}}</span>
                    </div>
                    <div class="flex items-center justify-end gap-1 mt-4">
                        <v-icon icon="mdi-cube-outline" color="black" size="20"></v-icon>
                        <span class="text-xs lg:text-base">{{ products }}</span>
                    </div>
                </v-card-text>
            </div>
        </NuxtLink>
    </v-card>
</template>