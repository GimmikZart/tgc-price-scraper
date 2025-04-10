<script setup>
const {data: stores} = await useAsyncData('products', () =>
useGetStores()
)
</script>
<template>
    <div>
        <DialogsHandleStore/>
        <div class="flex gap-5">
            <StoreCard 
                v-for="store in stores"
                :key="store.id"
                :id="store.id"
                :name="store.name"
                :logoUrl="store.logo_url"
                :website="store.website"
                :priceSelector="store.price_selector"
                :imageSelector="store.image_selector"
            />
        </div>
    </div>
</template>