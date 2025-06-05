<script setup>
import { signOutApi } from '@/api/auth';

const snackbar = useSnackbar()
const isLoading = ref(false);
const dialog = ref(false)

async function signOut() {
    isLoading.value = true
    try {
        await signOutApi()
    } catch (error) {
        snackbar.addMessage(`Errore durante il logout`, 'error', error)
    } finally {
        isLoading.value = false
    }
}
</script>
<template>
  <div>   
    <v-btn block @click="dialog = true">
        Logout
        <v-icon class="ml-3">mdi-logout</v-icon>
    </v-btn>
    <v-dialog v-model="dialog" width="auto" variant="outlined" transition="dialog-bottom-transition" style="z-index: 2000">
      <v-card class="border border-2 border-white">
        <v-card-title class="bg-black text-white font-bold text-2xl">
          Sei sicuro di voler uscire?
        </v-card-title>
        <v-card-text>
          Una volta uscito dovrai riaccedere con il tuo account.
        </v-card-text>
        <v-card-actions class="pa-3">
          <v-spacer />
          <v-btn :disabled="isLoading" variant="outlined" @click="dialog = false">
            No, rimango
          </v-btn>
          <v-btn :loading="isLoading" variant="outlined" @click="signOut">
            Esci
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>