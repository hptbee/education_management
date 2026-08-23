'use client'

import { useEffect, useRef } from 'react'
import { isTopTrap, pushTrapStack, removeTrapStack } from './modalTrapStack'

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

export function useModalFocusTrap(
  open: boolean,
  onCancel?: () => void,
  options?: { initialFocusSelector?: string },
) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)
  const trapIdRef = useRef<number | null>(null)
  const onCancelRef = useRef(onCancel)
  const initialFocusSelectorRef = useRef(options?.initialFocusSelector)

  useEffect(() => {
    onCancelRef.current = onCancel
    initialFocusSelectorRef.current = options?.initialFocusSelector
  })

  useEffect(() => {
    if (!open) return

    const trapId = pushTrapStack()
    trapIdRef.current = trapId

    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null

    const focusInitial = () => {
      const container = containerRef.current
      if (!container) return

      const initialFocusSelector = initialFocusSelectorRef.current
      if (initialFocusSelector) {
        const preferred = container.querySelector<HTMLElement>(initialFocusSelector)
        if (preferred) {
          preferred.focus()
          return
        }
      }

      const focusable = container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
      if (focusable.length > 0) {
        focusable[0].focus()
      } else {
        container.focus()
      }
    }

    const frame = requestAnimationFrame(focusInitial)

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isTopTrap(trapId)) return

      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        onCancelRef.current?.()
        return
      }

      if (event.key !== 'Tab') return

      const container = containerRef.current
      if (!container) return

      const focusable = [...container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)].filter(
        (el) => !el.hasAttribute('disabled') && el.tabIndex !== -1,
      )
      if (focusable.length === 0) {
        event.preventDefault()
        event.stopPropagation()
        return
      }

      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      const active = document.activeElement

      if (event.shiftKey) {
        if (active === first || !container.contains(active)) {
          event.preventDefault()
          event.stopPropagation()
          last.focus()
        }
      } else if (active === last) {
        event.preventDefault()
        event.stopPropagation()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      cancelAnimationFrame(frame)
      document.removeEventListener('keydown', handleKeyDown)
      removeTrapStack(trapId)
      trapIdRef.current = null
      previousFocusRef.current?.focus()
      previousFocusRef.current = null
    }
  }, [open])

  return containerRef
}
