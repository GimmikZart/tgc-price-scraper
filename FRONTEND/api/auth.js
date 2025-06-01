import { useSnackbar } from '@/stores/useSnackbar'

export async function signUpApi(email, password) {
  const snackbar = useSnackbar()
  const router = useRouter()
  const client = useSupabaseClient()
  try {
    const { data, error } = await client.auth.signUp({
      email: email,
      password: password
    })
    if (error) {
      throw new Error(error)
    }
    router.push("/")
    snackbar.addMessage(`Registrazione eseguita con successo`, 'success')
    return data
  } catch (error) {
    snackbar.addMessage(`Errore login:`, 'error', error.message)
  }
  
}

export async function signInApi(email, password) {
  const snackbar = useSnackbar()
  const router = useRouter()
  const client = useSupabaseClient()
  try {
    const { error } = await client.auth.signInWithPassword({
      email: email,
      password: password
    })
    
    if (error) {
      if(error.code === 'invalid_credentials'){
        return { error: 'Credenziali non valide' }
      } else {
        return { error: 'Qualcosa è andato storto' }
      }
    }
    router.push("/")
  } catch (error) {
    return { error: error.message }
  }
}

export async function signOutApi() {
  const snackbar = useSnackbar()
  const router = useRouter()
  const client = useSupabaseClient()
  try {
    const { error } = await client.auth.signOut()
    if (error) {
      throw new Error(error)
    }
    router.push("/login")
    snackbar.addMessage(`Logout eseguito`, 'success')
  } catch (error) {
    snackbar.addMessage(`Errore logout:`, 'error', error.message)
  }
}