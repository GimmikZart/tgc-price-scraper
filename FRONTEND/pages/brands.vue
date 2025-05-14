<script setup>
const {data: brands} = await useAsyncData('brands', () =>
    useGetBrands()
)

async function refreshData() {
    await refreshNuxtData(['brands']);
}
</script>
<template>
    <div>
        <Toolbar label="Brands">
            <template #actions>
                <DialogsHandleBrand @refresh-data="refreshData"/>
            </template>
        </Toolbar>
        
        <div class="grid grid-cols-1 lg:grid-cols-5 gap-5">
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