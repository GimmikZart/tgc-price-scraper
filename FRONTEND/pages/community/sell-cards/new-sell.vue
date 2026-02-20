<script setup>
import { createSellListing } from "@/api/sellListings";
import { Condition, conditionOptions, getConditionMeta } from "@/utilities/enums/conditions";

const router = useRouter();
const snackbar = useSnackbar();
const sellListingDraftStore = useSellListingDraftStore();
const { selectedCard, hasSelectedCard, quantity, unitPrice, condition } = storeToRefs(sellListingDraftStore);

const SELL_CARDS_BASE_PATH = "/community/sell-cards";
const PARMA_LATITUDE = 44.8015;
const PARMA_LONGITUDE = 10.3279;

const isSubmitting = ref(false);

const selectedCardPrice = computed(() => {
  const parsedValue = Number(selectedCard.value?.price);
  if (!Number.isFinite(parsedValue) || parsedValue <= 0) return null;
  return parsedValue.toFixed(2);
});

const selectedCardPriceUrl = computed(() => {
  if (!selectedCard.value?.price) return null;
  return selectedCard.value?.slugs?.[0]?.url ?? null;
});

const conditionItems = conditionOptions;
const defaultCondition = Condition.PERFETTO;

if (!getConditionMeta(condition.value)) {
  condition.value = defaultCondition;
}

const putOnSalePriceValue = computed(() => {
  const parsedValue = Number(unitPrice.value);
  if (!Number.isFinite(parsedValue) || parsedValue <= 0) return null;
  return parsedValue.toFixed(2);
});

const viewerCards = computed(() => (hasSelectedCard.value ? [selectedCard.value] : []));

const copiesInCollection = computed(() => {
  const parsedCopies = Number(selectedCard.value?.copiesInCollection);
  if (!Number.isInteger(parsedCopies) || parsedCopies < 0) return 0;
  return parsedCopies;
});

const maxQuantity = computed(() => Math.max(1, copiesInCollection.value));

const quantityModel = computed({
  get() {
    const parsedQuantity = Number(quantity.value);
    if (!Number.isInteger(parsedQuantity) || parsedQuantity < 1) return 1;
    return Math.min(parsedQuantity, maxQuantity.value);
  },
  set(newValue) {
    const parsedQuantity = Number(newValue);
    const nextQuantity = !Number.isInteger(parsedQuantity) || parsedQuantity < 1 ? 1 : parsedQuantity;
    quantity.value = String(Math.min(nextQuantity, maxQuantity.value));
  },
});

const isQuantityValid = computed(() => {
  const parsedQuantity = Number(quantityModel.value);
  return Number.isInteger(parsedQuantity) && parsedQuantity > 0 && parsedQuantity <= copiesInCollection.value;
});

const isUnitPriceValid = computed(() => {
  const parsedUnitPrice = Number(unitPrice.value);
  return Number.isFinite(parsedUnitPrice) && parsedUnitPrice > 0;
});

const isConditionValid = computed(() => Boolean(getConditionMeta(condition.value)));

const hasAllRequiredFields = computed(() => {
  return (
    hasSelectedCard.value
    && copiesInCollection.value > 0
    && isQuantityValid.value
    && isUnitPriceValid.value
    && isConditionValid.value
  );
});

const canPutOnSale = computed(() => !isSubmitting.value && hasAllRequiredFields.value);

const { show: viewerOpen, index: viewerIndex, open: openViewer } = useCardViewer(viewerCards);

function goToCollectionInSellMode() {
  router.push("/me/collection?sell-mode");
}

function handleCancel() {
  sellListingDraftStore.resetDraft();
  router.push(SELL_CARDS_BASE_PATH);
}

function openViewerFromSelected(card) {
  openViewer(card);
}

async function handlePutOnSale() {
  if (isSubmitting.value) return;

  if (!hasSelectedCard.value) {
    snackbar.addMessage("Seleziona una carta prima di continuare", "error");
    return;
  }

  if (copiesInCollection.value < 1) {
    snackbar.addMessage("Non hai copie disponibili di questa carta", "error");
    return;
  }

  const parsedQuantity = Number(quantityModel.value);
  if (!Number.isInteger(parsedQuantity) || parsedQuantity <= 0) {
    snackbar.addMessage("Inserisci una quantita valida", "error");
    return;
  }
  if (parsedQuantity > copiesInCollection.value) {
    snackbar.addMessage(`Quantita massima disponibile: ${copiesInCollection.value}`, "error");
    return;
  }

  const parsedUnitPrice = Number(unitPrice.value);
  if (!Number.isFinite(parsedUnitPrice) || parsedUnitPrice <= 0) {
    snackbar.addMessage("Inserisci un prezzo valido", "error");
    return;
  }

  if (!getConditionMeta(condition.value)) {
    snackbar.addMessage("Seleziona la condizione della carta", "error");
    return;
  }

  isSubmitting.value = true;

  try {
    await createSellListing({
      cardId: selectedCard.value.id,
      quantity: parsedQuantity,
      price: parsedUnitPrice,
      latitude: PARMA_LATITUDE,
      longitude: PARMA_LONGITUDE,
      condition: condition.value,
    });

    snackbar.addMessage("Carta messa in vendita con successo", "success");
    sellListingDraftStore.resetDraft();
    await router.push(SELL_CARDS_BASE_PATH);
  } catch (error) {
    snackbar.addMessage(error.message || "Errore durante la creazione della vendita", "error");
  } finally {
    isSubmitting.value = false;
  }
}

</script>

