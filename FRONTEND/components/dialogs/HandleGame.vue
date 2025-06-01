<script setup>
import { useSnackbar } from '@/stores/useSnackbar'
import { useDisplay } from 'vuetify'
import { createGame, updateGame} from '@/api/games'


const globalDataStore = useGlobalDataStore()

const props = defineProps({
  modelValue: Boolean,
  gameToEdit: Object,
})

const emit = defineEmits(['update:modelValue', 'refresh-data'])

const snackbar = useSnackbar()

const { mdAndDown } = useDisplay()

const isLoading = ref(false);

const formFields = reactive({
  name: '',
  logo_url: '',
  website: '',
  code: '',
  slug: '',
  brand: null,
})

watch(() => props.gameToEdit, (newVal) => {
  if (newVal) {
    formFields.name = newVal.name
    formFields.logo_url = newVal.logo_url
    formFields.website = newVal.website
    formFields.code = newVal.code
    formFields.slug = newVal.slug
    formFields.brand = globalDataStore.brands.find(c => c.id === newVal.brand)?.id
  } else {
    resetForm()
  }
}, { immediate: true })

const dialogTitle = computed(() => props.gameToEdit ? 'Modifica Gioco' : 'Crea Gioco')

function resetForm() {
  formFields.name = '',
  formFields.logo_url = '',
  formFields.website = '',
  formFields.code = '',
  formFields.slug = '',
  formFields.brand = null
}

function closeDialog() {
    resetForm()
    emit('update:modelValue', false)
}

async function updateGameApi() {
  isLoading.value = true
  try {
    await updateGame(formFields, props.gameToEdit.id)
    snackbar.addMessage(`Gioco '${formFields.name}' aggiornato con successo`, 'success')
    emit('refresh-data')
  } catch (error) {
    snackbar.addMessage(`Errore aggiornamento '${formFields.name}'`, 'error', error)
  } finally{
    closeDialog()
    isLoading.value = false
  }
}

async function createGameApi() {
  isLoading.value = true
  try {
    await createGame(formFields)
    snackbar.addMessage(`Agente creato con successo`, 'success')
    emit('refresh-data')
  } catch (error) {
    snackbar.addMessage(`Errore creazione agente`, 'error', error)
  } finally{
    closeDialog()
    isLoading.value = false
  }
}
</script>

<template>
  <v-dialog v-model="props.modelValue" max-width="1000" variant="outlined" transition="dialog-bottom-transition" :fullscreen="mdAndDown" style="z-index: 2000">
    <v-card class="border border-2 border-white">
      <v-card-title class="bg-black text-white font-bold text-2xl">
        {{ dialogTitle }}
      </v-card-title>
      <v-card-text class="flex flex-col gap-2 pa-3 lg:pa-8">
        <v-text-field
            v-model="formFields.name"
            hide-details="auto"
            label="Nome"
            clearable
        ></v-text-field>
        <v-select 
            v-model="formFields.brand" 
            :items="globalDataStore.brands" 
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

      <v-card-actions class="bg-black">
        <v-spacer />
        <v-btn :disabled="isLoading" text="Chiudi" @click="closeDialog" />
        <v-btn v-if="props.gameToEdit" :loading="isLoading" text="Aggiorna Gioco" @click="updateGameApi" />
        <v-btn v-else :loading="isLoading" text="Crea Gioco" @click="createGameApi" />
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
