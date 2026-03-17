<script setup>
import BaseTabs from "@/components/Tabs/BaseTabs.vue";
import {
  FRIEND_ACTIVE_TAB_CLASS_BY_TONE,
  GHOST_INACTIVE_TAB_CLASS,
  ORANGE_ACTIVE_TAB_CLASS,
} from "@/components/Tabs/styles";

const props = defineProps({
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

const resolvedTabs = computed(() => {
  return props.tabs.map((tab) => ({
    ...tab,
    activeClass: FRIEND_ACTIVE_TAB_CLASS_BY_TONE[tab?.tone] ?? ORANGE_ACTIVE_TAB_CLASS,
  }));
});
</script>

<template>
  <BaseTabs
    :tabs="resolvedTabs"
    :active="active"
    :inactive-class="GHOST_INACTIVE_TAB_CLASS"
    @change="emit('change', $event)"
  />
</template>
