<script setup>
import { useSnackbar } from '@/stores/useSnackbar'

const props = defineProps({
    id: {
        type: Number,
        required: true
    },
    title: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: false
    },
    type: {
        type: String,
        default: 'info'
    },
})

const snackbar = useSnackbar()

const snackClasses = computed(() => {
    return {
        'bg-green-500': props.type === 'success',
        'bg-red-500': props.type === 'error',
        'bg-yellow-500': props.type === 'warning',
        'bg-blue-500': props.type === 'info',
    }
})

function removeMessage() {
    snackbar.removeMessage(props.id)
}
</script>
<template>
    <div class="w-full rounded p-3 my-3 flex items-center" :class="snackClasses">
        <div class="flex flex-col">
            <h3 class="font-medium text-white">{{ title }}</h3>
            <p v-if="message" class="font-italic text-sm  text-white">{{ message }}</p>
        </div>
        <v-spacer/>
        <v-btn
            variant="plain"
            color="white"
            @click="removeMessage"
        >
            <v-icon color="white">mdi-close</v-icon>
        </v-btn>
    </div>
</template>