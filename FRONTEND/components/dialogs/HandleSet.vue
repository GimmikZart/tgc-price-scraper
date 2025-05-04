<script setup>
import { reactive, toRefs } from 'vue';

const props = defineProps({
    setId: {
        type: Number,
        required: false
    },
    name: {
        type: String,
        required: false
    },
    gameId: {
        type: Number,
        required: true
    },
    code: {
        type: String,
        required: false
    },
    imageUrl: {
        type: String,
        required: false
    },
    publishDate: {
        type: Date,
        required: false
    },
});

const dialogTitle = computed(() => {
    return props.setId ? `Modifica Set` : `Crea Set`;
});

// Reactive object for form fields
const formFields = reactive({
    name: props.name || '',
    code: props.code || '',
    image_url: props.imageUrl || '',
    publish_date: props.publishDate || null,
    game: props.gameId || null
});

async function createSet() {
    const {success, error} = await useCreateSet(formFields);
    if (success) {
        console.log('Set created successfully!');
    } else {
        console.error('Error creating set:', error);
    }
    //window.location.reload();
}

async function updateSet() {
    const {success, error} = await useUpdateSet(props.setId, formFields);
    
    if (success) {
        console.log('Set updated successfully!');
    } else {
        console.error('Error updating set:', error);
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
            <v-card-text class="flex gap-2">
                <div class="w-2/3 grid grid-cols-1 gap-2 grid-rows-3">
                    <v-text-field
                        v-model="formFields.name"
                        hide-details="auto"
                        label="Nome"
                        clearable
                    ></v-text-field>
                    <v-text-field
                        v-model="formFields.code"
                        hide-details="auto"
                        label="Codice"
                        clearable
                    ></v-text-field>
                    <div class="flex gap-2">
                        <v-img
                            v-if="formFields.image_url"
                            height="100%"
                            width="150px"
                            :src="formFields.image_url"
                            contain
                        ></v-img>
                        <div v-else class="h-full w-[150px] bg-gray-200 flex items-center justify-center">
                            <span class="text-gray-500 text-center">Nessuna immagine</span>
                        </div>
                        <v-text-field
                            v-model="formFields.image_url"
                            hide-details="auto"
                            label="Immagine URL"
                            clearable
                            class="w-full"
                        ></v-text-field>
                    </div>
                </div>
                
                <v-date-picker v-model="formFields.publish_date" title="Data di uscita" class="w-full"></v-date-picker>
            </v-card-text>

            <v-card-actions>
                <v-spacer></v-spacer>
                <v-btn
                    text="Close Dialog"
                    @click="isActive.value = false"
                ></v-btn>
                <v-btn v-if="setId" text="Aggiorna Set" @click="updateSet()"></v-btn>
                <v-btn v-else text="Crea Set" @click="createSet()"></v-btn>
            </v-card-actions>
            </v-card>
        </template>
    </v-dialog>
</template>