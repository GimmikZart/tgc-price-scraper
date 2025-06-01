export default defineNuxtRouteMiddleware((to, _from) => {
  const session = useSupabaseSession()
  const user = useSupabaseUser()

  if (!session.value || !user.value) {
    return navigateTo({
      path: '/login',
      query: { needLogin: 'true' }
    })
  }
})  