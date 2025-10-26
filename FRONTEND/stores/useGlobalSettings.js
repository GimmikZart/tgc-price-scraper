export const useGlobalSettings = defineStore("globalSettings", () => {
  const albumIsHandling = ref(false);

  const toggleAlbumHandling = () => { albumIsHandling.value = !albumIsHandling.value }

  return { albumIsHandling, toggleAlbumHandling };
});