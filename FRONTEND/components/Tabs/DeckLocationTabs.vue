<script setup>
import BaseTabs from "@/components/Tabs/BaseTabs.vue";
import {
  CLOUD_ACTIVE_BADGE_CLASS,
  CLOUD_ACTIVE_TAB_CLASS,
  GHOST_INACTIVE_BADGE_CLASS,
  GHOST_INACTIVE_TAB_CLASS,
  ORANGE_ACTIVE_BADGE_CLASS,
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
  return props.tabs.map((tab) => {
    const isCloudTab = `${tab?.value ?? ""}`.toLowerCase() === "cloud";

    return {
      ...tab,
      activeClass: isCloudTab ? CLOUD_ACTIVE_TAB_CLASS : ORANGE_ACTIVE_TAB_CLASS,
      badgeActiveClass: isCloudTab ? CLOUD_ACTIVE_BADGE_CLASS : ORANGE_ACTIVE_BADGE_CLASS,
    };
  });
});
</script>

<template>
  <BaseTabs
    :tabs="resolvedTabs"
    :active="active"
    :inactive-class="GHOST_INACTIVE_TAB_CLASS"
    :badge-inactive-class="GHOST_INACTIVE_BADGE_CLASS"
    @change="emit('change', $event)"
  />
</template>
