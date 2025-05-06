<script setup>
import { useSnackbar } from '@/stores/useSnackbar'
const snackbar = useSnackbar()

</script>
<template>
  <div class="min-h-screen bg-gray-100 text-gray-900 p-5">
    <Navbar></Navbar>
    <NuxtPage />
    <div class="fixed bottom-0 right-0 p-5 w-1/5 z-[2500]">
      <Snackbar
        v-for="msg in snackbar.messages"
        :key="msg.id"
        :id="msg.id"
        :title="msg.title"
        :message="msg.message"
        :type="msg.type"
        :duration="msg.duration"
      />
    </div>
  </div>
</template>



