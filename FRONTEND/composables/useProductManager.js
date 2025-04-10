import { ref, computed } from 'vue';
import { useScraper } from './useScraper';

export function useProductManager(rawProductList) {
  const productList = ref(
    rawProductList.map((product) => ({
      ...product,
      status: 'pending',
      info: null,
    }))
  );

  const filter = ref('');
  const sortAscending = ref(true);

  const filteredAndSortedProducts = computed(() => {
    let filtered = productList.value.filter((product) =>
      product.store.name.toLowerCase().includes(filter.value.toLowerCase())
    );
    return filtered.sort((a, b) => {
      if (!a.info || !b.info) return 0; // Non ordina se i dati non sono caricati
      return sortAscending.value
        ? a.info.price - b.info.price
        : b.info.price - a.info.price;
    });
  });

  function sortByPrice() {
    sortAscending.value = !sortAscending.value;
  }

  // Caricamento progressivo dei dati
  productList.value.forEach(async (product, idx) => {
    try {
      const result = await useScraper(product);
      productList.value[idx] = { ...product, ...result, status: 'success' };
    } catch {
      productList.value[idx].status = 'error';
    }
  });

  return {
    productList,
    filteredAndSortedProducts,
    filter,
    sortByPrice,
  };
}
