<script setup>
import { ref } from "vue";
import { useDisplay } from "vuetify";
import { useSnackbar } from "@/stores/useSnackbar";
import { downloadCardsFromOfficialWebSite } from "@/api/cardsFromApi";

const { mdAndDown } = useDisplay();
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

    try {
      await downloadCardsFromOfficialWebSite({ expansionName });
    } catch (e) {
      snackbar.addMessage(
        `Errore nello scraping di "${expansionName}": ${e}`,
        "error"
      );
    }
  }

  isLoading.value = false;
  bulkSetList.value = [];
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

    <v-dialog
      v-model="dialog"
      max-width="600"
      variant="outlined"
      transition="dialog-bottom-transition"
      :fullscreen="mdAndDown"
      style="z-index: 2000"
    >
      <v-card class="border border-2 border-white">
        <v-card-title class="bg-black text-white font-bold text-2xl">
          Scrapa Carte One Piece
        </v-card-title>

        <v-card-text class="space-y-4">
          <v-btn small block color="primary" @click="addSetField">
            + Aggiungi set
          </v-btn>

          <div v-if="bulkSetList.length === 0" class="text-gray-500 italic">
            Clicca “+ Aggiungi set” per inserire i nomi dei set da scrapare
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
        </v-card-text>

        <v-card-actions class="justify-end">
          <v-btn @click="dialog = false" color="primary"> Chiudi </v-btn>
          <v-btn
            @click="scrapaCarteOnePiece"
            :loading="isLoading"
            color="success"
            :disabled="!bulkSetList.length"
          >
            Scrapa
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>
