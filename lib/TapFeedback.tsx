'use client'
import { useEffect } from 'react'

const CLICKABLE = 'button, a, label, select, summary, [role="button"], .pressable, .card-pressable, .btn'

function findTarget(el: Element | null): HTMLElement | null {
  const hit = el?.closest(CLICKABLE) as HTMLElement | null
  if (hit) return hit
  // Clickable divs (e.g. product cards) are marked only by cursor: pointer.
  for (let n = el as HTMLElement | null; n && n !== document.body; n = n.parentElement) {
    if (getComputedStyle(n).cursor === 'pointer') return n
  }
  return null
}

// Shows a ripple where the finger touched and briefly highlights the pressed control.
export default function TapFeedback() {
  useEffect(() => {
    const layer = document.createElement('div')
    layer.className = 'tap-layer'
    document.body.appendChild(layer)

    const onDown = (e: PointerEvent) => {
      if (e.button !== 0) return
      const target = findTarget(e.target as Element)
      if (!target || (target as HTMLButtonElement).disabled) return

      const dot = document.createElement('span')
      dot.className = 'tap-dot'
      dot.style.left = e.clientX + 'px'
      dot.style.top = e.clientY + 'px'
      layer.appendChild(dot)
      setTimeout(() => dot.remove(), 550)

      target.classList.add('tap-pressed')
      const release = () => {
        setTimeout(() => target.classList.remove('tap-pressed'), 120)
        window.removeEventListener('pointerup', release)
        window.removeEventListener('pointercancel', release)
      }
      window.addEventListener('pointerup', release)
      window.addEventListener('pointercancel', release)
    }

    window.addEventListener('pointerdown', onDown, { passive: true })
    return () => {
      window.removeEventListener('pointerdown', onDown)
      layer.remove()
    }
  }, [])
  return null
}
