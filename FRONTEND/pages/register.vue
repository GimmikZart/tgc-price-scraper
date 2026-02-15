<script setup>
import { signUpApi } from '@/api/auth';
import { validateAuthCredentials } from '@/composables/useAuthValidation';

const email = ref('')
const password = ref('')
const showPassword = ref(false)
const errorMessages = ref([])

async function signUp(){
    errorMessages.value = validateAuthCredentials({
        email: email.value,
        password: password.value,
        minPasswordLength: 6
    })

    if(errorMessages.value.length)
        return

    await signUpApi(email.value, password.value)
}

definePageMeta({
    layout: 'empty'
})
</script>

<template>
    <AuthForm
        v-model:email="email"
        v-model:password="password"
        v-model:show-password="showPassword"
        title="Registrati"
        submit-label="Registrati"
        alternate-prompt="Hai gia un account?"
        alternate-label="Login"
        alternate-to="/login"
        :error-messages="errorMessages"
        @submit="signUp"
    />
</template>
