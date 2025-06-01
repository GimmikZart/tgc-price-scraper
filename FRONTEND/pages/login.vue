<script setup>
import { signUpApi, signInApi, signOutApi } from '@/api/auth';
import { useUserAuth } from '@/stores/useUserAuth'
import { useSnackbar } from '@/stores/useSnackbar'

const userAuth = useUserAuth()
const route = useRoute()
const snackbar = useSnackbar()

const email = ref("")
const password = ref("")
const formRef = ref(null)

const emailRules = [
    v => !!v || 'L’email è obbligatoria',
    //v => /.+@.+\..+/.test(v) || 'Inserisci un indirizzo email valido'
]

const passwordRules = [
    v => !!v || 'La password è obbligatoria'
]

async function signUp(){
    await signUpApi(email.value, password.value)
}

async function signIn(){
    await signInApi(email.value, password.value)
}

async function signOut(){
    await signOutApi()
}

onMounted(() => {
    if (route.query.needLogin === 'true') {
        snackbar.addMessage('Devi essere autenticato', 'error')
    }
})
</script>
<template>
    <div class="h-dvh">
        <v-form ref="formRef" v-slot="{ valid }">
            <v-text-field
                v-model="email"
                label="Email"
                :rules="emailRules"
                required
            />

            <v-text-field
                v-model="password"
                label="Password"
                type="password"
                :rules="passwordRules"
                required
            />

            <!-- :disabled="!valid" -->
            <v-btn
                color="primary"
                @click="signUp"
            >
                Registrati
            </v-btn>
            <v-btn
                color="primary"
                @click="signIn"
            >
                Login
            </v-btn>
            <v-btn
                color="primary"
                @click="signOut"
            >
                Logout
            </v-btn>
        </v-form>
    </div>
</template>