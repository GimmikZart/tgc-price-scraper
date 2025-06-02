import { defineStore } from 'pinia'

export const useSnackbar = defineStore('snackbar', {
  state: () => ({
    messages: [],
    timedMessages: []
  }),
  getters: {
    messageCountByType(state) {
      return {
        error: state.messages.filter(m => m.type === 'error').length,
        info: state.messages.filter(m => m.type === 'info').length,
        success: state.messages.filter(m => m.type === 'success').length
      }
    },
  },
  actions: {
    addMessage(title, type, message = null, duration = 5000) {
      const id = Date.now() + Math.random() // ID unico
      this.messages.push({ id, title, message, type, duration })
      this.timedMessages.push({ id, title, message, type, duration })
      setTimeout(() => {
        this.timedMessages = this.timedMessages.filter(msg => msg.id !== id)
      }, duration);
    },
    removeMessage(id) {
      this.messages = this.messages.filter(msg => msg.id !== id)
      this.timedMessages = this.timedMessages.filter(msg => msg.id !== id)
    },
    removeAll() {
      this.messages = []
      this.timedMessages = []
    }
  }
})
