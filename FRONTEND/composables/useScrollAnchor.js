import { ref, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'

export function useScrollAnchor({ scroller, headerOffset = 0, triggerVariable } = {}) {
  const topMostElement = ref(null)

  // --- unwrap robusto: Ref -> Ref -> $el -> Element
  function resolveEl (maybe) {
    let el = maybe
    while (el && typeof el === 'object' && 'value' in el) el = el.value
    if (el && el.$el) el = el.$el
    return el instanceof Element ? el : null
  }
  function getRoot () { return resolveEl(scroller) }

  // 1) trova e salva l’elemento più in alto visibile nello scroller
  function updateTopMost () {
    
    const root = getRoot()
    if (!root) return

    const listRoot = root.firstElementChild || root   // griglia di InfiniteGrid
    const rootRect = root.getBoundingClientRect()
    const children = Array.from(listRoot?.children || [])

    let best = null
    let bestTop = Infinity
    for (const el of children) {
      const relTop = el.getBoundingClientRect().top - rootRect.top
      if (relTop >= headerOffset && relTop < bestTop) {
        bestTop = relTop
        best = el
      }
    }
    
    topMostElement.value = best || null
  }

  // 3) scrolla lo scroller finché topMostElement è in cima
  function snapToTopMost () {
    const root = getRoot()
    const el = topMostElement.value
    if (!root || !el) return

    const rootRect = root.getBoundingClientRect()
    const relTop = el.getBoundingClientRect().top - rootRect.top
    const targetTop = root.scrollTop + (relTop - headerOffset)

    // compat: assegna scrollTop e usa scrollTo se disponibile
    root.scrollTop = targetTop
    root.scrollTo?.({ top: targetTop, left: 0 })
  }

  // 2) listener scroll (se parte) + fallback rAF se non parte
  function onScroll () {
    updateTopMost()
  }

  let attachedEl = null
  let rafId = null
  let lastScrollTop = null

  function startRafWatcher() {
    stopRafWatcher()
    const loop = () => {
      const root = getRoot()
      if (root) {
        const st = root.scrollTop
        if (st !== lastScrollTop) {
          lastScrollTop = st
          updateTopMost()
        }
      }
      rafId = requestAnimationFrame(loop)
    }
    rafId = requestAnimationFrame(loop)
  }

  function stopRafWatcher() {
    if (rafId) {
      cancelAnimationFrame(rafId)
      rafId = null
    }
  }

  function attach () {
    const root = getRoot()
    if (!root || attachedEl === root) return

    if (attachedEl) {
      attachedEl.removeEventListener('scroll', onScroll)
      attachedEl.removeEventListener('wheel', onScroll)
      attachedEl.removeEventListener('touchmove', onScroll)
    }

    root.addEventListener('scroll', onScroll, { passive: true })
    root.addEventListener('wheel', onScroll, { passive: true })
    root.addEventListener('touchmove', onScroll, { passive: true })
    attachedEl = root

    // (ri)avvia il fallback che osserva scrollTop
    lastScrollTop = root.scrollTop
    startRafWatcher()
  }

  watch(scroller, async () => {
    attach()
    await nextTick()
    updateTopMost()
  })

  onMounted(async () => {
    attach()
    await nextTick()
    updateTopMost()
  })

  onBeforeUnmount(() => {
    if (attachedEl) {
      attachedEl.removeEventListener('scroll', onScroll)
      attachedEl.removeEventListener('wheel', onScroll)
      attachedEl.removeEventListener('touchmove', onScroll)
      attachedEl = null
    }
    stopRafWatcher()
  })

  // 4) watcher sul trigger: dopo il toggle, riallinea e snappa
  if (triggerVariable) {
    watch(triggerVariable, async () => {
      await nextTick()
      updateTopMost()
      // usa rAF per snappare dopo il layout
      requestAnimationFrame(snapToTopMost)
    })
  }

  return {
    topMostElement,
    updateTopMost,
    snapToTopMost,
  }
}
