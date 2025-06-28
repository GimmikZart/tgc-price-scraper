export const useUserAuth = defineStore(
  "userAuth",
  () => {
    const userLogged = useSupabaseUser();
    const role = ref(null);
    const email = ref(null);

    const isUser = computed(() => role.value === "user");
    const isAdmin = computed(() => role.value === "admin");

    return { userLogged, email, role, isUser, isAdmin };
  },
  {
    persist: true,
    maxAge: 7 * 24 * 60 * 60,
    paths: ["role", "email", "userLogged"],
  }
);
