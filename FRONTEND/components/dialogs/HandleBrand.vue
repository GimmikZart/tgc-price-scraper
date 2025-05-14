<script setup>
import { reactive, toRefs } from 'vue';
import { useSnackbar } from '@/stores/useSnackbar'

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

const dialogTitle = computed(() => {
    return props.brandId ? 'Modifica Brand' : 'Crea Brand';
});

// Reactive object for form fields
const formFields = reactive({
    name: props.name || '',
    logo_url: props.logoUrl || '',
    website: props.website || '',
});

async function createBrand() {
    isLoading.value = true;
    try {
        await useCreateBrand(formFields);
        snackbar.addMessage('Brand creato con successo', 'success')
        emit('refresh-data')
    } catch (error) {
        snackbar.addMessage(`Errore creazione brand`, 'error', error)
    } finally {
        isLoading.value = false;
    }
}

async function updateBrand() {
    isLoading.value = true;
    try {
        await useUpdateBrand(props.brandId, formFields);
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
    <v-dialog max-width="1000">
        <template v-slot:activator="{ props: activatorProps }">
            <v-btn
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
            </v-card-text>

            <v-card-actions>
                <v-spacer></v-spacer>

                <v-btn
                    :disabled="isLoading"
                    text="Chiudi"
                    @click="isActive.value = false"
                ></v-btn>
                <v-btn v-if="brandId" :loading="isLoading" text="Aggiorna Brand" @click="updateBrand()"></v-btn>
                <v-btn v-else :loading="isLoading" text="Crea Brand" @click="createBrand()"></v-btn>
            </v-card-actions>
            </v-card>
        </template>
    </v-dialog>
</template>