<script setup>
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
    gameSlug: {
        type: String,
        required: true
    },
})

const isReleased = computed(() => {
    return isProductReleased(props.publishDate);
});
</script>
<template>
    <v-card class="h-100">
        <div class="h-100 flex flex-col justify-between">
            <v-img
                width="100%"
                height="200px"
                :src="imageUrl"
                contain
            ></v-img>
            <v-card-text class="pa-2 lg:pa-4">
                <h3 class="text-xs font-bold text-black/50 lg:text-base">{{ code }} </h3>
                <h3 class="text- lg:text-xl font-bold">{{ name }}</h3>
                <v-chip v-if="!isReleased" color="red" class="my-3">
                    <span class="text-xs lg:text-sm">{{publishDate}}</span>
                </v-chip>
                <v-chip v-else color="green" class="my-3">
                    <span class="text-xs lg:text-sm">{{publishDate}}</span>
                </v-chip>
            </v-card-text>
            <v-card-actions>
                <v-btn color="black" variant="outlined" :to="`${gameSlug}/${setSlug}`" block>SCEGLI</v-btn>
            </v-card-actions>
        </div>
    </v-card>
</template>