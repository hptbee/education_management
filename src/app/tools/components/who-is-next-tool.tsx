'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { RotateCcw, Users } from 'lucide-react'
import type { Student } from '@/src/types/models'
import { useAppData } from '@/src/store/AppDataContext'
import { getStudentAvatar } from '@/src/utils/student'
import { pickWithoutRepeat } from '@/src/utils/randomSelection'
import { ClassroomButton, ClassroomCard, EmptyState } from '@/src/components/classroom'

const CYCLE_TICKS = 24
const FAST_INTERVAL_MS = 60
const SLOW_INTERVAL_MS = 180

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function WhoIsNextTool() {
  const { data } = useAppData()
  const animationsEnabled = data?.appSettings.animationsEnabled ?? true
  const students = data?.students ?? []

  const [bag, setBag] = useState<string[]>([])
  const [picked, setPicked] = useState<Student | null>(null)
  const [cycling, setCycling] = useState(false)
  const [highlightId, setHighlightId] = useState<string | null>(null)
  const bagRef = useRef(bag)
  bagRef.current = bag

  const pool = useMemo(() => students, [students])
  const studentIds = useMemo(() => pool.map((s) => s.id).join('|'), [pool])

  useEffect(() => {
    setBag((current) => current.filter((id) => pool.some((s) => s.id === id)))
    setPicked((current) => (current && pool.some((s) => s.id === current.id) ? current : null))
  }, [studentIds, pool])

  const display = picked ?? pool.find((s) => s.id === highlightId) ?? null

  useEffect(() => {
    if (!cycling || pool.length === 0) return

    const complete = () => {
      const { selected, nextBag } = pickWithoutRepeat(pool, bagRef.current)
      const winner = selected ?? pool[Math.floor(Math.random() * pool.length)]
      setBag(nextBag)
      setPicked(winner)
      setHighlightId(winner?.id ?? null)
      setCycling(false)
    }

    if (!animationsEnabled || prefersReducedMotion()) {
      complete()
      return
    }

    let ticks = 0
    const interval = window.setInterval(() => {
      const random = pool[Math.floor(Math.random() * pool.length)]
      setHighlightId(random.id)
      ticks += 1
      if (ticks >= CYCLE_TICKS) {
        window.clearInterval(interval)
        complete()
      }
    }, ticks > CYCLE_TICKS - 5 ? SLOW_INTERVAL_MS : FAST_INTERVAL_MS)

    return () => window.clearInterval(interval)
  }, [cycling, pool, animationsEnabled])

  const startRound = () => {
    if (pool.length === 0 || cycling) return
    setPicked(null)
    setCycling(true)
  }

  const resetBag = () => {
    if (cycling) return
    setBag([])
    setPicked(null)
    setHighlightId(null)
  }

  return (
    <ClassroomCard className="flex h-full flex-col">
      <header className="mb-4 flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-pastel-lavender">
          <Users className="size-5 text-brand-purple" />
        </span>
        <div>
          <h2 className="font-display text-lg font-extrabold text-slate-800">Ai tiếp theo?</h2>
          <p className="mt-1 text-sm font-semibold text-slate-500">
            Luân phiên avatar rồi chậm dần đến người được chọn.
          </p>
        </div>
      </header>

      {pool.length === 0 ? (
        <EmptyState compact emoji="👋" title="Chưa có học sinh" description="Thêm học sinh để bắt đầu." />
      ) : (
        <div className="flex min-h-0 flex-1 flex-col rounded-2xl bg-gradient-to-b from-pastel-lavender/50 to-pastel-peach/30 px-4 py-5">
          <div
            className="flex min-h-[200px] flex-1 flex-col items-center justify-center text-center"
            aria-live="polite"
            aria-busy={cycling}
          >
            {display ? (
              <img
                src={getStudentAvatar(display)}
                alt={display.name}
                className={`size-28 rounded-full object-cover shadow-xl ring-4 transition ${
                  cycling ? 'scale-105 ring-white' : picked ? 'ring-brand-purple/40' : 'ring-white'
                }`}
              />
            ) : (
              <div className="flex size-28 items-center justify-center rounded-full bg-white shadow-lg ring-4 ring-white">
                <Users className="size-10 text-brand-purple/70" />
              </div>
            )}
            <p className="mt-4 font-display text-2xl font-black text-slate-800">
              {display ? display.name : 'Sẵn sàng'}
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              {cycling ? 'Đang quay...' : picked ? 'Bạn tiếp theo!' : 'Nhấn bắt đầu'}
            </p>
          </div>

          <ClassroomButton
            size="lg"
            className="mt-4 min-h-11 w-full shadow-md shadow-brand-purple/20"
            onClick={startRound}
            disabled={cycling}
          >
            {cycling ? 'Đang quay...' : 'Bắt đầu'}
          </ClassroomButton>
          <ClassroomButton variant="outline" size="lg" className="mt-2 min-h-11 w-full" onClick={resetBag} disabled={cycling}>
            <RotateCcw className="size-4" />
            Làm mới vòng
          </ClassroomButton>
        </div>
      )}
    </ClassroomCard>
  )
}
