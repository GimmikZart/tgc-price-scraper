import { ref, watch } from "vue";

export function useCardViewer(listRef) {
  console.log('LISTAAAAAAAAAAAAAA', {listRef});
  
  const show = ref(false);
  const index = ref(0);

  function open(card) {
    console.log(listRef);
    
    const list = listRef.value || listRef;
    const i = list.findIndex((c) => c.id === card.id);
    console.log('OPEN INDEX:', i);
    
    if (i !== -1) {
      index.value = i;
      show.value = true;
    }
  }

  watch(listRef, (list) => {
    if (!list?.length) show.value = false;
    else if (index.value >= list.length) index.value = list.length - 1;
  });

  return { show, index, open };
}
