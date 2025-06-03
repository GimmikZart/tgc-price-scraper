<script setup>
definePageMeta({
    middleware: 'admin'
})
</script>
<template>
    <div>
        <Toolbar label="Admin">
        </Toolbar>
        <v-container>
            <DialogsHandleScrapingOPCards />
        </v-container>
    </div>
</template>