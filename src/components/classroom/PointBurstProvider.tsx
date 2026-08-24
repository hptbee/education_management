'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useAppData } from '@/src/store/AppDataContext'
import { useMotionEnabled } from '@/src/hooks/useMotionEnabled'
import { motionTransition, reducedMotionTransition, filterBurstsForClassroom } from '@/src/utils/motion'

const MAX_BURST = 8
const BURST_DURATION_MS = 420

export type PointBurstAnchor = {
  studentId: string
  x: number
  y: number
}

type PointBurstItem = {
  id: string
  delta: number
  x: number
  y: number
  classroomId: string
}

type PointBurstContextValue = {
  spawnPointBurst: (options: { studentId: string; delta: number }) => void
}

const PointBurstContext = createContext<PointBurstContextValue | null>(null)

function findAnchor(studentId: string): { x: number; y: number } | null {
  if (typeof document === 'undefined') return null
  const el = document.querySelector(`[data-student-id="${studentId}"]`)
  if (!el) return null
  const rect = el.getBoundingClientRect()
  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height * 0.35,
  }
}

export function PointBurstProvider({ children }: { children: ReactNode }) {
  const { data } = useAppData()
  const classroomId = data?.metadata.id
  const motionEnabled = useMotionEnabled()
  const [mounted, setMounted] = useState(false)
  const [bursts, setBursts] = useState<PointBurstItem[]>([])
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())
  const skipInitialRef = useRef(true)

  useEffect(() => {
    setMounted(true)
    return () => {
      timersRef.current.forEach((timer) => clearTimeout(timer))
      timersRef.current.clear()
    }
  }, [])

  useEffect(() => {
    setBursts([])
    timersRef.current.forEach((timer) => clearTimeout(timer))
    timersRef.current.clear()
    skipInitialRef.current = true
  }, [classroomId])

  const removeBurst = useCallback((id: string) => {
    setBursts((prev) => prev.filter((item) => item.id !== id))
    const timer = timersRef.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timersRef.current.delete(id)
    }
  }, [])

  const spawnPointBurst = useCallback(
    ({ studentId, delta }: { studentId: string; delta: number }) => {
      if (skipInitialRef.current) return
      if (!motionEnabled || delta === 0) return

      const spawnClassroomId = classroomId
      if (!spawnClassroomId) return

      const anchor = findAnchor(studentId)
      if (!anchor) return

      const id = `${studentId}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
      setBursts((prev) => {
        const next = [...prev, { id, delta, x: anchor.x, y: anchor.y, classroomId: spawnClassroomId }]
        return next.length > MAX_BURST ? next.slice(-MAX_BURST) : next
      })

      const timer = setTimeout(() => removeBurst(id), BURST_DURATION_MS)
      timersRef.current.set(id, timer)
    },
    [classroomId, motionEnabled, removeBurst],
  )

  useEffect(() => {
    if (!classroomId) return
    const frame = requestAnimationFrame(() => {
      skipInitialRef.current = false
    })
    return () => cancelAnimationFrame(frame)
  }, [classroomId])

  const value = useMemo(() => ({ spawnPointBurst }), [spawnPointBurst])

  const transition = motionEnabled ? motionTransition('emphasis') : reducedMotionTransition()
  const visibleBursts = filterBurstsForClassroom(bursts, classroomId)

  return (
    <PointBurstContext.Provider value={value}>
      {children}
      {mounted
        ? createPortal(
            <div className="pointer-events-none fixed inset-0 z-[120]" aria-hidden>
              <AnimatePresence>
                {visibleBursts.map((burst) => (
                  <motion.span
                    key={burst.id}
                    initial={{ opacity: 0, y: 0, scale: 0.9 }}
                    animate={{ opacity: 1, y: -16, scale: 1 }}
                    exit={{ opacity: 0, y: -28, scale: 0.95 }}
                    transition={transition}
                    className={`absolute -translate-x-1/2 font-display text-lg font-black drop-shadow-sm ${
                      burst.delta > 0 ? 'text-emerald-600' : 'text-rose-600'
                    }`}
                    style={{ left: burst.x, top: burst.y }}
                  >
                    {burst.delta > 0 ? `+${burst.delta}` : burst.delta}
                  </motion.span>
                ))}
              </AnimatePresence>
            </div>,
            document.body,
          )
        : null}
    </PointBurstContext.Provider>
  )
}

export function usePointBurst() {
  const context = useContext(PointBurstContext)
  if (!context) {
    throw new Error('usePointBurst must be used within PointBurstProvider')
  }
  return context
}
