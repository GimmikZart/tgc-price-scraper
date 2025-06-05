<script setup>
import { useRouter } from 'vue-router'
import { useUserAuth } from '@/stores/useUserAuth';
import {fetchCardsFromOfficialWebSite} from '@/api/cardsFromApi'

const router = useRouter()
const userAuth = useUserAuth()

function goToLogsView() {
  router.push('/logs')
}

async function scrapaMaledetto(){
  await fetchCardsFromOfficialWebSite()
}
</script>
<template>
    <v-navigation-drawer
      color="black"
      class="border border-white relative"
      permanent
      app
      width="260"
    >
      <v-list-item title="Deckspedia" subtitle="Beta"></v-list-item>
      <v-divider></v-divider>
      <v-list nav>
        <v-list-item v-if="userAuth.isAdmin" title="Admin" to="/admin" />
        <v-list-item title="Prodotti" to="/" />
        <v-list-item v-if="userAuth.isAdmin" title="Brands" to="/brands" />
        <v-list-item v-if="userAuth.isAdmin" title="Giochi" to="/games" />
        <v-list-item v-if="userAuth.isAdmin" title="Negozi" to="/stores" />
        <v-list-item title="Lista Carte" to="/cards" />
        <v-spacer></v-spacer>
      </v-list>
      <div class="absolute bottom-0 w-full flex flex-col gap-3 p-3">
        <ButtonForLogs />
        <DialogsHandleLogout />
      </div>
    </v-navigation-drawer>
</template>