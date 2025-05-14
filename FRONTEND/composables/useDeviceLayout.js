import { useMediaQuery } from '@vueuse/core'

export const useDeviceLayout = () => {
    const isMobile = useMediaQuery('(max-width: 768px)')
    const isTablet = useMediaQuery('(min-width: 769px) and (max-width: 1024px)')
    const isDesktop = useMediaQuery('(min-width: 1025px)')

    const layout = computed(() => {
        if (isMobile.value) return 'mobile'
        if (isTablet.value) return 'tablet'
        if (isDesktop.value) return 'desktop'
    })

    return { layout }
}