<template>
  <section class="relative h-full overflow-hidden">
    <Toolbar label="Nuova Vendita" fixed />

    <div v-if="!hasAllRequiredFields" class="px-3 pt-2">
      <div class="sell-warning-box">
        <v-icon icon="mdi-alert-circle-outline" size="18" />
        <span>Compila tutti i campi prima di procede</span>
      </div>
    </div>

    <div class="flex h-full flex-col px-3 pb-24 pt-3">
      <v-btn
        v-if="!hasSelectedCard"
        type="button"
        block
        color="orange"
        variant="tonal"
        class="text-white"
        @click="goToCollectionInSellMode"
      >
        seleziona carta
      </v-btn>
      <form v-else class="mx-auto w-full max-w-[500px]" @submit.prevent="handlePutOnSale">
        <div  class="mt-3 flex w-full gap-3 items-stretch">
          <div class="w-2/5">
            <Card :card="selectedCard" @open="openViewerFromSelected" />
          </div>

          <div class="w-full min-h-0 flex-1 flex flex-col gap-2">
            <div>
              <p class="sell-card-name line-clamp-2">{{ selectedCard.name }}</p>
              <p class="sell-card-copies text-orange">{{ selectedCard.copiesInCollection }} copie in collezione</p>
            </div>
            
            <p class="text-xs font-bold">{{ selectedCard.illustration }} | {{ selectedCard.rarity }}</p>
            <p class="text-xs font-thin">{{ selectedCard.setName }}</p>
            <CardPriceLink
              :price="selectedCardPrice"
              :href="selectedCardPriceUrl"
              :show-outer-padding="false"
              label="CardTrader"
            />

            <v-btn
              type="button"
              block
              density="compact"
              variant="tonal"
              color="orange"
              class="text-white h-fit"
              @click="goToCollectionInSellMode"
            >
              Cambia
            </v-btn>
          </div>
        </div>
        <div class="mt-4 space-y-5">
          <div>
            <p class="sell-field-label mb-1">Quantita</p>
            <CardCounter v-model="quantityModel" :min="1" :max="maxQuantity" :outer-padding="false" />
          </div>

          <InputTextField
            v-model="unitPrice"
            label="Prezzo di vendita per singola carta"
            placeholder="prezzo"
            type="number"
            min="0.01"
            step="0.01"
          />

          <v-select
            v-model="condition"
            :items="conditionItems"
            item-title="label"
            item-value="value"
            label="Condizione"
            density="compact"
            variant="outlined"
            theme="dark"
            hide-details
            class="condition-select"
          >
            <template #item="{ props, item }">
              <v-list-item v-bind="props">
                <template #title>
                  <v-chip :color="item.raw.color" size="small" variant="flat" label>
                    {{ item.raw.label }}
                  </v-chip>
                </template>
              </v-list-item>
            </template>

            <template #selection="{ item }">
              <v-chip :color="item.raw.color" size="small" variant="flat" label>
                {{ item.raw.label }}
              </v-chip>
            </template>
          </v-select>
        </div>
        <CardPriceLink
          class="mt-4"
          :price="putOnSalePriceValue"
          :show-outer-padding="false"
          :link-enabled="false"
          label="Prezzo vendita per singola"
          currency="EUR"
        />
      </form>

      <FullscreenCardViewer
        v-model:show="viewerOpen"
        v-model:index="viewerIndex"
        :cards="viewerCards"
        @close="viewerOpen = false"
      />
    </div>

    <MobileFloatMenu :cols="2">
      <template #buttons>
        <ButtonMenu
          icon="mdi:close"
          label="Annulla"
          color="red"
          transition
          :delay="200"
          :disabled="isSubmitting"
          @click="handleCancel"
        />
        <ButtonMenu
          icon="mdi:tag-check-outline"
          label="Metti in vendita"
          color="orange"
          transition
          :delay="100"
          :disabled="!canPutOnSale"
          @click="handlePutOnSale"
        />
      </template>
    </MobileFloatMenu>
  </section>
</template>

<style scoped>
.sell-page {
  position: relative;
}

.sell-warning-box {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  border-radius: 0.75rem;
  border: 1px solid rgba(255, 176, 93, 0.65);
  background: rgba(255, 122, 24, 0.22);
  color: #ffe6cc;
  padding: 0.6rem 0.75rem;
  font-size: 0.82rem;
  font-weight: 600;
}

.sell-choose-btn {
  border-color: rgba(255, 183, 124, 0.5) !important;
  background: linear-gradient(130deg, rgba(255, 122, 24, 0.18), rgba(14, 21, 33, 0.9)) !important;
  color: #ffe4cb !important;
  font-weight: 700 !important;
  text-transform: none !important;
  letter-spacing: 0.01em !important;
}

.sell-card-name {
  color: rgba(248, 250, 252, 0.98);
  font-size: 1rem;
  font-weight: 700;
  line-height: 1.2;
}

.sell-card-copies {
  color: rgba(226, 232, 240, 0.78);
  font-size: 0.78rem;
  font-weight: 600;
}

.sell-field-label {
  color: rgba(248, 250, 252, 0.92);
  font-size: 0.82rem;
  font-weight: 600;
}

.sell-submit-btn {
  background: rgba(255, 122, 24, 0.95) !important;
  color: #fff7f0 !important;
  font-weight: 700 !important;
  letter-spacing: 0.01em !important;
}

/* .sell-cancel-btn {
  background: rgba(36, 44, 56, 0.95) !important;
  color: rgba(236, 240, 247, 0.96) !important;
  font-weight: 700 !important;
  letter-spacing: 0.01em !important;
  border: 1px solid rgba(140, 152, 170, 0.4) !important;
} */

@media (min-width: 768px) {
  .sell-form-shell {
    padding: 1.1rem;
  }
}

@media (min-width: 1024px) {
  .sell-form-shell {
    margin-top: 0.4rem;
  }
}
</style>
