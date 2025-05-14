<script setup>
import { useSnackbar } from '@/stores/useSnackbar'

const globalDataStore = useGlobalDataStore()

const props = defineProps({
  modelValue: Boolean,
  agentToEdit: Object,
})

const emit = defineEmits(['update:modelValue', 'refresh-data'])

const snackbar = useSnackbar()

const isLoading = ref(false);

const formFields = reactive({
  store: '',
  game: '',
  set: '',
  lang: '',
  currency: '',
  category: '',
  url: ''
})

const filteredSets = computed(() => {
  if (!formFields.game) return [];
  return globalDataStore.sets.filter(set => set.game.id === formFields.game);
});

watch(() => props.agentToEdit, (newVal) => {
  if (newVal) {
    console.log(globalDataStore);
    
    formFields.store = globalDataStore.stores.find(s => s.id === newVal.store)
    formFields.game = newVal.game
    formFields.set = globalDataStore.sets.find(s => s.id === newVal.set).id
    formFields.lang = globalDataStore.langs.find(l => l.id === newVal.lang).id
    formFields.currency = globalDataStore.currencies.find(c => c.id === newVal.currency).id
    formFields.category = globalDataStore.categories.find(c => c.id === newVal.category?.id).id
    formFields.url = newVal.url
  } else {
    resetForm()
  }
}, { immediate: true })

const dialogTitle = computed(() => props.agentToEdit ? 'Modifica Agente' : 'Crea Agente')

watch(() => formFields.game, (newGameId) => {
  const setIsUnderGameSelected = globalDataStore.sets.some(
    set => {
      return set.id === formFields?.set && set?.game?.id === newGameId
    }
  )
  if (!setIsUnderGameSelected) {
    formFields.set = null
  }
})

function resetForm() {
  formFields.store = null
  formFields.game = null
  formFields.category = null
  formFields.set = null
  formFields.lang = null
  formFields.currency = null
  formFields.url = ''
}

function closeDialog() {
    resetForm()
    emit('update:modelValue', false)
}

async function updateAgent() {
  isLoading.value = true
  try {
    formFields.set = globalDataStore.sets.find(s => s.id === formFields.set).name
    await useUpdateProduct(formFields, props.agentToEdit.id)
    snackbar.addMessage(`Agente per ${formFields.set} di ${formFields.store.name}  aggiornato con successo`, 'success')
    emit('refresh-data')
  } catch (error) {
    snackbar.addMessage(`Errore aggiornamento agente per ${formFields.set} di ${formFields.store.name}`, 'error', error)
  } finally{
    closeDialog()
    isLoading.value = false
  }
}

async function createAgent() {
  isLoading.value = true
  try {
    formFields.setName = globalDataStore.sets.find(s => s.id === formFields.set).name
    await useCreateProduct(formFields)
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
  <v-dialog v-model="props.modelValue" max-width="1000" transition="dialog-bottom-transition">
    <v-card>
      <v-card-title class="bg-black text-white font-bold text-2xl">
        {{ dialogTitle }}
      </v-card-title>
      <v-card-text class="flex flex-col gap-2 pa-3 lg:pa-8">
        <v-autocomplete label="Negozio" v-model="formFields.store" :items="globalDataStore.stores" item-title="name" return-object  />
        <v-autocomplete label="Gioco" v-model="formFields.game" :items="globalDataStore.games" item-title="name" item-value="id"/>
        <v-autocomplete label="Categoria" v-model="formFields.category" :items="globalDataStore.categories" item-title="name" item-value="id" />
        <v-autocomplete label="Set" v-model="formFields.set" :items="filteredSets" item-value="id">
          <template v-slot:chip="{ props, item }">
              <!-- <v-chip
                v-bind="props"
                :text="`${props.title.name} (${props.title.code})`"
              ></v-chip> -->
              <v-chip v-bind="props">
                {{ item.props.title.name }} ({{ item.props.title.code }})
                <!-- {{ item.title.name }} ({{ item.title.code }}) -->
              </v-chip>
            </template>
          <template v-slot:item="{ props, item }">
            <v-list-item 
              v-bind="props"
              :subtitle="props.title.code"
              :title="props.title.name"
            />
          </template>
        </v-autocomplete>
        <v-autocomplete label="Lingua" v-model="formFields.lang" :items="globalDataStore.langs" item-title="name" item-value="id" />
        <v-autocomplete label="Valuta" v-model="formFields.currency" :items="globalDataStore.currencies" item-title="code" item-value="id" />
        <v-text-field v-model="formFields.url" label="Link Prodotto" clearable />
      </v-card-text>

      <v-card-actions class="bg-black">
        <v-spacer />
        <v-btn :disabled="isLoading" text="Chiudi" @click="closeDialog" />
        <v-btn v-if="props.agentToEdit" :loading="isLoading" text="Aggiorna Agente" @click="updateAgent" />
        <v-btn v-else :loading="isLoading" text="Crea Agente" @click="createAgent" />
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
