import { defineStore } from 'pinia'

export const useSnackbar = defineStore('snackbar', {
  state: () => ({
    messages: [] 
  }),
  actions: {
    addMessage(title, type, message = null) {
      const id = Date.now() + Math.random() // ID unico
      this.messages.push({ id, title, message, type })
      console.log(this.messages);
      
      // Auto-remove dopo 5 secondi
      //setTimeout(() => this.removeMessage(id), 5000)
    },
    removeMessage(id) {
        this.messages = this.messages.filter(msg => msg.id !== id)
    }
  }
})

