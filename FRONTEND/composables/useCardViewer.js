// useCardViewer.js (JS)
import { ref, watch, unref } from "vue";

export function useCardViewer(listRef) {
  console.log('listRef in useCardViewer:', listRef);
  
  const show = ref(false);
  const index = ref(0);

  const getList = () => unref(listRef) ?? [];

  function open(cardOrId) {
    const id = typeof cardOrId === 'object' ? cardOrId?.id : cardOrId;
    const list = getList();
    const i = list.findIndex(c => c?.id === id);
    if (i !== -1) {
      index.value = i;
      show.value = true;
    }
  }

  watch(() => unref(listRef), (list) => {
    if (!list?.length) show.value = false;
    else if (index.value >= list.length) index.value = list.length - 1;
  }, { deep: true });

  return { show, index, open };
}
