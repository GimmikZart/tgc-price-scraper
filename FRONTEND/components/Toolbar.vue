<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()

const props = defineProps({
    label: {
        type: String,
        required: true
    },
    vertical: {
        type: Boolean,
        default: false
    },
    backButton: {
        type: Boolean,
        default: false
    }
})

function goBack() {
    router.back()
}
</script>
<template>
    <div class="bg-black w-full sticky top-0 left-0 p-4 z-[1000] flex items-center border-b" :class="vertical ? 'flex-col' : 'flex-row'">
        <v-btn v-if="backButton" variant="plain" @click="goBack">
            <v-icon size="30" icon="mdi-chevron-left"></v-icon>
        </v-btn>
        <h2 class="font-bold text-lg">{{ label }}</h2>
        <v-spacer></v-spacer>
        <div class="flex justify-end items-center">
            <slot name="actions" />
        </div>
    </div>
</template>