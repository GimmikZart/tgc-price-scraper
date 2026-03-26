<script setup>
import { computed, onMounted, ref } from "vue";
import { onClickOutside } from "@vueuse/core";
import FloatMenuActionIcon from "@/components/Mobile/icons/FloatMenuActionIcon.vue";

const props = defineProps({
  icon: { type: String, required: true },
  label: { type: String, required: true },
  color: { type: String, default: "orange" },
  iconColor: { type: String, default: null },
  iconClass: { type: String, default: "h-6 w-6" },
  disabled: { type: Boolean, default: false },
  multi: { type: Boolean, default: false },
  direction: { type: String, default: "up" }, // up | down | left | right
  transition: { type: Boolean, default: false },
  duration: { type: Number, default: 500 },
  delay: { type: Number, default: 0 },
});

const emit = defineEmits(["click"]);

const multiOpened = ref(false);
const rootEl = ref(null);
const entered = ref(!props.transition);

const paletteByColor = {
  orange: {
    accent: "#ff9d52",
    soft: "rgba(255,122,24,0.2)",
    glow: "rgba(255,122,24,0.55)",
    label: "#ffd1a9",
  },
  green: {
    accent: "#5ce39a",
    soft: "rgba(46,204,113,0.2)",
    glow: "rgba(46,204,113,0.5)",
    label: "#b9ffd9",
  },
  red: {
    accent: "#ff7f7f",
    soft: "rgba(239,68,68,0.2)",
    glow: "rgba(239,68,68,0.45)",
    label: "#ffd2d2",
  },
  purple: {
    accent: "#b898ff",
    soft: "rgba(168,85,247,0.2)",
    glow: "rgba(168,85,247,0.45)",
    label: "#e5d7ff",
  },
  blue: {
    accent: "#6cb9ff",
    soft: "rgba(59,130,246,0.2)",
    glow: "rgba(59,130,246,0.45)",
    label: "#d2e8ff",
  },
  yellow: {
    accent: "#ffd36c",
    soft: "rgba(234,179,8,0.2)",
    glow: "rgba(234,179,8,0.45)",
    label: "#ffefbf",
  },
};

const normalizeColorKey = (value = "") => {
  const key = value.trim().toLowerCase();
  return paletteByColor[key] ? key : "orange";
};

const accentKey = computed(() => normalizeColorKey(props.iconColor || props.color));
const accentPalette = computed(() => paletteByColor[accentKey.value]);

const shouldHighlight = computed(() => {
  return multiOpened.value || Boolean(props.iconColor) || props.color !== "orange";
});

const tileStyle = computed(() => ({
  "--fm-accent": accentPalette.value.accent,
  "--fm-accent-soft": accentPalette.value.soft,
  "--fm-accent-glow": accentPalette.value.glow,
  "--fm-accent-label": accentPalette.value.label,
}));

const placementClasses = computed(() => {
  switch (props.direction) {
    case "down":
      return "top-full mt-2 left-1/2 -translate-x-1/2";
    case "left":
      return "right-full mr-2 top-1/2 -translate-y-1/2";
    case "right":
      return "left-full ml-2 top-1/2 -translate-y-1/2";
    default:
      return "bottom-full mb-2 left-1/2 -translate-x-1/2";
  }
});

const startTransitionClasses = computed(() => {
  if (!props.transition) return "";
  switch (props.direction) {
    case "down":
      return "opacity-0 -translate-y-full";
    case "left":
      return "opacity-0 translate-x-full";
    case "right":
      return "opacity-0 -translate-x-full";
    default:
      return "opacity-0 translate-y-full";
  }
});

const endTransitionClasses = computed(() => {
  if (!props.transition) return "";
  return props.disabled
    ? "opacity-45 translate-x-0 translate-y-0 cursor-not-allowed"
    : "opacity-100 translate-x-0 translate-y-0";
});

const timingStyle = computed(() =>
  props.transition
    ? {
        transitionDuration: `${props.duration}ms`,
        transitionDelay: `${props.delay}ms`,
      }
    : null,
);

const transitionBaseClasses = computed(() =>
  props.transition ? "will-change-transform transition-all ease-out" : "",
);

function closeMenu() {
  multiOpened.value = false;
}

function handleClick() {
  if (props.disabled) return;
  if (props.multi) {
    multiOpened.value = !multiOpened.value;
    return;
  }
  emit("click");
}

onClickOutside(rootEl, closeMenu);

onMounted(() => {
  if (!props.transition) return;
  requestAnimationFrame(() => {
    entered.value = true;
  });
});
</script>

<template>
  <div ref="rootEl" class="relative flex w-full items-center justify-center">
    <button
      type="button"
      :style="[tileStyle, timingStyle]"
      :class="[
        'group relative flex w-full min-w-0 flex-col items-center justify-center gap-1 rounded-2xl px-1 pb-2 pt-2 text-slate-200/80 transition-all duration-200 ease-out',
        transitionBaseClasses,
        entered ? endTransitionClasses : startTransitionClasses,
        disabled ? 'cursor-not-allowed opacity-45' : 'hover:text-slate-100',
        shouldHighlight ? 'text-[var(--fm-accent)]' : '',
        multi ? 'pt-4' : '',
      ]"
      :disabled="disabled"
      @click="handleClick"
    >
      <span
        v-if="multi"
        class="pointer-events-none absolute top-1.5 inline-flex h-3 w-3 items-center justify-center text-slate-300/75 transition-transform duration-200"
        :class="multiOpened ? 'rotate-180' : ''"
      >
        <svg
          viewBox="0 0 12 12"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
          class="h-3 w-3"
        >
          <path
            d="M2.2 4.5L6 8.1L9.8 4.5"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </span>

      <span
        class="relative flex h-9 w-9 items-center justify-center rounded-xl transition-all duration-200 ease-out"
        :class="shouldHighlight
          ? 'scale-105 bg-[var(--fm-accent-soft)] shadow-[0_0_20px_var(--fm-accent-glow)]'
          : 'scale-100 bg-white/5 group-hover:bg-white/10'"
      >
        <slot name="over-icon" />
        <FloatMenuActionIcon
          :icon="icon"
          :label="label"
          :active="shouldHighlight || multiOpened"
          :class="iconClass"
        />
      </span>

      <span
        class="text-center text-[11px] font-medium leading-none tracking-wide transition-all duration-200 ease-out"
        :class="shouldHighlight ? 'text-[var(--fm-accent-label)] opacity-100' : 'opacity-75 group-hover:opacity-90'"
      >
        {{ label }}
      </span>
    </button>

    <div
      v-if="multiOpened"
      :class="[
        'absolute z-[10000] min-w-[190px] rounded-2xl border border-white/15 bg-slate-950/95 p-3 shadow-[0_20px_45px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-2xl',
        placementClasses,
      ]"
      @click="closeMenu"
    >
      <slot name="buttons" />
    </div>
  </div>
</template>
