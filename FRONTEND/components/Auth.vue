<script setup>
const props = defineProps({
    errors: {
        type: Array,
        required: false
    }
})
</script>
<template>
    <section class="w-3/4 lg:w-1/4 h-auto flex flex-col gap-5">
        <div>
            <h1 class="text-center text-2xl font-bold">DECKSPEDIA</h1>
            <h3 class="text-center text-log font-bold">
                <slot name="title"></slot>
            </h3>
        </div>
        <div class="flex flex-col gap-1">
            <p v-for="(error, idx) in props.errors" :key="idx" class="bg-red-500 p-1 text-white text-center rounded">
                {{ error }}
            </p>
        </div>
        <div>
            <slot name="form"></slot>
        </div>
        <div class="flex flex-col gap-2">
            <slot name="extra"></slot>
        </div>
    </section>
</template>