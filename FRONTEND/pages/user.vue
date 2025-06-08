<script setup></script>
<template>
  <section class="h-full flex flex-col">
    <Toolbar label="User"> </Toolbar>
    <v-container class="flex flex-col justify-between grow relative gap-5">
      <div>
        <ButtonRouter
          to="/collection"
          label="Collezione"
          class="w-full h-[100px]"
        />
      </div>
      <div class="flex flex-col gap-3">
        <ButtonForLogs />
        <DialogsHandleLogout />
      </div>
    </v-container>
  </section>
</template>
