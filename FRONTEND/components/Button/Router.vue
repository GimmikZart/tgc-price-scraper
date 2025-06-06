<script setup>
const router = useRouter();
const props = defineProps({
  image: {
    type: String,
    required: false,
  },
  to: {
    type: String,
    default: "/",
  },
  disabled: {
    type: Boolean,
    default: false,
  },
  label: {
    type: String,
    default: "Button",
  },
});

function handleClick() {
  router.push(props.to);
}
</script>
<template>
  <v-card
    flat
    class="pa-2 relative"
    :class="{ 'cursor-pointer': !disabled, 'opacity-50': disabled }"
    @click="handleClick"
    style="transition: all 0.1s ease-in-out"
  >
    <h5
      :class="{ 'opacity-50': disabled }"
      class="text-3xl text-black font-bold absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10"
    >
      {{ label }} <br />
      <h5 class="text-sm text-center">( Incoming )</h5>
    </h5>
    <img
      v-if="image"
      class="absolute top-0 left-0 w-full h-full object-cover rounded z-0 blur-[2px]"
      :src="image"
    />
  </v-card>
</template>
