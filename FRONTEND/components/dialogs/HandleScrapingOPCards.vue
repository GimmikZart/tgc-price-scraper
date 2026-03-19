<script setup>
import { ref } from "vue";
import { useSnackbar } from "@/stores/useSnackbar";
import { downloadCardsFromOfficialWebSite } from "@/api/cardsFromApi";

const dialog = ref(false);
const isLoading = ref(false);
const snackbar = useSnackbar();

const bulkSetList = ref([]);

function addSetField() {
  bulkSetList.value.push({
    setName: "",
  });
}

function removeSetField(index) {
  bulkSetList.value.splice(index, 1);
}

async function scrapaCarteOnePiece() {
  if (!bulkSetList.value.length) return;

  isLoading.value = true;

  for (const entry of bulkSetList.value) {
    const expansionName = entry.setName.trim();
    if (!expansionName) continue;

    try {
      const result = await downloadCardsFromOfficialWebSite({ expansionName });

      snackbar.addMessage(
        `Set pronto: ${result.expansionName}`,
        "success",
        `${result.fileName} | Carte: ${result.totalCards} | Immagini nuove: ${result.images.written} | già presenti: ${result.images.skipped} | errori: ${result.images.failed}`,
        6000
      );
    } catch (e) {
      const message =
        e?.data?.statusMessage || e?.message || "Errore sconosciuto";
      snackbar.addMessage(
        `Errore nello scraping di "${expansionName}"`,
        "error",
        message
      );
    }
  }

  isLoading.value = false;
  bulkSetList.value = [];
  dialog.value = false;
}
</script>

<template>
  <div>
    <v-btn
      @click="dialog = true"
      height="100%"
      class="pa-3"
      :loading="isLoading"
    >
      SCRAPA CARTE ONE PIECE
    </v-btn>

    <DialogsBaseDialog
      v-model="dialog"
      max-width="600"
      content-class="space-y-4"
      actions-class="justify-end"
      variant="outlined"
      transition="dialog-bottom-transition"
    >
      <template #title>Scrapa Carte One Piece</template>

      <v-btn small block color="primary" @click="addSetField">
        + Aggiungi set
      </v-btn>

      <div v-if="bulkSetList.length === 0" class="text-gray-500 italic">
        Clicca "+ Aggiungi set" per inserire i nomi dei set da scrapare
      </div>

      <div
        v-for="(entry, index) in bulkSetList"
        :key="index"
        class="flex items-center gap-2"
      >
        <v-text-field
          v-model="bulkSetList[index].setName"
          label="Nome espansione"
          variant="outlined"
          placeholder="es. ROMANCE DAWN [OP01]"
          class="w-full"
          dense
          hide-details=""
        />

        <v-btn variant="text" color="red" @click="removeSetField(index)">
          <v-icon size="30">mdi-trash-can</v-icon>
        </v-btn>
      </div>

      <template #actions>
        <v-btn @click="dialog = false" color="primary">Chiudi</v-btn>
        <v-btn
          @click="scrapaCarteOnePiece"
          :loading="isLoading"
          color="success"
          :disabled="!bulkSetList.length"
        >
          Scrapa
        </v-btn>
      </template>
    </DialogsBaseDialog>
  </div>
</template>
