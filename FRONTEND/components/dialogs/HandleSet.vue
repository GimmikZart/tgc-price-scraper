<script setup>
import { useSnackbar } from '@/stores/useSnackbar'
import { useDisplay } from 'vuetify'


const globalDataStore = useGlobalDataStore()

const props = defineProps({
  modelValue: Boolean,
  setToEdit: Object,
})

const emit = defineEmits(['update:modelValue', 'refresh-data'])

const snackbar = useSnackbar()

const { mdAndDown } = useDisplay()

const isLoading = ref(false);

const formFields = reactive({
  name: null,
  code: null,
  image_url: null,
  publish_date: null,
  game: null,
})

watch(() => props.setToEdit, (newVal) => {
  if (newVal) {
    console.log({newVal});
    
    formFields.name = newVal.name
    formFields.code = newVal.code
    formFields.image_url = newVal.image_url
    formFields.publish_date = newVal.publish_date
    formFields.game = globalDataStore.games.find(c => c.id === newVal.game.id)?.id
  } else {
    resetForm()
  }
}, { immediate: true })

const dialogTitle = computed(() => props.setToEdit ? 'Modifica Set' : 'Crea Set')


function resetForm() {
  formFields.name= null
  formFields.code= null
  formFields.image_url= null
  formFields.publish_date= null
  formFields.game= null
}

function closeDialog() {
    resetForm()
    emit('update:modelValue', false)
}

async function updateSet() {
  isLoading.value = true
  try {
    await useUpdateSet(props.setToEdit.id, formFields)
    snackbar.addMessage(`Set ${formFields.name} di   aggiornato con successo`, 'success')
    emit('refresh-data')
  } catch (error) {
    snackbar.addMessage(`Errore aggiornamento set per ${formFields.set} di ${formFields.store.name}`, 'error', error)
  } finally{
    closeDialog()
    isLoading.value = false
  }
}

async function createSet() {
  isLoading.value = true
  try {
    await useCreateSet(formFields)
    snackbar.addMessage(`Set creato con successo`, 'success')
    emit('refresh-data')
  } catch (error) {
    snackbar.addMessage(`Errore creazione set`, 'error', error)
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
      <v-card-text class="flex flex-col lg:flex-row gap-2 pa-3 lg:pa-8">
        <div class="grid grid-cols-1 gap-2 grid-rows-3" :class="mdAndDown ? 'w-full' : 'w-2/3'">
          <v-autocomplete
            v-model="formFields.game"
            :items="globalDataStore.games"
            item-title="name"
            item-value="id"
            hide-details
            label="Gioco"
            clearable
          />
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
              :width="mdAndDown ? '50px' : '150px'"
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
        <v-date-picker v-model="formFields.publish_date" title="Data di uscita" :class="mdAndDown ? 'w-100' : 'w-1/3'"></v-date-picker>
      </v-card-text> 
      <v-card-actions class="bg-black">
        <v-spacer />
        <v-btn :disabled="isLoading" text="Chiudi" @click="closeDialog" />
        <v-btn v-if="props.setToEdit" :loading="isLoading" text="Aggiorna Set" @click="updateSet()" />
        <v-btn v-else :loading="isLoading" text="Crea Set" @click="createSet()" />
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
