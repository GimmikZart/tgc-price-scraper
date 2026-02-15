<script setup>
import { reactive } from 'vue';
import { useSnackbar } from '@/stores/useSnackbar'
import { createBrand, updateBrand } from '@/api/brands'

const props = defineProps({
    brandId: {
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
});

const emit = defineEmits(['refresh-data'])

const snackbar = useSnackbar()

const isLoading = ref(false);
const isActive = ref(false);

const dialogTitle = computed(() => {
    return props.brandId ? 'Modifica Brand' : 'Crea Brand';
});

// Reactive object for form fields
const formFields = reactive({
    name: props.name || '',
    logo_url: props.logoUrl || '',
    website: props.website || '',
});

async function createBrandApi() {
    isLoading.value = true;
    try {
        await createBrand(formFields);
        snackbar.addMessage('Brand creato con successo', 'success')
        emit('refresh-data')
    } catch (error) {
        snackbar.addMessage(`Errore creazione brand`, 'error', error)
    } finally {
        isLoading.value = false;
    }
}

async function updateBrandApi() {
    isLoading.value = true;
    try {
        await updateBrand(props.brandId, formFields);
        snackbar.addMessage('Brand aggiornato con successo', 'success')
        emit('refresh-data')
    } catch (error) {
        snackbar.addMessage(`Errore aggiornamento brand`, 'error', error)
    } finally {
        isLoading.value = false;
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

    <DialogsBaseDialog
        v-model="isActive"
        :title="dialogTitle"
        :fullscreen="false"
        content-class="flex flex-col gap-2"
    >
        <v-text-field
            v-model="formFields.name"
            hide-details="auto"
            label="Nome"
            clearable
        ></v-text-field>
        <v-text-field
            v-model="formFields.logo_url"
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

        <template #actions>
            <v-spacer></v-spacer>
            <v-btn
                :disabled="isLoading"
                text="Chiudi"
                @click="isActive = false"
            ></v-btn>
            <v-btn v-if="props.brandId" :loading="isLoading" text="Aggiorna Brand" @click="updateBrandApi()"></v-btn>
            <v-btn v-else :loading="isLoading" text="Crea Brand" @click="createBrandApi()"></v-btn>
        </template>
    </DialogsBaseDialog>
</template>
