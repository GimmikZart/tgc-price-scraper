<script setup>
import { signOutApi } from '@/api/auth';
import { useRouter } from 'vue-router'
import { useSnackbar } from '@/stores/useSnackbar'
import { useUserAuth } from '@/stores/useUserAuth';
import {fetchCardsFromOfficialWebSite} from '@/api/cardsFromApi'

const snackbar = useSnackbar()
const router = useRouter()
const userAuth = useUserAuth()

async function signOut(){
    await signOutApi()
}
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
        <v-btn v-if="userAuth.isAdmin"  variant="outlined" block color="white" @click="goToLogsView()">
            AVVISI
            <v-badge
                color="info"
                :content="snackbar.messageCountByType.info"
                inline
            ></v-badge>
            <v-badge
                color="success"
                :content="snackbar.messageCountByType.success"
                inline
            ></v-badge>
            <v-badge
                color="error"
                :content="snackbar.messageCountByType.error"
                inline
            ></v-badge>
        </v-btn>
        <v-btn block @click="signOut">Logout</v-btn>
      </div>
    </v-navigation-drawer>
</template>