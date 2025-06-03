<script setup>
import { useSnackbar } from '@/stores/useSnackbar'
const snackbar = useSnackbar()

</script>
<template>
    <div class="h-dvh fixed bottom-[60px] lg:bottom-5 pt-15 lg:right-5 w-full lg:w-1/5 flex justify-end z-[2000] px-5">
        <div class="min-h-0 overflow-y-auto flex w-full flex-col items-end gap-3">
            <Snackbar
                v-for="msg in snackbar.timedMessages"
                :key="msg.id"
                :id="msg.id"
                :title="msg.title"
                :message="msg.message"
                :type="msg.type"
                :duration="msg.duration"
            />
        </div>
    </div>
</template>