<script setup>
import { reactive } from 'vue';
import { useSnackbar } from '@/stores/useSnackbar'

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

const snackbar = useSnackbar()

const isLoading = ref(false);
const isActive = ref(false);

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
    try {
        await useCreateStores(formFields);
        snackbar.addMessage(`Negozio ${formFields.name} creato con successo`, 'success')
        emit('refresh-data')
    } catch (error) {
        console.error('Error creating store:', error);
        snackbar.addMessage(`Errore creazione negozio ${formFields.name}`, 'error', error)
    } finally {
        isLoading.value = false;
        isActive.value = false;
    }
}

async function updateStore() {
    isLoading.value = true;
    try {
        await useUpdateStores(formFields, props.storeId);
        snackbar.addMessage(`Negozio ${formFields.name} aggiornato con successo`, 'success')
        emit('refresh-data')
    } catch (error) {
        snackbar.addMessage(`Errore modifica negozio ${formFields.name}`, 'error', error)
    } finally {
        isLoading.value = false;
        isActive.value = false;
    } 
}
</script>
<template>
    <v-btn
        @click="isActive = true"
        color="surface-variant"
        :text="dialogTitle"
        variant="flat"
    ></v-btn>
    <v-dialog v-model="isActive" max-width="1000">
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
                    @click="isActive = false"
                ></v-btn>
                <v-btn v-if="storeId" :loading="isLoading" text="Aggiorna Store" @click="updateStore()"></v-btn>
                <v-btn v-else :loading="isLoading" text="Crea Store" @click="createStore()"></v-btn>
            </v-card-actions>
        </v-card>
    </v-dialog>
</template>