import { defineStore } from 'pinia'

export const useSnackbar = defineStore(
  'snackbar',
  () => {
    const messages = ref([])
    const timedMessages = ref([])

    const messageCountByType = computed(() => {
      return {
        error: messages.value.filter(m => m.type === 'error').length,
        info: messages.value.filter(m => m.type === 'info').length,
        success: messages.value.filter(m => m.type === 'success').length
      }
    })

    const addMessage = (title, type, message = null, duration = 5000) => {
      const id = Date.now() + Math.random() // ID unico
      messages.value.push({ id, title, message, type, duration })
      timedMessages.value.push({ id, title, message, type, duration })
      setTimeout(() => {
        timedMessages.value = timedMessages.value.filter(msg => msg.id !== id)
      }, duration);
    }

    const removeMessage = (id) => {
      messages.value = messages.value.filter(msg => msg.id !== id)
      timedMessages.value = timedMessages.value.filter(msg => msg.id !== id)
    }

    const removeAll = () => {
      messages.value = []
      timedMessages.value = []
    }

    return { messages, timedMessages, messageCountByType, addMessage, removeMessage, removeAll }
  },
  {
    persist: {
      pick: ['messages'],
    },
  }
)
