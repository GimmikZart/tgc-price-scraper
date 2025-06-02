<script setup>
import { fetchStores } from '@/api/stores';
import { useUserAuth } from '@/stores/useUserAuth';

const userAuth = useUserAuth()

const {data: stores} = await useAsyncData('stores', () =>
fetchStores()
)

async function refreshData() {
    await refreshNuxtData(['stores']);
}

definePageMeta({
    middleware: 'auth'
})
</script>
<template>
    <div>
        <Toolbar label="Negozi">
            <template #actions>
                <DialogsHandleStore v-if="userAuth.isAdmin" @refresh-data="refreshData"/>
            </template>
        </Toolbar>
        
        <div class="grid grid-cols-1 lg:grid-cols-5 gap-5">
            <AppCardStore 
                v-for="store in stores"
                :key="store.id"
                :id="store.id"
                :name="store.name"
                :logoUrl="store.logo_url"
                :website="store.website"
                :regularPriceSelector="store.regular_price_selector"
                :originalPriceSelector="store.original_price_selector"
                :discountedPriceSelector="store.discounted_price_selector"
                :imageSelector="store.image_selector"
            />
        </div>
    </div>
</template>