<script setup>
import { useSnackbar } from '@/stores/useSnackbar'
const snackbar = useSnackbar()

const snackbarVisible = ref(false)

function showSnackbars(){
    snackbarVisible.value = true
}
function hideSnackbars(){
    snackbarVisible.value = false
}
function removeAllSnackbars(){
    snackbar.removeAll()
}
</script>
<template>
    <div class="fixed bottom-[60px] lg:bottom-5 right-0 w-full lg:w-1/5 flex justify-end z-[2500]">
        <v-btn v-if="!snackbarVisible" rounded="0" class="w-full lg:w-auto lg:mx-5" color="purple" @click="showSnackbars()">
            AVVISI 
            <v-badge
                color="info"
                :content="snackbar.messageCountByType.info"
                inline
            ></v-badge>
            <v-badge
                color="success"
                :content="snackbar.messageCountByType.success"
                inline
            ></v-badge>
            <v-badge
                color="error"
                :content="snackbar.messageCountByType.error"
                inline
            ></v-badge>
        </v-btn>
        <div v-if="snackbarVisible" class="h-screen bg-purple-500/20 border p-2 gap-2 border-black w-full backdrop-blur-sm overflow-auto flex flex-col justify-end">
            <Snackbar
                v-for="msg in snackbar.messages"
                :key="msg.id"
                :id="msg.id"
                :title="msg.title"
                :message="msg.message"
                :type="msg.type"
                :duration="msg.duration"
            />
            <div class="flex gap-2 p-2">
                <v-btn color="purple" class="grow" @click="removeAllSnackbars">PULISCI AVVISI</v-btn>
                <v-btn color="black" variant="outlined" class="grow" @click="hideSnackbars()">NASCONDI</v-btn>
            </div>
        </div>
    </div>
</template>