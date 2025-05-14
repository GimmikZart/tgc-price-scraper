<script setup>
const {data: stores} = await useAsyncData('stores', () =>
useGetStores()
)

async function refreshData() {
    await refreshNuxtData(['stores']);
}
</script>
<template>
    <div>
        <Toolbar label="Negozi">
            <template #actions>
                <DialogsHandleStore @refresh-data="refreshData"/>
            </template>
        </Toolbar>
        
        <div class="grid grid-cols-1 lg:grid-cols-5 gap-5">
            <StoreCard 
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