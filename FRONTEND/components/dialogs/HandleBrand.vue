<script setup>
import { reactive, toRefs } from 'vue';

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
    const {success, error} = await useCreateBrand(formFields);
    if (success) {
        console.log('Brand created successfully!');
    } else {
        console.error('Error creating brand:', error);
    }
    window.location.reload();
}

async function updateBrand() {
    const {success, error} = await useUpdateBrand(props.brandId, formFields);
    
    if (success) {
        console.log('Brand updated successfully!');
    } else {
        console.error('Error updating brand:', error);
    }
    //window.location.reload();
}
</script>

<template>
    <v-dialog max-width="1000">
        <template v-slot:activator="{ props: activatorProps }">
            <v-btn
                class="my-5"
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
                    text="Close Dialog"
                    @click="isActive.value = false"
                ></v-btn>
                <v-btn v-if="brandId" text="Aggiorna Brand" @click="updateBrand()"></v-btn>
                <v-btn v-else text="Crea Brand" @click="createBrand()"></v-btn>
            </v-card-actions>
            </v-card>
        </template>
    </v-dialog>
</template>