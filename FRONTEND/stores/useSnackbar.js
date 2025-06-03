// stores/useSnackbar.js
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useSnackbar = defineStore(
  'snackbar',
  () => {
    const messages = ref([])
    const queue = ref([])         
    const currentTimed = ref(null)  

    const messageCountByType = computed(() => ({
      error:   messages.value.filter(m => m.type === 'error').length,
      info:    messages.value.filter(m => m.type === 'info').length,
      success: messages.value.filter(m => m.type === 'success').length,
    }))

    function processNextTimed() {
      if (!currentTimed.value && queue.value.length > 0) {
        const next = queue.value.shift()
        currentTimed.value = next

        setTimeout(() => {
          if (currentTimed.value && currentTimed.value.id === next.id) {
            currentTimed.value = null
            processNextTimed()
          }
        }, next.duration)
      }
    }

    function addMessage(title, type, message = null, duration = 3000) {
      const id = Date.now() + Math.random()
      const payload = { id, title, message, type, duration }

      messages.value.push({ id, title, message, type, duration })

      queue.value.push(payload)
      processNextTimed()
    }

    function removeMessage(id) {
      messages.value = messages.value.filter(m => m.id !== id)

      if (currentTimed.value && currentTimed.value.id === id) {
        currentTimed.value = null
        processNextTimed()
      }

      queue.value = queue.value.filter(m => m.id !== id)
    }

    function removeAll() {
      messages.value = []
      queue.value = []
      currentTimed.value = null
    }

    return {
      messages,
      queue,
      currentTimed,
      messageCountByType,
      addMessage,
      removeMessage,
      removeAll,
    }
  },
  {
    persist: {
      pick: ['messages'],
    },
  }
)
