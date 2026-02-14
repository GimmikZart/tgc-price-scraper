<script setup>
import { signUpApi } from '@/api/auth';

const email = ref('')
const password = ref('')
const showPassword = ref(false)
const errorMessages = ref([])

async function signUp(){
    errorMessages.value = []

    if(!email.value)
        errorMessages.value.push("L'email e obbligatoria")
    else if(!/.+@.+\..+/.test(email.value))
        errorMessages.value.push('Inserisci un indirizzo email valido')

    if(!password.value)
        errorMessages.value.push('La password e obbligatoria')
    else if(password.value.length < 6)
        errorMessages.value.push('La password deve essere di almeno 6 caratteri')

    if(errorMessages.value.length)
        return

    await signUpApi(email.value, password.value)
}

definePageMeta({
    layout: 'empty'
})
</script>

<template>
    <section class="relative h-dvh overflow-hidden bg-[#070707] text-[#e6e6e6]">
        <div class="absolute inset-x-0 top-0 h-[52%] bg-[radial-gradient(circle_at_18%_8%,#ff9447_0%,#f1722c_32%,#c95217_68%,#8d330b_100%)]"></div>
        <div class="pointer-events-none absolute inset-x-0 top-0 h-[52%] bg-[radial-gradient(circle_at_86%_14%,rgba(255,161,88,0.25),transparent_46%),radial-gradient(circle_at_34%_76%,rgba(252,114,42,0.26),transparent_52%)]"></div>
        <div class="pointer-events-none absolute inset-x-0 top-0 h-[52%] bg-[linear-gradient(180deg,rgba(255,157,82,0.15),rgba(125,45,10,0.28))]"></div>

        <div class="pointer-events-none absolute inset-x-0 top-[14%]">
            <svg class="h-[40dvh] w-full" viewBox="0 0 1440 320" preserveAspectRatio="none">
                <path
                    fill="#070707"
                    d="M0,220C240,210,500,214,760,186C1000,160,1220,130,1440,136L1440,320L0,320Z"
                />
            </svg>
        </div>

        <div class="relative z-10 mx-auto flex h-full w-full max-w-md flex-col px-6">
            <div class="flex h-[33%] items-start justify-center pt-6">
                <div class="relative flex h-60 w-60 items-center justify-center">
                    <div class="logo-spotlight pointer-events-none"></div>
                    <img
                        src="/assets/images/deckspedia_logo_titolo.png"
                        alt="Deckspedia"
                        class="relative h-60 w-60 object-contain drop-shadow-[0_12px_24px_rgba(0,0,0,0.35)]"
                    />
                </div>
            </div>

            <div class="flex-1 pb-6">
                <h1 class="text-4xl font-bold leading-none text-[#f2f2f2]">Registrati</h1>

                <div v-if="errorMessages.length" class="mt-4 rounded-xl border border-red-500/40 bg-red-500/15 px-3 py-2 text-sm text-red-200">
                    <p v-for="(error, index) in errorMessages" :key="index" class="last:mb-0 mb-1">
                        {{ error }}
                    </p>
                </div>

                <form class="mt-10 space-y-4" @submit.prevent="signUp">
                    <div>
                        <label class="text-lg font-semibold text-[#ececec]">Email</label>
                        <div class="mt-1 flex items-center gap-2 text-[#9a9a9a]">
                            <v-icon size="16">mdi-email-outline</v-icon>
                            <input
                                v-model="email"
                                type="email"
                                placeholder="demo@email.com"
                                class="h-9 w-full border-b border-[#ff9a6e] bg-transparent text-base text-[#f1f1f1] placeholder:text-[#8e8e8e] focus:border-[#ff7a3d] focus:outline-none"
                            />
                        </div>
                    </div>

                    <div>
                        <label class="text-lg font-semibold text-[#ececec]">Password</label>
                        <div class="mt-1 flex items-center gap-2 text-[#9a9a9a]">
                            <v-icon size="16">mdi-lock-outline</v-icon>
                            <input
                                v-model="password"
                                :type="showPassword ? 'text' : 'password'"
                                placeholder="Inserisci la tua password"
                                class="h-9 w-full border-b border-[#515151] bg-transparent text-base text-[#f1f1f1] placeholder:text-[#8e8e8e] focus:border-[#ff7a3d] focus:outline-none"
                            />
                            <button
                                type="button"
                                class="text-[#9b9b9b] transition hover:text-[#ff7a3d]"
                                @click="showPassword = !showPassword"
                            >
                                <v-icon size="16">{{ showPassword ? 'mdi-eye-off-outline' : 'mdi-eye-outline' }}</v-icon>
                            </button>
                        </div>
                    </div>

                    <div class="pt-6">
                        <button
                            type="submit"
                            class="h-11 w-full rounded-xl bg-[#ff7a3d] text-xl font-bold text-white transition hover:bg-[#f66f2f]"
                        >
                            Registrati
                        </button>
                        <div class="mt-4 text-center text-sm text-[#9d9d9d]">
                            <span>Hai gia un account?</span>
                            <NuxtLink to="/login" class="ml-3 font-semibold text-[#ff7a3d]">Login</NuxtLink>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    </section>
</template>

<style scoped>
.logo-spotlight{
    position: absolute;
    height: 18rem;
    width: 18rem;
    border-radius: 9999px;
    background:
        linear-gradient(180deg, rgba(255,212,160,0.08) 0%, rgba(255,201,142,0.18) 38%, rgba(255,187,121,0.44) 74%, rgba(255,174,100,0.74) 100%),
        radial-gradient(circle at 50% 84%, rgba(255,220,172,0.82) 0%, rgba(255,198,136,0.5) 42%, rgba(255,174,112,0) 78%);
    mix-blend-mode: screen;
    filter: blur(5px);
    animation: logo-spot-move 5.8s ease-in-out infinite alternate, logo-spot-pulse 4.8s ease-in-out infinite;
}

.logo-spotlight::after{
    content: '';
    position: absolute;
    inset: 18%;
    border-radius: 9999px;
    background: radial-gradient(circle at 52% 86%, rgba(255,209,153,0.78) 0%, rgba(255,209,153,0) 72%);
    filter: blur(6px);
    animation: logo-core-drift 6.8s ease-in-out infinite;
}

@keyframes logo-spot-move{
    0%{
        transform: translate(-5px, -2px) scale(0.99);
    }
    100%{
        transform: translate(6px, 4px) scale(1.03);
    }
}

@keyframes logo-spot-pulse{
    0%, 100%{
        opacity: 0.8;
    }
    50%{
        opacity: 0.92;
    }
}

@keyframes logo-core-drift{
    0%, 100%{
        transform: translate(-3px, 1px) scale(0.96);
        opacity: 0.66;
    }
    50%{
        transform: translate(4px, -2px) scale(1.04);
        opacity: 0.83;
    }
}
</style>
