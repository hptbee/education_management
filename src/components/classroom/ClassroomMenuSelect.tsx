'use client'

import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useMotionEnabled } from '@/src/hooks/useMotionEnabled'
import { motionTransition, popoverVariants, reducedMotionTransition } from '@/src/utils/motion'

export interface ClassroomMenuOption {
  value: string
  label: string
}

interface ClassroomMenuSelectProps {
  id?: string
  value: string
  onChange: (value: string) => void
  options: ClassroomMenuOption[]
  'aria-label': string
  className?: string
  triggerClassName?: string
  disabled?: boolean
  children?: ReactNode | ((open: boolean) => ReactNode)
}

export function highlightIndexForValue(options: ClassroomMenuOption[], value: string): number {
  const index = options.findIndex((option) => option.value === value)
  return Math.max(0, index)
}

export function moveMenuHighlight(current: number, delta: number, length: number): number {
  if (length <= 0) return 0
  return (current + delta + length) % length
}

export function ClassroomMenuSelect({
  id,
  value,
  onChange,
  options,
  'aria-label': ariaLabel,
  className,
  triggerClassName,
  disabled = false,
  children,
}: ClassroomMenuSelectProps) {
  const autoId = useId()
  const listId = id ?? autoId
  const motionEnabled = useMotionEnabled()
  const popoverTransition = motionEnabled ? motionTransition('fast') : reducedMotionTransition()

  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({})
  const [highlight, setHighlight] = useState(0)

  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const selected = options.find((option) => option.value === value) ?? options[0]

  const updatePosition = () => {
    const trigger = triggerRef.current
    if (!trigger) return
    const rect = trigger.getBoundingClientRect()
    const gap = 8
    const maxH = 240
    const spaceBelow = window.innerHeight - rect.bottom - gap
    const openUp = spaceBelow < 132 && rect.top > spaceBelow
    setMenuStyle({
      position: 'fixed',
      left: rect.left,
      width: rect.width,
      zIndex: 130,
      ...(openUp
        ? { bottom: window.innerHeight - rect.top + gap, maxHeight: Math.min(maxH, rect.top - gap) }
        : { top: rect.bottom + gap, maxHeight: Math.min(maxH, Math.max(spaceBelow, 132)) }),
    })
  }

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (disabled) setOpen(false)
  }, [disabled])

  useLayoutEffect(() => {
    if (!open) return
    setHighlight(highlightIndexForValue(options, value))
    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [open, options, value])

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node
      if (rootRef.current?.contains(target) || menuRef.current?.contains(target)) return
      setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
    }
  }, [open])

  const scrollHighlightIntoView = (index: number) => {
    document.getElementById(`${listId}-option-${index}`)?.scrollIntoView({ block: 'nearest' })
  }

  const choose = (next: string) => {
    onChange(next)
    setOpen(false)
    triggerRef.current?.focus()
  }

  const moveHighlight = (delta: number) => {
    setHighlight((current) => {
      const next = moveMenuHighlight(current, delta, options.length)
      scrollHighlightIntoView(next)
      return next
    })
  }

  const onTriggerKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return

    if (event.key === 'Escape' && open) {
      event.preventDefault()
      event.stopPropagation()
      setOpen(false)
      return
    }

    if (event.key === 'Tab' && open) {
      setOpen(false)
      return
    }

    if (!open) {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp' || event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        setOpen(true)
      }
      return
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      moveHighlight(1)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      moveHighlight(-1)
    } else if (event.key === 'Home') {
      event.preventDefault()
      setHighlight(0)
      scrollHighlightIntoView(0)
    } else if (event.key === 'End') {
      event.preventDefault()
      const last = Math.max(0, options.length - 1)
      setHighlight(last)
      scrollHighlightIntoView(last)
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      const option = options[highlight]
      if (option) choose(option.value)
    }
  }

  const triggerContent =
    typeof children === 'function' ? children(open) : children ?? (
      <>
        <span className="min-w-0 flex-1 truncate">{selected?.label}</span>
        <ChevronDown
          className={cn('size-4 shrink-0 text-slate-400 transition-transform', open && 'rotate-180')}
          aria-hidden
        />
      </>
    )

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <button
        ref={triggerRef}
        type="button"
        id={id}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? `${listId}-menu` : undefined}
        aria-activedescendant={open ? `${listId}-option-${highlight}` : undefined}
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={onTriggerKeyDown}
        className={cn(
          'flex w-full min-h-11 items-center gap-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40',
          disabled && 'cursor-not-allowed opacity-50',
          triggerClassName,
        )}
      >
        {triggerContent}
      </button>

      {mounted
        ? createPortal(
            <AnimatePresence>
              {open ? (
                <motion.div
                  ref={menuRef}
                  id={`${listId}-menu`}
                  role="listbox"
                  aria-label={ariaLabel}
                  initial={motionEnabled ? 'initial' : false}
                  animate="animate"
                  exit="exit"
                  variants={popoverVariants}
                  transition={popoverTransition}
                  style={menuStyle}
                  className="overflow-y-auto rounded-2xl border border-sky-100 bg-white p-1 shadow-lg scrollbar-thin"
                >
                  {options.map((option, index) => {
                    const isSelected = option.value === value
                    const isActive = index === highlight
                    return (
                      <button
                        key={option.value}
                        type="button"
                        id={`${listId}-option-${index}`}
                        role="option"
                        aria-selected={isSelected}
                        tabIndex={-1}
                        onMouseEnter={() => setHighlight(index)}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => choose(option.value)}
                        className={cn(
                          'flex w-full min-h-11 items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-sm font-bold transition',
                          isSelected
                            ? 'bg-brand text-white'
                            : isActive
                              ? 'bg-brand-soft text-brand-dark'
                              : 'text-slate-700 hover:bg-brand-soft/70',
                        )}
                      >
                        <span className="min-w-0 truncate">{option.label}</span>
                        {isSelected ? <Check className="size-3.5 shrink-0" aria-hidden /> : null}
                      </button>
                    )
                  })}
                </motion.div>
              ) : null}
            </AnimatePresence>,
            document.body,
          )
        : null}
    </div>
  )
}
