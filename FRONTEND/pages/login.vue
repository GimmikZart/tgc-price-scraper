<script setup>
import { signInApi } from '@/api/auth';
import { validateAuthCredentials } from '@/composables/useAuthValidation';

const route = useRoute()

const email = ref('')
const password = ref('')
const rememberMe = ref(false)
const showPassword = ref(false)
const errorMessages = ref([])

async function signIn(){
    errorMessages.value = validateAuthCredentials({
        email: email.value,
        password: password.value
    })

    if(errorMessages.value.length)
        return

    const { error } = await signInApi(email.value, password.value)
    if(error)
        errorMessages.value.push(error)
}

onMounted(() => {
    if (route.query.needLogin === 'true')
        errorMessages.value.push('Devi essere autenticato')
})

definePageMeta({
    layout: 'empty'
})
</script>

<template>
    <AuthForm
        v-model:email="email"
        v-model:password="password"
        v-model:show-password="showPassword"
        title="Login"
        submit-label="Login"
        alternate-prompt="Nuovo utente?"
        alternate-label="Registrati"
        alternate-to="/register"
        :error-messages="errorMessages"
        @submit="signIn"
    />
</template>
