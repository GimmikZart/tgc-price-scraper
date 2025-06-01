import { useSnackbar } from '@/stores/useSnackbar'
import { useUserAuth } from '@/stores/useUserAuth'
export async function signUpApi(email, password) {
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
  const router = useRouter()
  const client = useSupabaseClient()
  const userAuth = useUserAuth()
  try {
    const { error: loginError } = await client.auth.signInWithPassword({
      email: email,
      password: password
    })
    
    if (loginError) {
      if(loginError.code === 'invalid_credentials'){
        return { error: 'Credenziali non valide' }
      } else {
        return { error: 'Qualcosa è andato storto' }
      }
    }

    const {data: profileData, error: profileError }= await client.from('profiles').select('*').eq('id', userAuth.userLogged.id).single()
    console.log("profileData", profileData);

    if (profileError) {
      return { error: 'Qualcosa è andato storto' }
    }

    userAuth.role = profileData.role
    userAuth.email = profileData.email
    
    router.push("/")
    return { error: null }
  } catch (error) {
    return { error: error.message }
  }
}

export async function signOutApi() {
  const router = useRouter()
  const client = useSupabaseClient()
  const userAuth = useUserAuth()
  const snackbar = useSnackbar()
  try {
    const { error } = await client.auth.signOut()
    if (error) {
      throw new Error(error)
    }
    userAuth.profile = null
    router.push("/login")
  } catch (error) {
    snackbar.addMessage(`Errore logout:`, 'error', error.message)
  }
}