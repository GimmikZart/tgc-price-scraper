import { useUserAuth } from '@/stores/useUserAuth';
export default defineNuxtRouteMiddleware((to, _from) => {
  const session = useSupabaseSession()
  const user = useSupabaseUser()
  const { isAdmin } = useUserAuth()
  console.log({isAdmin});
  
  if (!session.value || !user.value || !isAdmin) {
    return navigateTo({
      path: '/login',
      query: { needLogin: 'true' }
    })
  }
})  