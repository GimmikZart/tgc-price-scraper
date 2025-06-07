export const useMobileFloatMenu = defineStore("mobileFloatMenu", () => {
  const isOpen = ref(false);
  const open = () => {
    console.log("Opening float menu");

    isOpen.value = true;
  };
  const close = () => {
    console.log("Closing float menu");

    isOpen.value = false;
  };

  return { isOpen, open, close };
});
