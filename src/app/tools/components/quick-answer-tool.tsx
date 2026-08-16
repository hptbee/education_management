'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, RotateCcw, Shuffle, X } from 'lucide-react'
import type { PointAction, Student } from '@/src/types/models'
import { useAppData } from '@/src/store/AppDataContext'
import { getStudentAvatar } from '@/src/utils/student'
import { pickWithoutRepeat } from '@/src/utils/randomSelection'
import { ClassroomButton, ClassroomCard, EmptyState } from '@/src/components/classroom'

const QUICK_ANSWER_ACTION: PointAction = {
  id: 'tool-quick-answer',
  name: 'Trả lời nhanh',
  points: 1,
  type: 'reward',
  isActive: true,
}

const SPIN_TICKS = 12
const SPIN_INTERVAL_MS = 80

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function QuickAnswerTool() {
  const { data, applyPoints } = useAppData()
  const animationsEnabled = data?.appSettings.animationsEnabled ?? true
  const students = data?.students ?? []

  const [bag, setBag] = useState<string[]>([])
  const [picked, setPicked] = useState<Student | null>(null)
  const [spinning, setSpinning] = useState(false)
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
    if (!spinning || pool.length === 0) return

    const complete = () => {
      const { selected, nextBag } = pickWithoutRepeat(pool, bagRef.current)
      const winner = selected ?? pool[Math.floor(Math.random() * pool.length)]
      setBag(nextBag)
      setPicked(winner)
      setHighlightId(winner?.id ?? null)
      setSpinning(false)
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
      if (ticks >= SPIN_TICKS) {
        window.clearInterval(interval)
        complete()
      }
    }, SPIN_INTERVAL_MS)

    return () => window.clearInterval(interval)
  }, [spinning, pool, animationsEnabled])

  const pickNext = () => {
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

  const handleCorrect = () => {
    if (!picked) return
    applyPoints(picked.id, QUICK_ANSWER_ACTION, undefined, 'game')
    setPicked(null)
    setHighlightId(null)
  }

  const handleSkip = () => {
    setPicked(null)
    setHighlightId(null)
  }

  return (
    <ClassroomCard className="flex h-full flex-col">
      <header className="mb-4 flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-pastel-sky">
          <Check className="size-5 text-brand" />
        </span>
        <div>
          <h2 className="font-display text-lg font-extrabold text-slate-800">Trả lời nhanh</h2>
          <p className="mt-1 text-sm font-semibold text-slate-500">
            Chọn học sinh trả lời — Đúng +1 điểm, Sai/Bỏ qua không điểm.
          </p>
        </div>
      </header>

      {pool.length === 0 ? (
        <EmptyState compact emoji="💡" title="Chưa có học sinh" description="Thêm học sinh để bắt đầu." />
      ) : (
        <div className="flex min-h-0 flex-1 flex-col rounded-2xl bg-gradient-to-b from-pastel-sky/40 to-white px-4 py-5">
          <div className="flex min-h-[160px] flex-1 flex-col items-center justify-center text-center" aria-live="polite">
            {display ? (
              <img
                src={getStudentAvatar(display)}
                alt={display.name}
                className="size-24 rounded-full object-cover shadow-lg ring-4 ring-white"
              />
            ) : (
              <div className="flex size-24 items-center justify-center rounded-full bg-white shadow-lg ring-4 ring-white">
                <Shuffle className="size-10 text-brand/60" />
              </div>
            )}
            <p className="mt-4 font-display text-2xl font-black text-slate-800">
              {display ? display.name : 'Sẵn sàng'}
            </p>
          </div>

          {picked ? (
            <div className="mt-4 grid grid-cols-3 gap-2">
              <ClassroomButton className="min-h-11" onClick={handleCorrect}>
                <Check className="size-4" /> Đúng (+1)
              </ClassroomButton>
              <ClassroomButton variant="outline" className="min-h-11" onClick={handleSkip}>
                <X className="size-4" /> Sai
              </ClassroomButton>
              <ClassroomButton variant="secondary" className="min-h-11" onClick={handleSkip}>
                Bỏ qua
              </ClassroomButton>
            </div>
          ) : (
            <ClassroomButton
              size="lg"
              className="mt-4 min-h-11 w-full"
              onClick={pickNext}
              disabled={spinning}
            >
              <Shuffle className="size-4" />
              {spinning ? 'Đang chọn...' : 'Chọn học sinh'}
            </ClassroomButton>
          )}

          <ClassroomButton variant="outline" className="mt-2 min-h-11 w-full" onClick={resetBag} disabled={spinning}>
            <RotateCcw className="size-4" />
            Làm mới vòng
          </ClassroomButton>
        </div>
      )}
    </ClassroomCard>
  )
}
