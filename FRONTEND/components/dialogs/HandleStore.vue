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
    priceSelector: {
        type: String,
        required: false
    },
    discountSelector: {
        type: String,
        required: false
    },
    imageSelector: {
        type: String,
        required: false
    },
});

const dialogTitle = computed(() => {
    return props.storeId ? 'Modifica Negozio' : 'Crea Negozio';
});

// Reactive object for form fields
const formFields = reactive({
    name: props.name || '',
    logoUrl: props.logoUrl || '',
    website: props.website || '',
    price_selector: props.priceSelector || '',
    discount_selector: props.discountSelector || '',
    image_selector: props.imageSelector || ''
});

async function createStore() {
    const {success, error} = await useCreateStores(formFields);
    if (success) {
        console.log('Store created successfully!');
    } else {
        console.error('Error creating store:', error);
    }
    window.location.reload();
}

async function updateStore() {
    const {success, error} = await useUpdateStores(formFields, props.storeId);
    
    if (success) {
        console.log('Store updated successfully!');
    } else {
        console.error('Error creating store:', error);
    }
    //window.location.reload();
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
                    v-model="formFields.price_selector"
                    hide-details="auto"
                    label="Selettore Prezzo"
                    clearable
                ></v-text-field>
                <v-text-field
                    v-model="formFields.discount_selector"
                    hide-details="auto"
                    label="Selettore Prezzo Scontato"
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
                <v-btn v-if="storeId" text="Aggiorna Store" @click="updateStore()"></v-btn>
                <v-btn v-else text="Crea Store" @click="createStore()"></v-btn>
            </v-card-actions>
            </v-card>
        </template>
    </v-dialog>
</template>