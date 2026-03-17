<script setup>
import BaseTabs from "@/components/Tabs/BaseTabs.vue";
import {
  ORANGE_ACTIVE_TAB_CLASS,
  SOLID_INACTIVE_TAB_CLASS,
} from "@/components/Tabs/styles";

const props = defineProps({
  tabs: {
    type: Array,
    required: true,
  },
});

const route = useRoute();
const router = useRouter();

function normalizePath(path) {
  if (typeof path !== "string") return "";
  if (path.length > 1 && path.endsWith("/")) return path.slice(0, -1);
  return path;
}

const currentPath = computed(() => normalizePath(route.path));
const resolvedTabs = computed(() => {
  return props.tabs.map((tab) => ({
    ...tab,
    key: tab.path,
    value: normalizePath(tab.path),
  }));
});

function handleClick(path) {
  if (!path || normalizePath(path) === currentPath.value) return;
  router.push(path);
}
</script>

<template>
  <BaseTabs
    :tabs="resolvedTabs"
    :active="currentPath"
    :active-class="ORANGE_ACTIVE_TAB_CLASS"
    :inactive-class="SOLID_INACTIVE_TAB_CLASS"
    @change="handleClick"
  />
</template>
