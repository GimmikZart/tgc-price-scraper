export const useGlobalSettings = defineStore("globalSettings", () => {
  const navbarHeight = ref(0)
  const paginationHeight = ref(0);
  const floatMenuHeight = ref(0);

  const collectionIsHandling = ref(false);
  const toggleHandlingCollections = () => {
    collectionIsHandling.value = !collectionIsHandling.value 
  }
  
  const albumIsHandling = ref(false);
  const toggleAlbumHandling = () => { albumIsHandling.value = !albumIsHandling.value }

  return { albumIsHandling, toggleAlbumHandling, navbarHeight, paginationHeight, floatMenuHeight, collectionIsHandling, toggleHandlingCollections };
});