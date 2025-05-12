import { defineStore } from 'pinia'

export const useSnackbar = defineStore('snackbar', {
  state: () => ({
    messages: []
  }),
  getters: {
    messageCountByType(state) {
      return {
        error: state.messages.filter(m => m.type === 'error').length,
        info: state.messages.filter(m => m.type === 'info').length,
        success: state.messages.filter(m => m.type === 'success').length
      }
    }
  },
  actions: {
    addMessage(title, type, message = null) {
      const id = Date.now() + Math.random() // ID unico
      this.messages.push({ id, title, message, type })
    },
    removeMessage(id) {
      this.messages = this.messages.filter(msg => msg.id !== id)
    },
    removeAll() {
      this.messages = []
    }
  }
})
