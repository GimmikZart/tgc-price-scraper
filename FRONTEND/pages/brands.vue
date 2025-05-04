<script setup>
const {data: brands} = await useAsyncData('brands', () =>
    useGetBrands()
)
</script>
<template>
    <div>
        <DialogsHandleBrand/>
        <div class="flex gap-5">
            <BrandCard 
                v-for="brand in brands"
                :key="brand.id"
                :id="brand.id"
                :name="brand.name"
                :logoUrl="brand.logo_url"
                :website="brand.website"
            />
        </div>
    </div>
</template>