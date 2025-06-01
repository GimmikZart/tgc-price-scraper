<script setup>
import { signUpApi } from '@/api/auth';

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
    v => !!v || 'La password è obbligatoria',
    v  => v?.length >= 6 || 'La password deve essere di almeno 6 caratteri.'
]

async function signUp(){
    if(valid.value)
        await signUpApi(email.value, password.value)
}

definePageMeta({
    layout: 'empty'
})
</script>
<template>
    <section class="h-dvh flex items-center justify-center">
        <Auth :errors="errorMessages">
            <template #title>
                Registrati
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
                        @click="signUp"
                    >
                        Registrati
                    </v-btn>
                </v-form>
            </template>
        </Auth>
    </section>
</template>