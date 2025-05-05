<script setup>
import { reactive, toRefs } from 'vue';

const props = defineProps({
    storeId: {
        type: Number,
        required: false
    },
    name: {
        type: String,
        required: false
    },
    logoUrl: {
        type: String,
        required: false
    },
    website: {
        type: String,
        required: false
    },
    regularPriceSelector: {
        type: String,
        required: false
    },
    originalPriceSelector: {
        type: String,
        required: false
    },
    discountedPriceSelector: {
        type: String,
        required: false
    },
    imageSelector: {
        type: String,
        required: false
    },
});

const emit = defineEmits(['refresh-data'])

const isLoading = ref(false);

const dialogTitle = computed(() => {
    return props.storeId ? 'Modifica Negozio' : 'Crea Negozio';
});

// Reactive object for form fields
const formFields = reactive({
    name: props.name || '',
    logoUrl: props.logoUrl || '',
    website: props.website || '',
    regular_price_selector: props.regularPriceSelector || '',
    original_price_selector: props.originalPriceSelector || '',
    discounted_price_selector: props.discountedPriceSelector || '',
    image_selector: props.imageSelector || ''
});

async function createStore() {
    isLoading.value = true;
    const {success, error} = await useCreateStores(formFields);
    if (success) {
        console.log('Store created successfully!');
        emit('refresh-data')
    } else {
        console.error('Error creating store:', error);
    }
    isLoading.value = false;
}

async function updateStore() {
    isLoading.value = true;
    const {success, error} = await useUpdateStores(formFields, props.storeId);
    if (success) {
        console.log('Store updated successfully!');
        emit('refresh-data')
    } else {
        console.error('Error creating store:', error);
    }
    isLoading.value = false;
}
</script>
<template>
    <v-dialog max-width="1000">
        <template v-slot:activator="{ props: activatorProps }">
            <v-btn
                class="mb-5"
                v-bind="activatorProps"
                color="surface-variant"
                :text="dialogTitle"
                variant="flat"
            ></v-btn>
        </template>

        <template v-slot:default="{ isActive }">
            <v-card :title="dialogTitle">
            <v-card-text class="flex flex-col gap-2">
                <v-text-field
                    v-model="formFields.name"
                    hide-details="auto"
                    label="Nome"
                    clearable
                ></v-text-field>
                <v-text-field
                    v-model="formFields.logoUrl"
                    hide-details="auto"
                    label="Logo URL"
                    clearable
                ></v-text-field>
                <v-text-field
                    v-model="formFields.website"
                    hide-details="auto"
                    label="Sito Web"
                    clearable
                ></v-text-field>
                <v-text-field
                    v-model="formFields.regular_price_selector"
                    hide-details="auto"
                    label="Selettore Prezzo Regolare"
                    clearable
                ></v-text-field>
                <v-text-field
                    v-model="formFields.original_price_selector"
                    hide-details="auto"
                    label="Selettore Prezzo Originale quando scontato"
                    clearable
                ></v-text-field>
                <v-text-field
                    v-model="formFields.discounted_price_selector"
                    hide-details="auto"
                    label="Selettore Prezzo con sconto applicato"
                    clearable
                ></v-text-field>
                <v-text-field
                    v-model="formFields.image_selector"
                    hide-details="auto"
                    label="Selettore Immagine"
                    clearable
                ></v-text-field>
            </v-card-text>

            <v-card-actions>
                <v-spacer></v-spacer>

                <v-btn
                    text="Close Dialog"
                    @click="isActive.value = false"
                ></v-btn>
                <v-btn v-if="storeId" :loading="isLoading" text="Aggiorna Store" @click="updateStore()"></v-btn>
                <v-btn v-else :loading="isLoading" text="Crea Store" @click="createStore()"></v-btn>
            </v-card-actions>
            </v-card>
        </template>
    </v-dialog>
</template>