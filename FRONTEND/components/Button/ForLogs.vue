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
    <ButtonMenu
      icon="tabler:circle"
      label="Avvisi"
      transition
      class="relative"
      @click="goToLogsView()"
    >
      <template #over-icon>
        <span
          class="absolute top-1/2 -left-1 bg-blue-500 flex items-center justify-center text-[10px] rounded-circle w-[15px] h-[15px]"
        >
          {{ snackbar.messageCountByType.info }}
        </span>
        <span
          class="absolute -top-1 left-1/2 -translate-x-1/2 bg-red-500 flex items-center justify-center text-[10px] rounded-circle w-[15px] h-[15px]"
        >
          {{ snackbar.messageCountByType.error }}
        </span>
        <span
          class="absolute top-1/2 -right-1 bg-green-500 flex items-center justify-center text-[10px] rounded-circle w-[15px] h-[15px]"
        >
          {{ snackbar.messageCountByType.success }}
        </span>
      </template>
    </ButtonMenu>
  </div>
</template>
