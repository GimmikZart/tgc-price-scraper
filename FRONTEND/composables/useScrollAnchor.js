import { ref, nextTick } from 'vue'

export function useScrollAnchor(opts = {}) {
  const itemRefs = new Map() // id -> element
  const anchorId = ref(null)
  const anchorViewportTop = ref(0)        // distanza dal top del viewport del *contenitore scrollabile*
  const headerOffset = opts.headerOffset || 0  // altezza navbar sticky dentro allo scroller
  const scrollerRef = opts.scroller || null    // ref a un contenitore scrollabile; se assente usa window

  function getScroller() {
    const scroller = scrollerRef?.value
    if (scroller && scroller instanceof Element) return scroller
    // fallback: documento
    return document.scrollingElement || document.documentElement
  }

  function getViewportTop(el) {
    const scroller = getScroller()
    if (scroller === document.scrollingElement || scroller === document.documentElement) {
      // viewport = window
      return el.getBoundingClientRect().top
    }
    // viewport = scroller
    const elRect = el.getBoundingClientRect()
    const scrollerRect = scroller.getBoundingClientRect()
    return elRect.top - scrollerRect.top
  }

  function getScrollTop() {
    const scroller = getScroller()
    return (scroller === document.scrollingElement || scroller === document.documentElement)
      ? window.scrollY
      : scroller.scrollTop
  }

  function setScrollTop(top) {
    const scroller = getScroller()
    if (scroller === document.scrollingElement || scroller === document.documentElement) {
      window.scrollTo({ top, behavior: 'auto' })
    } else {
      scroller.scrollTo ? scroller.scrollTo({ top, behavior: 'auto' }) : (scroller.scrollTop = top)
    }
  }

  function getDocTop(el) {
    const scroller = getScroller()
    if (scroller === document.scrollingElement || scroller === document.documentElement) {
      // docTop = window.scrollY + rect.top
      return window.scrollY + el.getBoundingClientRect().top
    }
    // docTop relativo allo scroller: scrollTop + viewportTop
    return getScrollTop() + getViewportTop(el)
  }

  function setItemRef(id, el) {
    if (!id) return
    if (el) itemRefs.set(id, el)
    else itemRefs.delete(id)
  }

  function _pickExistingElFromVisible(visibleItems) {
    if (!visibleItems || visibleItems.length === 0) return null
    // prova quello a metà, se non è montato prova i vicini
    const mid = Math.floor(visibleItems.length / 2)
    const order = []
    for (let i = 0; i < visibleItems.length; i++) {
      const left = mid - i
      const right = mid + i
      if (left >= 0) order.push(visibleItems[left])
      if (right < visibleItems.length && right !== left) order.push(visibleItems[right])
    }
    for (const v of order) {
      const el = itemRefs.get(v.id)
      if (el) return { id: v.id, el }
    }
    return null
  }

  function captureFromList(visibleItems) {
    const pick = _pickExistingElFromVisible(visibleItems)
    if (!pick) {
      anchorId.value = null
      return
    }
    anchorId.value = pick.id
    const vTop = getViewportTop(pick.el) - headerOffset
    anchorViewportTop.value = vTop
  }

  // aspetta nextTick + N frame di rAF
  function waitLayoutFrames(frames = 3) {
    return new Promise(async (resolve) => {
      await nextTick()
      const step = () => requestAnimationFrame(() => {
        frames <= 1 ? resolve() : (frames--, step())
      })
      step()
    })
  }

  async function restore() {
    console.log('SCROLLER', getScroller())
    console.log('before', getScrollTop())
    if (!anchorId.value) return
    await waitLayoutFrames(3) // grid / immagini / bottoni

    const el = itemRefs.get(anchorId.value)
    if (!el) return

    // porta l’elemento alla stessa distanza dal top del viewport
    const currentViewportTop = getViewportTop(el)
    const delta = currentViewportTop - anchorViewportTop.value
    if (delta !== 0) setScrollTop(getScrollTop() + delta)

    // Se dopo il primo aggiustamento il layout continua a “respirare”, fai un secondo pass.
    await waitLayoutFrames(1)
    const el2 = itemRefs.get(anchorId.value)
    if (!el2) return
    const currentViewportTop2 = getViewportTop(el2)
    const delta2 = currentViewportTop2 - anchorViewportTop.value
    if (Math.abs(delta2) > 1) setScrollTop(getScrollTop() + delta2)
    console.log('after', getScrollTop())
  }

  return {
    setItemRef,
    captureFromList,
    restore,
  }
}
