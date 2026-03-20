import { useRef, useCallback } from 'react'

export function useScrollSync() {
  const headerRef = useRef<HTMLDivElement>(null)
  const bodyRef = useRef<HTMLDivElement>(null)
  const leftRef = useRef<HTMLDivElement>(null)
  const rightRef = useRef<HTMLDivElement>(null)

  const onBodyScroll = useCallback(() => {
    const body = bodyRef.current
    if (!body) return
    if (headerRef.current) {
      headerRef.current.scrollLeft = body.scrollLeft
    }
    if (leftRef.current) {
      leftRef.current.scrollTop = body.scrollTop
    }
    if (rightRef.current) {
      rightRef.current.scrollTop = body.scrollTop
    }
  }, [])

  return { headerRef, bodyRef, leftRef, rightRef, onBodyScroll }
}
