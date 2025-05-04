<script setup>
const props = defineProps({
  modelValue: Boolean,
  agentToEdit: Object,
  selectGames: Array,
  selectStores: Array,
  selectLangs: Array,
  selectSets: Array,
  selectCurrency: Array,
  selectCategories: Array,
})
const emit = defineEmits(['update:modelValue'])

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
  return props.selectSets.filter(set => set.game.id === formFields.game);
});
 
watch(() => props.agentToEdit, (newVal) => {
  if (newVal) {
    console.log('Editing agent:', newVal)
    formFields.store = props.selectStores.find(s => s.id === newVal.store)
    formFields.game = newVal.game
    formFields.set = props.selectSets.find(s => s.id === newVal.set)
    formFields.lang = props.selectLangs.find(l => l.id === newVal.lang)
    formFields.currency = props.selectCurrency.find(c => c.id === newVal.currency)
    formFields.category = props.selectCategories.find(c => c.id === newVal.category?.id)
    formFields.url = newVal.url
  } else {
    resetForm()
  }
}, { immediate: true })

const dialogTitle = computed(() => props.agentToEdit ? 'Modifica Agente' : 'Crea Agente')

watch(() => formFields.game, (newGameId) => {
  const setIsUnderGameSelected = props.selectSets.some(
    set => {
      return set.id === formFields?.set?.id && set?.game?.id === newGameId
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
  console.log('Updating with:', formFields)
  const result = await useUpdateProduct(formFields, props.agentToEdit.id)
  closeDialog()
}

async function createAgent() {
  console.log('Creating with:', formFields)
  const result = await useCreateProduct(formFields)
  closeDialog()
}
</script>

<template>
  <v-dialog v-model="props.modelValue" max-width="1000">
    <v-card :title="dialogTitle">
      <v-card-text class="flex flex-col gap-2">
        <v-select label="Negozio" v-model="formFields.store" :items="selectStores" item-title="name" return-object  />
        <v-select label="Gioco" v-model="formFields.game" :items="selectGames" item-title="name" item-value="id"/>
        <v-select label="Categoria" v-model="formFields.category" :items="selectCategories" item-title="name" item-value="id" />
        <v-select label="Set" v-model="formFields.set" :items="filteredSets" item-title="name" item-value="id" />
        <v-select label="Lingua" v-model="formFields.lang" :items="selectLangs" item-title="name" item-value="id" />
        <v-select label="Valuta" v-model="formFields.currency" :items="selectCurrency" item-title="code" item-value="id" />
        <v-text-field v-model="formFields.url" label="Link Prodotto" clearable />
      </v-card-text>

      <v-card-actions>
        <v-spacer />
        <v-btn text="Chiudi" @click="closeDialog" />
        <v-btn v-if="props.agentToEdit" text="Aggiorna Agente" @click="updateAgent" />
        <v-btn v-else text="Crea Agente" @click="createAgent" />
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
