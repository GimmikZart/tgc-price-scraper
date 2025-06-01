export const useUserAuth = defineStore('userAuth', () => {
    const userLogged = useSupabaseUser()
    const session = useSupabaseSession()

    return { userLogged, session }
})
