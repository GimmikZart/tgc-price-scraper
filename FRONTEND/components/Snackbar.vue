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
    <div class="w-full mx-auto border px-3 py-2 flex gap-2 items-center" :class="snackClasses">
        <v-btn v-if="isFloating" size="xs" variant="text" to="/logs" class="pa-0">
            <v-icon>mdi-information</v-icon>
        </v-btn>
        <div class="flex flex-col">
            <h3 class="font-medium text-xs text-white text-ellipsis">{{ title }}</h3>
            <p v-if="message" class="font-italic break-all text-xs  text-white text-ellipsis">{{ message }}</p>
        </div>
        <v-spacer/>
        <v-btn
            size="xs" 
            variant="text"
            @click="removeMessage"
        >
            <v-icon color="white">mdi-close</v-icon>
        </v-btn>
    </div>
</template>