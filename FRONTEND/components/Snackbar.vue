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
    duration: {
        type: Number,
        default: 5000
    },
    isFloating: {
        type: Boolean,
        default: true
    }
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
    if(snackbar.lastMessageStored?.id === props.id) {
        snackbar.lastMessageStored = null
    }
}
</script>
<template>
    <div class="w-full mx-auto border rounded p-3 flex gap-3 items-center" :class="snackClasses">
        <v-btn v-if="isFloating" size="xs" variant="text" to="/logs" class="pa-0">
            <v-icon>mdi-information</v-icon>
        </v-btn>
        <div class="flex flex-col">
            <h3 class="font-medium text-white">{{ title }}</h3>
            <p v-if="message" class="font-italic break-all text-sm  text-white">{{ message }}</p>
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