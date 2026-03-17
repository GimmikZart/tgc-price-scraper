<script setup>
import { Icon } from "@iconify/vue";
import { useElementSize } from "@vueuse/core";

const props = defineProps({
  tabs: {
    type: Array,
    required: true,
  },
  active: {
    type: [String, Number],
    default: null,
  },
  trackClass: {
    type: String,
    default: "",
  },
  buttonClass: {
    type: String,
    default: "",
  },
  activeClass: {
    type: String,
    default: "",
  },
  inactiveClass: {
    type: String,
    default: "",
  },
  badgeClass: {
    type: String,
    default: "",
  },
  badgeActiveClass: {
    type: String,
    default: "",
  },
  badgeInactiveClass: {
    type: String,
    default: "",
  },
  iconClass: {
    type: String,
    default: "text-base shrink-0",
  },
});

const emit = defineEmits(["change"]);

const shellRef = ref(null);
const { width: shellWidth } = useElementSize(shellRef);
const tabsCount = computed(() => props.tabs.length);
const isCompactLayout = computed(() => tabsCount.value <= 2);
const isSingleTabLayout = computed(() => tabsCount.value === 1);
const isTwoTabsLayout = computed(() => tabsCount.value === 2);
const trackStyle = computed(() => {
  if (isCompactLayout.value) return undefined;

  const peekWidth = shellWidth.value > 0
    ? Math.floor(shellWidth.value * 0.4)
    : null;

  if (!peekWidth) return undefined;

  return {
    "--tabs-peek-width": `${peekWidth}px`,
  };
});

function normalizeComparableValue(value) {
  if (value === null || value === undefined) return "";
  return String(value);
}

function tabKey(tab, index) {
  return tab?.key ?? tab?.value ?? tab?.path ?? tab?.label ?? index;
}

function isActive(tab) {
  return normalizeComparableValue(tab?.value) === normalizeComparableValue(props.active);
}

function isDisabled(tab) {
  return Boolean(tab?.disabled);
}

function hasCount(tab) {
  return typeof tab?.count === "number";
}

function resolveButtonStateClass(tab) {
  if (isActive(tab)) return tab?.activeClass ?? props.activeClass;
  return tab?.inactiveClass ?? props.inactiveClass;
}

function resolveBadgeStateClass(tab) {
  if (isActive(tab)) return tab?.badgeActiveClass ?? props.badgeActiveClass;
  return tab?.badgeInactiveClass ?? props.badgeInactiveClass;
}

function handleClick(tab) {
  if (isDisabled(tab) || isActive(tab)) return;
  emit("change", tab?.value);
}
</script>

<template>
  <div
    ref="shellRef"
    class="tabs-shell"
    :class="{
      'tabs-shell--locked': isCompactLayout,
      'tabs-shell--scrollable': !isCompactLayout,
    }"
  >
    <div
      class="tabs-track"
      :class="[
        trackClass,
        {
          'tabs-track--single': isSingleTabLayout,
          'tabs-track--double': isTwoTabsLayout,
          'tabs-track--scrollable': !isCompactLayout,
        },
      ]"
      :style="trackStyle"
    >
      <button
        v-for="(tab, index) in tabs"
        :key="tabKey(tab, index)"
        type="button"
        class="tabs-button"
        :class="[
          buttonClass,
          tab?.buttonClass,
          resolveButtonStateClass(tab),
          {
            'tabs-button--disabled': isDisabled(tab),
            'tabs-button--equal': isCompactLayout,
            'tabs-button--peek': !isCompactLayout,
          },
        ]"
        :aria-pressed="isActive(tab)"
        :disabled="isDisabled(tab)"
        @click="handleClick(tab)"
      >
        <Icon
          v-if="tab?.icon"
          :icon="tab.icon"
          :class="[iconClass, tab?.iconClass]"
        />

        <span class="tabs-button__label" :class="tab?.labelClass">
          {{ tab?.label }}
        </span>

        <span
          v-if="hasCount(tab)"
          class="tabs-button__badge"
          :class="[
            badgeClass,
            tab?.badgeClass,
            resolveBadgeStateClass(tab),
          ]"
        >
          {{ tab.count }}
        </span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.tabs-shell {
  width: 100%;
}

.tabs-shell--locked {
  overflow-x: hidden;
}

.tabs-shell--scrollable {
  overflow-x: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
  scroll-snap-type: x proximity;
}

.tabs-shell--scrollable::-webkit-scrollbar {
  display: none;
}

.tabs-track {
  width: 100%;
  border-radius: 1rem;
  background: rgba(2, 6, 23, 0.6);
  padding: 0.3rem;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(10px);
}

.tabs-track--single,
.tabs-track--double {
  display: grid;
  gap: 0.5rem;
}

.tabs-track--single {
  grid-template-columns: minmax(0, 1fr);
}

.tabs-track--double {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.tabs-track--scrollable {
  display: flex;
  width: max-content;
  min-width: 100%;
  align-items: stretch;
  gap: 0.5rem;
}

.tabs-button {
  display: flex;
  min-height: 2.7rem;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  white-space: nowrap;
  border-radius: 0.75rem;
  border: 1px solid transparent;
  padding: 0.58rem 0.9rem;
  font-size: 0.875rem;
  font-weight: 700;
  transition:
    border-color 200ms ease,
    background-color 200ms ease,
    color 200ms ease,
    box-shadow 200ms ease,
    filter 200ms ease;
}

.tabs-button--equal {
  width: 100%;
  min-width: 0;
}

.tabs-button--peek {
  flex: 0 0 var(--tabs-peek-width, 30%);
  width: var(--tabs-peek-width, 30%);
  min-width: max-content;
  scroll-snap-align: start;
}

.tabs-button__label {
  flex: 0 0 auto;
  white-space: nowrap;
}

.tabs-button__badge {
  flex-shrink: 0;
  border-radius: 999px;
  border: 1px solid transparent;
  padding: 0.125rem 0.5rem;
  font-size: 11px;
  line-height: 1;
}

.tabs-button--disabled {
  cursor: not-allowed;
  opacity: 0.7;
}
</style>
