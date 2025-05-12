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
    <div class="fixed bottom-0 right-0 w-full lg:w-1/5 flex justify-end">
        <v-btn v-if="!snackbarVisible" class="w-full lg:w-auto lg:m-5" color="purple" @click="showSnackbars()">
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
        <div v-if="snackbarVisible" class="z-[2500] h-screen border p-2 gap-2 border-black w-full backdrop-blur-sm overflow-auto flex flex-col justify-end">
            <Snackbar
                v-for="msg in snackbar.messages"
                :key="msg.id"
                :id="msg.id"
                :title="msg.title"
                :message="msg.message"
                :type="msg.type"
                :duration="msg.duration"
            />
            <div class="flex bg-black gap-2 p-2">
                <v-btn color="red" class="grow" @click="removeAllSnackbars">PULISCI AVVISI</v-btn>
                <v-btn class="grow" @click="hideSnackbars()">NASCONDI</v-btn>
            </div>
        </div>
    </div>
</template>