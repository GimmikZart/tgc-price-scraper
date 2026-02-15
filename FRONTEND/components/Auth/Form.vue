<script setup>
const props = defineProps({
    title: {
        type: String,
        required: true
    },
    submitLabel: {
        type: String,
        required: true
    },
    alternatePrompt: {
        type: String,
        required: true
    },
    alternateLabel: {
        type: String,
        required: true
    },
    alternateTo: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    showPassword: {
        type: Boolean,
        required: true
    },
    errorMessages: {
        type: Array,
        default: () => []
    }
})

const emit = defineEmits([
    'update:email',
    'update:password',
    'update:showPassword',
    'submit'
])

function onEmailInput(event) {
    emit('update:email', event.target?.value ?? '')
}

function onPasswordInput(event) {
    emit('update:password', event.target?.value ?? '')
}

function togglePasswordVisibility() {
    emit('update:showPassword', !props.showPassword)
}
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
                <h1 class="text-4xl font-bold leading-none text-[#f2f2f2]">{{ title }}</h1>
                <form class="mt-10 space-y-4" @submit.prevent="emit('submit')">
                    <div>
                        <label class="text-lg font-semibold text-[#ececec]">Email</label>
                        <div class="mt-1 flex items-center gap-2 text-[#9a9a9a]">
                            <v-icon size="16">mdi-email-outline</v-icon>
                            <input
                                :value="email"
                                type="email"
                                placeholder="demo@email.com"
                                class="h-9 w-full border-b border-[#ff9a6e] bg-transparent text-base text-[#f1f1f1] placeholder:text-[#8e8e8e] focus:border-[#ff7a3d] focus:outline-none"
                                @input="onEmailInput"
                            />
                        </div>
                    </div>

                    <div>
                        <label class="text-lg font-semibold text-[#ececec]">Password</label>
                        <div class="mt-1 flex items-center gap-2 text-[#9a9a9a]">
                            <v-icon size="16">mdi-lock-outline</v-icon>
                            <input
                                :value="password"
                                :type="showPassword ? 'text' : 'password'"
                                placeholder="Inserisci la tua password"
                                class="h-9 w-full border-b border-[#515151] bg-transparent text-base text-[#f1f1f1] placeholder:text-[#8e8e8e] focus:border-[#ff7a3d] focus:outline-none"
                                @input="onPasswordInput"
                            />
                            <button
                                type="button"
                                class="text-[#9b9b9b] transition hover:text-[#ff7a3d]"
                                @click="togglePasswordVisibility"
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
                            {{ submitLabel }}
                        </button>
                        <div class="mt-4 text-center text-sm text-[#9d9d9d]">
                            <span>{{ alternatePrompt }}</span>
                            <NuxtLink :to="alternateTo" class="ml-3 font-semibold text-[#ff7a3d]">{{ alternateLabel }}</NuxtLink>
                        </div>
                    </div>
                    <div v-if="errorMessages.length" class="mt-4">
                      <!-- AGGIUNGI ANIMAZIONE FADE-IN DAL BASSO PER OGNI ERRORE CON UN DELAY DI 0.3 secondi tra un errore e l'altro -->
                        <p v-for="(error, index) in errorMessages" :key="index" class="rounded border border-red-500 bg-red-500 px-3 text-sm last:mb-0 mb-2 text-center text-black animate-fade-in-up" :style="{ animationDelay: `${index * 0.5}s` }">
                          <v-icon size="16">mdi-alert-circle-outline</v-icon>
                          {{ error }}
                        </p>
                    </div>
                </form>
            </div>
        </div>
    </section>
</template>

<style scoped>
.logo-spotlight{
    position: absolute;
    height: 100%;
    width: 100%;
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

.animate-fade-in-up{
    animation: fade-in-up 0.5s ease forwards;
}

@keyframes fade-in-up{
    0%{
        opacity: 0;
        transform: translateY(10px);
    }
    100%{
        opacity: 1;
        transform: translateY(0);
    }
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
