<script setup></script>
<template>
  <section class="h-full flex flex-col">
    <Toolbar label="User"> </Toolbar>
    <v-container class="flex flex-col justify-between grow relative gap-5">
      <div>
        <!--  <div class="w-full h-[100px] rounded relative">
          <img
            class="absolute w-full h-full object-cover rounded"
            src="https://en.onepiece-cardgame.com/images/cardlist/card/OP09-062.png"
            alt=""
          />
          <v-btn height="100%" block color="transparent">Collezione</v-btn>
        </div> -->
        <ButtonRouter
          to="/collection"
          disabled
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
