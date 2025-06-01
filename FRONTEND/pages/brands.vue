<script setup>
import { fetchBrands } from '@/api/brands';
import { useUserAuth } from '@/stores/useUserAuth';

const userAuth = useUserAuth()

const {data: brands} = await useAsyncData('brands', () =>
    fetchBrands()
)

async function refreshData() {
    await refreshNuxtData(['brands']);
}

definePageMeta({
    middleware: 'auth'
})
</script>
<template>
    <div>
        <Toolbar label="Brands">
            <template #actions>
                <DialogsHandleBrand v-if="userAuth.isAdmin" @refresh-data="refreshData"/>
            </template>
        </Toolbar>
        
        <div class="grid grid-cols-1 lg:grid-cols-5 gap-5">
            <CardBrand 
                v-for="brand in brands"
                :key="brand.id"
                :brand="brand"
            />
        </div>
    </div>
</template>