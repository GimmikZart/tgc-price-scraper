<script setup>
import BaseTabs from "@/components/Tabs/BaseTabs.vue";
import {
  ORANGE_ACTIVE_TAB_CLASS,
  SOLID_INACTIVE_TAB_CLASS,
} from "@/components/Tabs/styles";

defineProps({
  tabs: {
    type: Array,
    required: true,
  },
  active: {
    type: String,
    required: true,
  },
});

const emit = defineEmits(["change"]);
</script>

<template>
  <BaseTabs
    :tabs="tabs"
    :active="active"
    :active-class="ORANGE_ACTIVE_TAB_CLASS"
    :inactive-class="SOLID_INACTIVE_TAB_CLASS"
    @change="emit('change', $event)"
  />
</template>
