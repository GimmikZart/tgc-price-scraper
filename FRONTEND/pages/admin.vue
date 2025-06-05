<script setup>
definePageMeta({
    middleware: 'admin'
})
</script>
<template>
    <section>
        <Toolbar label="Admin">
        </Toolbar>
        <v-container>
            <DialogsHandleScrapingOPCards />
        </v-container>
    </section>
</template>