<script setup>
import BaseTabs from "@/components/Tabs/BaseTabs.vue";
import {
  GHOST_INACTIVE_BADGE_CLASS,
  GHOST_INACTIVE_TAB_CLASS,
  ORANGE_ACTIVE_BADGE_CLASS,
  ORANGE_ACTIVE_TAB_CLASS,
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
    :inactive-class="GHOST_INACTIVE_TAB_CLASS"
    :badge-active-class="ORANGE_ACTIVE_BADGE_CLASS"
    :badge-inactive-class="GHOST_INACTIVE_BADGE_CLASS"
    @change="emit('change', $event)"
  />
</template>
