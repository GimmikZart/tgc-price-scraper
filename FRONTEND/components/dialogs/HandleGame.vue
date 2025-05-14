<script setup>
import { reactive, toRefs } from 'vue';
import { useSnackbar } from '@/stores/useSnackbar'

const props = defineProps({
    gameId: {
        type: Number,
        required: false
    },
    name: {
        type: String,
        required: false
    },
    code: {
        type: String,
        required: false
    },
    brand: {
        type: Number,
        required: false
    },
    slug: {
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
    return props.gameId ? 'Modifica Gioco' : 'Crea Gioco';
});

const { data: brands } = await useAsyncData('brands', () => useGetBrands());

// Reactive object for form fields
const formFields = reactive({
    name: props.name || '',
    logo_url: props.logoUrl || '',
    website: props.website || '',
    code: props.code || '',
    slug: props.slug || '',
    brand: props.brand || null,
});

async function createGame() {
    isLoading.value = true;
    try {
        await useCreateGame(formFields);
        snackbar.addMessage('Gioco creato con successo', 'success')
        emit('refresh-data')
    } catch (error) {
        snackbar.addMessage(`Errore creazione gioco`, 'error', error)
    } finally {
        isLoading.value = false;
    }
}

async function updateGame() {
    isLoading.value = true;
    try {
        await useUpdateGame(props.gameId, formFields);
        snackbar.addMessage('Gioco aggiornato con successo', 'success')
        emit('refresh-data')
    } catch (error) {
        snackbar.addMessage(`Errore aggiornamento gioco`, 'error', error)
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
                <v-select 
                    v-model="formFields.brand" 
                    :items="brands" 
                    label="Brand"
                    item-value="id" 
                    item-title="name"
                    hide-details
                ></v-select>
                <v-text-field
                    v-model="formFields.slug"
                    hide-details="auto"
                    label="Slug"
                    clearable
                ></v-text-field>
                <v-text-field
                    v-model="formFields.code"
                    hide-details="auto"
                    label="Codice"
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
                <v-btn v-if="gameId" :loading="isLoading" text="Aggiorna Gioco" @click="updateGame()"></v-btn>
                <v-btn v-else :loading="isLoading" text="Crea Gioco" @click="createGame()"></v-btn>
            </v-card-actions>
            </v-card>
        </template>
    </v-dialog>
</template>