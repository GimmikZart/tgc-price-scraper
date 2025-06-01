<script setup>
import { useSnackbar } from '@/stores/useSnackbar'
const snackbar = useSnackbar()

const snackbarVisible = ref(false)
const lastMessage = ref(null)

function showSnackbars(){
    snackbarVisible.value = true
}
function hideSnackbars(){
    snackbarVisible.value = false
}
function removeAllSnackbars(){
    snackbar.removeAll()
}

watch(() => snackbar.lastMessageStored, (newVal) => {
    if(newVal) {
        lastMessage.value = newVal
        setTimeout(() => {
            lastMessage.value = null
        }, lastMessage.value.duration);
    } else {
        lastMessage.value = null
    }
}, { immediate: true })
</script>
<template>
    <div class="fixed bottom-[60px] lg:bottom-5 right-5 w-full lg:w-1/5 flex justify-end z-[2000]">
        <div v-if="!snackbarVisible" class="flex flex-col items-end gap-3">
            <Snackbar
                v-if="lastMessage"
                :id="lastMessage.id"
                :title="lastMessage.title"
                :message="lastMessage.message"
                :type="lastMessage.type"
                :duration="lastMessage.duration"
            />
            <v-btn  rounded="0" class="w-full lg:w-auto ml-auto" color="black" @click="showSnackbars()">
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
        </div>
        <div v-else class="h-dvh bg-black/70 border px-8 gap-2 border-black w-full backdrop-blur-sm overflow-auto flex flex-col justify-end">
            <Snackbar
                v-for="msg in snackbar.messages"
                :key="msg.id"
                :id="msg.id"
                :title="msg.title"
                :message="msg.message"
                :type="msg.type"
                :duration="null"
            />
            <div class="flex gap-2 p-2">
                <v-btn color="black" class="grow" @click="removeAllSnackbars">PULISCI AVVISI</v-btn>
                <v-btn color="white" variant="flat" class="grow" @click="hideSnackbars()">NASCONDI</v-btn>
            </div>
        </div>
    </div>
</template>