export const useUserAuth = defineStore(
    'userAuth', 
    () => {
        const userLogged = useSupabaseUser()
        const session = useSupabaseSession()
        const role = ref(null)
        const email = ref(null)

        const isUser = computed(() => role.value === 'user')
        const isAdmin = computed(() => role.value === 'admin')

        return { userLogged, session, email, role, isUser, isAdmin }
    },
    {
        persist: true,
        maxAge: 7 * 24 * 60 * 60,
        paths: ['role', 'email', 'userLogged', 'session']
    }
)
