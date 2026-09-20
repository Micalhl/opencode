import { createSignal, onCleanup } from "solid-js"

/**
 * 悬停时若文本被截断，则横向滚动一次展示完整内容，滚动后停在末尾不重播。
 * 悬停时先隐藏省略号，等悬停展开的按钮宽度稳定后再测量并启动滚动。
 */
export function createTitleScroll(options: { enabled?: () => boolean; delay?: number } = {}) {
  const [hovering, setHovering] = createSignal(false)
  const [scrolling, setScrolling] = createSignal(false)
  let wrap: HTMLElement | undefined
  let inner: HTMLElement | undefined
  let timer: number | undefined

  const stop = () => {
    if (timer !== undefined) {
      clearTimeout(timer)
      timer = undefined
    }
    setScrolling(false)
    setHovering(false)
  }

  const start = () => {
    stop()
    if (options.enabled && !options.enabled()) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    setHovering(true)
    timer = window.setTimeout(() => {
      timer = undefined
      if (!wrap || !inner) return
      const distance = inner.scrollWidth - wrap.clientWidth
      if (distance <= 0) return
      inner.style.setProperty("--title-scroll-shift", `-${distance}px`)
      // 约 73px/s。
      inner.style.setProperty("--title-scroll-duration", `${Math.max(1370, Math.round(distance * 15.6))}ms`)
      setScrolling(true)
    }, options.delay ?? 180)
  }

  onCleanup(stop)

  return {
    hovering,
    scrolling,
    start,
    stop,
    setWrap: (el: HTMLElement | undefined) => {
      wrap = el
    },
    setInner: (el: HTMLElement | undefined) => {
      inner = el
    },
  }
}
