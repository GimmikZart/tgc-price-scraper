<script setup>
const props = defineProps({
  modelValue: Boolean,
  agentToEdit: Object,
  selectGames: Array,
  selectStores: Array,
  selectLangs: Array,
  selectSets: Array,
})
const emit = defineEmits(['update:modelValue'])

const formFields = reactive({
  store: '',
  game: '',
  set: '',
  lang: '',
  url: ''
})

watch(() => props.agentToEdit, (newVal) => {
  if (newVal) {
    formFields.store = props.selectStores.find(s => s.id === newVal.store)
    formFields.game = newVal.game
    formFields.lang = props.selectLangs.find(l => l.id === newVal.lang)
    formFields.url = newVal.url

    // ⚠️ delay set assignment after game is assigned
    nextTick(() => {
      const correctSet = props.selectSets.find(s => s.id === newVal.set.id)
      formFields.set = correctSet?.id || null
    })
  } else {
    resetForm()
  }
}, { immediate: true })

const dialogTitle = computed(() => props.agentToEdit ? 'Modifica Agente' : 'Crea Agente')

const filteredSets = computed(() => {
  if (!formFields.game) return [];
  return props.selectSets.filter(set => set.game.id === formFields.game);
});

watch(() => formFields.game, (newGameId) => {
  const setIsUnderGameSelected = props.selectSets.some(
    set => set.id === formFields.set && set.game === newGameId
  )
  if (!setIsUnderGameSelected) {
    formFields.set = null
  }
})

function resetForm() {
  formFields.store = null
  formFields.game = ''
  formFields.set = ''
  formFields.lang = null
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
        <v-select label="Set" v-model="formFields.set" :items="filteredSets" item-title="name" item-value="id" />
        <v-select label="Lingua" v-model="formFields.lang" :items="selectLangs" item-title="name" item-value="id" />
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
