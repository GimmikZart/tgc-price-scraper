<script setup>
const props = defineProps({
    card: {
        type: Object,
        required: true
    }
});

const cardIsOpen = ref(false)
</script>
<template>
    <div>
        <v-img :src="card.image" :lazy-src="card.image" width="100%" height="auto" class="border shadow-md cursor-zoom-in" cover @click="cardIsOpen = true" :alt="card.name">
            <template v-slot:placeholder>
                <div class="d-flex align-center justify-center fill-height">
                    <v-progress-circular
                        color="grey-lighten-4"
                        indeterminate
                    ></v-progress-circular>
                </div>
            </template>
        </v-img>
        <div v-if="cardIsOpen" class="fixed inset-0 bg-black/80 flex items-center justify-center z-50 px-10 cursor-zoom-out" @click="cardIsOpen = false">
            <v-img :src="card.image" :lazy-src="card.image" class="h-3/4 w-auto" contain @click="cardIsOpen = true" :alt="card.name" >
                <template v-slot:placeholder>
                    <div class="d-flex align-center justify-center fill-height">
                        <v-progress-circular
                            color="grey-lighten-4"
                            indeterminate
                        ></v-progress-circular>
                    </div>
                </template>
            </v-img>
        </div>
    </div>
</template>