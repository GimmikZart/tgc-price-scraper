import { useMyBreakpoints } from "@/composables/useMyBreakpoints";

export const useDeviceLayout = () => {
  const { isMobile, isDesktop } = useMyBreakpoints();

  const layout = computed(() => {
    if (isMobile.value) return "mobile";
    else if (isDesktop.value) return "desktop";
  });

  return { layout };
};
