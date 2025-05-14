<script setup>
import {useSnackbar} from '@/stores/useSnackbar'

const snackbar = useSnackbar()
const isLoading = ref(false);

</script>
<template>
<div class="w-full flex gap-5 fixed bottom-0 right-0 items-center justify-start p-2 bg-black">
    <NuxtLink to="/"  class="text-white py-1 px-3 cursor-pointer rounded-lg">
        <v-btn color="black">
            <v-icon size="30" icon="mdi-cards"></v-icon>
        </v-btn>
    </NuxtLink>
    <NuxtLink to="/brands"  class="bg-black text-white py-1 px-3 cursor-pointer rounded-lg">
        <v-btn color="black">
            <v-icon size="30" icon="mdi-domain"></v-icon>
        </v-btn>
    </NuxtLink>
    <NuxtLink to="/games"  class="bg-black text-white py-1 px-3 cursor-pointer rounded-lg">
        <v-btn color="black">
            <v-icon size="30" icon="mdi-gamepad-variant"></v-icon>
        </v-btn>
    </NuxtLink>
    <NuxtLink to="/stores" class="bg-black text-white py-1 px-3 cursor-pointer rounded-lg">
        <v-btn color="black">
            <v-icon size="30" icon="mdi-storefront"></v-icon>
        </v-btn>
    </NuxtLink>
</div>
</template>