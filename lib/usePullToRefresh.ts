'use client'
import { useEffect, useRef, useState } from 'react'

export function usePullToRefresh(onRefresh: () => Promise<void> | void) {
  const [progress, setProgress] = useState(0) // 0-1
  const [refreshing, setRefreshing] = useState(false)
  const [done, setDone] = useState(false)
  const startY = useRef(0)
  const pulling = useRef(false)

  useEffect(() => {
    const THRESHOLD = 64

    function onTouchStart(e: TouchEvent) {
      if (window.scrollY > 0) return
      startY.current = e.touches[0].clientY
      pulling.current = true
    }

    function onTouchMove(e: TouchEvent) {
      if (!pulling.current || refreshing) return
      const dy = e.touches[0].clientY - startY.current
      if (dy <= 0) { setProgress(0); return }
      setProgress(Math.min(dy / THRESHOLD, 1))
    }

    async function onTouchEnd() {
      if (!pulling.current) return
      pulling.current = false
      if (progress >= 1 && !refreshing) {
        setRefreshing(true)
        setProgress(0)
        try { await onRefresh() } catch {}
        setDone(true)
        setTimeout(() => { setRefreshing(false); setDone(false) }, 700)
      } else {
        setProgress(0)
      }
    }

    document.addEventListener('touchstart', onTouchStart, { passive: true })
    document.addEventListener('touchmove', onTouchMove, { passive: true })
    document.addEventListener('touchend', onTouchEnd)
    return () => {
      document.removeEventListener('touchstart', onTouchStart)
      document.removeEventListener('touchmove', onTouchMove)
      document.removeEventListener('touchend', onTouchEnd)
    }
  }, [onRefresh, refreshing, progress])

  return { progress, refreshing, done }
}
