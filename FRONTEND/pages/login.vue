<script setup>
import { signInApi } from '@/api/auth';

const route = useRoute()

const email = ref("")
const password = ref("")
const formRef = ref(null)
const valid = ref(false)
const errorMessages = ref([])

const emailRules = [
    v => !!v || 'L’email è obbligatoria',
    v => /.+@.+\..+/.test(v) || 'Inserisci un indirizzo email valido'
]

const passwordRules = [
    v => !!v || 'La password è obbligatoria'
]

async function signIn(){
    if(valid.value){
        const { error } = await signInApi(email.value, password.value)
        errorMessages.value.push(error)
    }
}

onMounted(() => {
    if (route.query.needLogin === 'true') {
        errorMessages.value.push('Devi essere autenticato')
    }
})

definePageMeta({
    layout: 'empty'
})
</script>
<template>
    <section class="h-dvh flex items-center justify-center">
        <Auth :errors="errorMessages">
            <template #title>
                Login
            </template>
            <template #form>
                <v-form ref="formRef" v-model="valid" @submit.prevent class="flex flex-col gap-2">
                    <v-text-field
                        v-model="email"
                        label="Email"
                        variant="outlined"
                        :rules="emailRules"
                        required
                    />

                    <v-text-field
                        v-model="password"
                        label="Password"
                        type="password"
                        variant="outlined"
                        :rules="passwordRules"
                        required
                    />
                    <v-btn
                        color="primary"
                        variant="outlined"
                        block
                        type="submit"
                        @click="signIn"
                    >
                        Login
                    </v-btn>
                    <v-btn
                        color="primary"
                        variant="outlined"
                        block
                        to="/register"
                    >
                        Nuovo utente?
                    </v-btn>
                </v-form>
            </template>
        </Auth>
    </section>
</template>