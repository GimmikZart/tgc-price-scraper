<script setup>
definePageMeta({
    middleware: 'auth'
})
</script>
<template>
  <section class="relative h-full">
    <Toolbar backButton label="Profilo">
    <template #info>
      <!-- user top info -->
      <div>
        <div>
          
        </div>
      </div>
    </template>
  </Toolbar>
    <MobileFloatMenu :cols="2">
      <template #buttons>
        <ButtonForLogs />
        <DialogsHandleLogout />
      </template>
    </MobileFloatMenu>
  </section>
</template>
