'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { RotateCcw, Star } from 'lucide-react'
import type { Student } from '@/src/types/models'
import { useAppData } from '@/src/store/AppDataContext'
import { getStudentAvatar } from '@/src/utils/student'
import { pickWithoutRepeat } from '@/src/utils/randomSelection'
import { ClassroomButton, ClassroomCard, EmptyState } from '@/src/components/classroom'

const STAR_SLOTS = 16

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function LuckyStarTool() {
  const { data } = useAppData()
  const animationsEnabled = data?.appSettings.animationsEnabled ?? true
  const students = data?.students ?? []

  const [bag, setBag] = useState<string[]>([])
  const [revealed, setRevealed] = useState<Record<number, Student>>({})
  const [lastReveal, setLastReveal] = useState<Student | null>(null)
  const bagRef = useRef(bag)
  bagRef.current = bag

  const pool = useMemo(() => students, [students])
  const studentIds = useMemo(() => pool.map((s) => s.id).join('|'), [pool])

  useEffect(() => {
    setBag((current) => current.filter((id) => pool.some((s) => s.id === id)))
    setRevealed((current) => {
      const next: Record<number, Student> = {}
      for (const [slot, student] of Object.entries(current)) {
        if (pool.some((s) => s.id === student.id)) {
          next[Number(slot)] = student
        }
      }
      return next
    })
  }, [studentIds, pool])

  const remainingInBag = useMemo(() => {
    if (bag.length > 0) return pool.filter((s) => bag.includes(s.id)).length
    return pool.length - Object.keys(revealed).length
  }, [bag, pool, revealed])

  const revealStar = (slot: number) => {
    if (revealed[slot] || pool.length === 0) return
    const { selected, nextBag } = pickWithoutRepeat(pool, bagRef.current)
    if (!selected) return
    setBag(nextBag)
    setRevealed((current) => ({ ...current, [slot]: selected }))
    setLastReveal(selected)
  }

  const resetRound = () => {
    setBag([])
    setRevealed({})
    setLastReveal(null)
  }

  const allRevealed = pool.length > 0 && Object.keys(revealed).length >= pool.length

  return (
    <ClassroomCard className="flex h-full flex-col">
      <header className="mb-4 flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-pastel-peach">
          <Star className="size-5 text-amber-500" />
        </span>
        <div>
          <h2 className="font-display text-lg font-extrabold text-slate-800">Ngôi sao may mắn</h2>
          <p className="mt-1 text-sm font-semibold text-slate-500">
            Chọn một ngôi sao để mở học sinh — không trùng trong vòng.
          </p>
        </div>
      </header>

      {pool.length === 0 ? (
        <EmptyState compact emoji="⭐" title="Chưa có học sinh" description="Thêm học sinh để bắt đầu." />
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-4">
          {lastReveal ? (
            <div className="flex items-center gap-3 rounded-2xl bg-white/80 px-4 py-3 shadow-sm" aria-live="polite">
              <img
                src={getStudentAvatar(lastReveal)}
                alt={lastReveal.name}
                className="size-12 rounded-full object-cover ring-2 ring-amber-200"
              />
              <div>
                <p className="font-display text-lg font-black text-slate-800">{lastReveal.name}</p>
                <p className="text-xs font-semibold text-slate-500">Ngôi sao mới mở</p>
              </div>
            </div>
          ) : null}

          <div className="grid grid-cols-4 gap-2 sm:grid-cols-4">
            {Array.from({ length: STAR_SLOTS }, (_, index) => {
              const student = revealed[index]
              const isHidden = !student
              return (
                <button
                  key={index}
                  type="button"
                  disabled={!isHidden || allRevealed}
                  onClick={() => revealStar(index)}
                  className={`flex min-h-14 items-center justify-center rounded-2xl border-2 transition ${
                    student
                      ? 'border-amber-200 bg-amber-50'
                      : 'border-amber-100 bg-gradient-to-br from-amber-100 to-yellow-50 hover:border-amber-300 hover:shadow-md disabled:opacity-40'
                  } ${animationsEnabled && !prefersReducedMotion() && isHidden ? 'motion-safe-hover' : ''}`}
                  aria-label={student ? student.name : `Ngôi sao ${index + 1}`}
                >
                  {student ? (
                    <img
                      src={getStudentAvatar(student)}
                      alt={student.name}
                      className="size-10 rounded-full object-cover ring-2 ring-white"
                    />
                  ) : (
                    <Star className="size-6 text-amber-400" aria-hidden />
                  )}
                </button>
              )
            })}
          </div>

          <p className="text-center text-xs font-bold text-slate-500">
            Còn {remainingInBag} học sinh trong vòng
          </p>

          <ClassroomButton variant="outline" className="min-h-11 w-full" onClick={resetRound}>
            <RotateCcw className="size-4" />
            Làm mới vòng
          </ClassroomButton>
        </div>
      )}
    </ClassroomCard>
  )
}
