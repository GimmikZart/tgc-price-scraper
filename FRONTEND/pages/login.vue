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
        if(error)
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
    <section class="relative h-dvh overflow-hidden bg-[#0b0b0b] text-slate-100">
        <div class="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(249,115,22,0.12),_transparent_55%)]"></div>
        <div class="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(11,11,11,0.2),rgba(11,11,11,0.95))]"></div>
        <div class="relative z-10 mx-auto flex h-full w-full max-w-md items-center justify-center px-5">
            <div class="w-full rounded-3xl border border-[#1f1f1f] bg-[#121212] px-6 py-8 shadow-[0_30px_60px_rgba(0,0,0,0.45)]">
                <div class="flex flex-col items-center gap-4">
                    <div class="relative">
                        <div class="absolute inset-0 rounded-full bg-orange-500/20 blur-2xl"></div>
                        <img
                            src="/assets/images/deckspedia_logo.png"
                            alt="Deckspedia"
                            class="relative h-24 w-24 object-contain"
                        />
                    </div>
                    <h1 class="text-3xl font-bold tracking-[0.2em] text-white/90">DECKSPEDIA</h1>
                    <div class="h-[2px] w-16 rounded-full bg-orange-500/80"></div>
                </div>

                <div v-if="errorMessages.length" class="mt-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
                    <p v-for="(error, index) in errorMessages" :key="index" class="last:mb-0 mb-1">
                        {{ error }}
                    </p>
                </div>

                <v-form ref="formRef" v-model="valid" @submit.prevent class="mt-6 flex flex-col gap-3">
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
            </div>
        </div>
    </section>
</template>
