<script setup>
const props = defineProps({
    product: {
        type: Object,
        required: true,
    },
    id: {
        type: Number,
        required: true
    }
})
const { data: result, status, error } = await useAsyncData(
    `product-${props.id}`,
    async () => await useScraper(props.product),
    {
        lazy: true
    }
)

const test = computed(() => result.value)
const test2 = computed(() => status.value)
const test3 = computed(() => error.value)
</script>
<template>
    <div class="border rounded p-5 flex flex-col gap-3 w-full h-full">
        <template v-if="status == 'pending'">{{status}}</template>
        <template v-if="status == 'success'">
            <img :src="result.info.image" class="w-full h-auto"/> 
            <a class="text-2xl font-bold hover:text-blue-600 hover:underline decoration-solid" :href="result.store.website">{{result.store.name}}</a>
            <h4 class="text-xl">{{result.game.name}} - {{result.game.set}} ({{result.game.lang}})</h4>
            <p class="ml-auto mt-4 text-lg">💸 Price: <strong>{{result.info.price }}</strong></p>
        </template>
        <template v-if="status == 'error'">ERRORE</template>
    </div>
</template>