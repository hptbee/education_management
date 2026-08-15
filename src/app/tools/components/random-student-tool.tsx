'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { RotateCcw, Shuffle } from 'lucide-react'
import type { Student } from '@/src/types/models'
import { useAppData } from '@/src/store/AppDataContext'
import { getStudentAvatar } from '@/src/utils/student'
import { pickWithoutRepeat } from '@/src/utils/randomSelection'
import { ClassroomButton, ClassroomCard, EmptyState } from '@/src/components/classroom'

const PREVIEW_LIMIT = 6
const SPIN_TICKS = 14
const SPIN_INTERVAL_MS = 90

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function RandomStudentTool() {
  const { data } = useAppData()
  const students = data?.students ?? []

  const [bag, setBag] = useState<string[]>([])
  const [picked, setPicked] = useState<Student | null>(null)
  const [spinning, setSpinning] = useState(false)
  const [highlightId, setHighlightId] = useState<string | null>(null)
  const bagRef = useRef(bag)

  bagRef.current = bag

  const pool = useMemo(() => students, [students])
  const studentIds = useMemo(() => pool.map((student) => student.id).join('|'), [pool])

  useEffect(() => {
    setBag((current) => {
      const next = current.filter((id) => pool.some((student) => student.id === id))
      if (next.length === current.length && next.every((id, index) => id === current[index])) return current
      return next
    })
    setPicked((current) => (current && pool.some((student) => student.id === current.id) ? current : null))
    setHighlightId((current) => (current && pool.some((student) => student.id === current) ? current : null))
  }, [studentIds, pool])

  const remainingStudents = useMemo(() => {
    if (bag.length > 0) return pool.filter((student) => bag.includes(student.id))
    if (picked) return []
    return pool
  }, [pool, bag, picked])

  const display = picked ?? pool.find((student) => student.id === highlightId) ?? null
  const remainingCount = remainingStudents.length

  useEffect(() => {
    if (!spinning || pool.length === 0) return

    const complete = () => {
      const { selected, nextBag } = pickWithoutRepeat(pool, bagRef.current)
      const fallback = pool[Math.floor(Math.random() * pool.length)]
      const winner = selected ?? fallback
      setBag(nextBag)
      setPicked(winner)
      setHighlightId(winner?.id ?? null)
      setSpinning(false)
    }

    if (prefersReducedMotion()) {
      complete()
      return
    }

    let ticks = 0
    const interval = window.setInterval(() => {
      const random = pool[Math.floor(Math.random() * pool.length)]
      setHighlightId(random.id)
      ticks += 1
      if (ticks >= SPIN_TICKS) {
        window.clearInterval(interval)
        complete()
      }
    }, SPIN_INTERVAL_MS)

    return () => window.clearInterval(interval)
  }, [spinning, pool])

  const startRound = () => {
    if (pool.length === 0 || spinning) return
    setPicked(null)
    setSpinning(true)
  }

  const resetBag = () => {
    if (spinning) return
    setBag([])
    setPicked(null)
    setHighlightId(null)
  }

  const previewStudents = remainingStudents.slice(0, PREVIEW_LIMIT)
  const extraRemaining = Math.max(0, remainingCount - PREVIEW_LIMIT)

  const statusLabel = spinning
    ? 'Đang chọn học sinh...'
    : remainingCount === 0 && picked
      ? 'Đã chọn hết vòng — nhấn bắt đầu để quay lại.'
      : `Còn ${remainingCount}/${pool.length} học sinh trong vòng`

  return (
    <ClassroomCard className="flex h-full flex-col">
      <header className="mb-4 flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-pastel-lavender">
          <Shuffle className="size-5 text-brand-purple" />
        </span>
        <div>
          <h2 className="font-display text-lg font-extrabold text-slate-800">Chọn ngẫu nhiên</h2>
          <p className="mt-1 text-sm font-semibold text-slate-500">
            Chọn lần lượt, không trùng trong cùng một vòng.
          </p>
        </div>
      </header>

      {pool.length === 0 ? (
        <EmptyState compact emoji="🎲" title="Chưa có học sinh" description="Thêm học sinh để bắt đầu." />
      ) : (
        <div className="flex min-h-0 flex-1 flex-col rounded-2xl bg-gradient-to-b from-pastel-lavender/50 via-white to-pastel-peach/40 px-4 py-5">
          <div
            className="flex min-h-[200px] flex-1 flex-col items-center justify-center text-center"
            aria-live="polite"
            aria-busy={spinning}
          >
            <div className="relative flex size-28 items-center justify-center">
              {display ? (
                <img
                  src={getStudentAvatar(display)}
                  alt={display.name}
                  className={`size-28 rounded-full object-cover shadow-xl ring-4 transition ${
                    spinning ? 'scale-105 ring-white' : picked ? 'ring-brand-purple/40' : 'ring-white'
                  }`}
                />
              ) : (
                <div className="flex size-28 items-center justify-center rounded-full bg-white shadow-lg ring-4 ring-white">
                  <Shuffle className="size-10 text-brand-purple/70" />
                </div>
              )}
            </div>

            <p className="mt-4 min-h-9 font-display text-2xl font-black text-slate-800">
              {display ? display.name : 'Sẵn sàng chọn'}
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              {spinning ? 'Đang quay...' : picked ? 'Học sinh được chọn' : 'Nhấn bắt đầu để quay'}
            </p>
          </div>

          <div className="mt-4 flex min-h-9 items-center justify-center">
            {previewStudents.length > 0 ? (
              <div className="flex items-center">
                <div className="flex -space-x-2">
                  {previewStudents.map((student, index) => (
                    <img
                      key={student.id}
                      src={getStudentAvatar(student)}
                      alt={student.name}
                      title={student.name}
                      className="size-8 rounded-full border-2 border-white object-cover shadow-sm"
                      style={{ zIndex: PREVIEW_LIMIT - index }}
                    />
                  ))}
                </div>
                {extraRemaining > 0 ? (
                  <span className="ml-2 rounded-full bg-white px-2 py-1 text-[11px] font-bold text-slate-500">
                    +{extraRemaining}
                  </span>
                ) : null}
              </div>
            ) : (
              <span className="text-xs font-bold text-slate-400">Hết học sinh trong vòng này</span>
            )}
          </div>

          <p className="mt-2 text-center text-xs font-bold text-brand-purple/80">{statusLabel}</p>

          <ClassroomButton
            size="lg"
            className="mt-4 min-h-11 w-full shadow-md shadow-brand-purple/20"
            onClick={startRound}
            disabled={spinning}
          >
            <Shuffle className="size-4" />
            {spinning ? 'Đang quay...' : 'Bắt đầu'}
          </ClassroomButton>
          <ClassroomButton
            variant="outline"
            size="lg"
            className="mt-2 min-h-11 w-full"
            onClick={resetBag}
            disabled={spinning}
          >
            <RotateCcw className="size-4" />
            Làm mới vòng
          </ClassroomButton>
        </div>
      )}
    </ClassroomCard>
  )
}
