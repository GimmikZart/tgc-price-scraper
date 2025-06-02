<script setup>
import { useSnackbar } from '@/stores/useSnackbar'
const snackbar = useSnackbar()
</script>
<template>
    <section class="h-dvh flex flex-col pb-20">
        <Toolbar label="Avvisi"> 
            <template #actions>
                <v-btn color="white" class="grow" @click="snackbar.removeAll">PULISCI AVVISI</v-btn>
            </template>
        </Toolbar>
        <v-container class="h-full flex flex-col justify-end gap-3">
            <Snackbar
                v-for="msg in snackbar.messages"
                :key="msg.id"
                :id="msg.id"
                :title="msg.title"
                :message="msg.message"
                :type="msg.type"
                :duration="null"
            />
        </v-container>
    </section>
</template>
