<script setup>
import { useSnackbar } from "@/stores/useSnackbar";
import { useUserAuth } from "@/stores/useUserAuth";

const userAuth = useUserAuth();
const snackbar = useSnackbar();
const router = useRouter();

function goToLogsView() {
  router.push("/logs");
}
</script>
<template>
  <div>
    <v-btn
      v-if="userAuth.isAdmin"
      variant="outlined"
      block
      color="white"
      @click="goToLogsView()"
    >
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
  </div>
</template>
