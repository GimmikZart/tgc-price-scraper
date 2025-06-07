import { breakpointsTailwind, useBreakpoints } from "@vueuse/core";

export const useMyBreakpoints = defineStore("myBreakpoints", () => {
  const breakpoints = useBreakpoints(breakpointsTailwind);

  const isMobile = computed(() => breakpoints.smaller("lg")); // smaller than sm
  const isTablet = computed(() => breakpoints.between("sm", "lg")); // between sm and lg
  const isDesktop = computed(() => breakpoints.greaterOrEqual("lg")); // lg and larger

  return { isMobile, isTablet, isDesktop };
});
