'use client'

import { useMemo, useState } from 'react'
import { Gift, Star } from 'lucide-react'
import type { Student } from '@/src/types/models'
import { useAppData } from '@/src/store/AppDataContext'
import { getStudentAvatar } from '@/src/utils/student'
import { ClassroomCard, ClassroomButton, EmptyState } from '@/src/components/classroom'

const STAR_COUNT = 9

export function LuckyStarTool() {
  const { data } = useAppData()
  const students = data?.students ?? []

  const [revealedStudent, setRevealedStudent] = useState<Student | null>(null)
  const [pickedStarIndex, setPickedStarIndex] = useState<number | null>(null)

  const starIndices = useMemo(() => Array.from({ length: STAR_COUNT }, (_, i) => i), [])

  const resetRound = () => {
    setRevealedStudent(null)
    setPickedStarIndex(null)
  }

  const handleStarClick = (index: number) => {
    if (revealedStudent || students.length === 0) return
    const randomStudent = students[Math.floor(Math.random() * students.length)]
    setPickedStarIndex(index)
    setRevealedStudent(randomStudent)
  }

  return (
    <ClassroomCard className="flex flex-col">
      <header className="mb-4">
        <h2 className="font-display text-lg font-extrabold text-slate-800">Ngôi sao may mắn</h2>
        <p className="mt-1 text-sm font-semibold text-slate-500">Chọn một ngôi sao để bất ngờ.</p>
      </header>

      {students.length === 0 ? (
        <EmptyState
          compact
          emoji="⭐"
          title="Chưa có học sinh"
          description="Thêm học sinh để chơi ngôi sao may mắn."
        />
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2">
            {starIndices.map((index) => {
              const isPicked = pickedStarIndex === index
              const isDisabled = revealedStudent !== null && !isPicked
              return (
                <button
                  key={index}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => handleStarClick(index)}
                  className={`motion-safe-hover flex aspect-square items-center justify-center rounded-2xl border-2 text-4xl transition ${
                    isPicked
                      ? 'border-amber-400 bg-pastel-yellow shadow-md'
                      : isDisabled
                        ? 'border-slate-100 bg-slate-50 opacity-40'
                        : 'border-amber-100 bg-pastel-yellow/60 hover:border-amber-300 hover:bg-pastel-yellow'
                  }`}
                >
                  ⭐
                </button>
              )
            })}
          </div>

          {revealedStudent ? (
            <div className="mt-5 flex flex-col items-center gap-3 rounded-2xl bg-pastel-pink p-5">
              <img
                src={getStudentAvatar(revealedStudent)}
                alt={revealedStudent.name}
                className="size-20 rounded-full object-cover ring-4 ring-brand-purple/20"
              />
              <p className="font-display text-2xl font-black text-slate-800">{revealedStudent.name}</p>
              <p className="flex items-center gap-1 text-sm font-bold text-brand-purple">
                <Star className="size-4 fill-amber-400 text-amber-400" />
                Bất ngờ!
              </p>
            </div>
          ) : null}

          <ClassroomButton size="lg" className="mt-4 w-full" onClick={resetRound}>
            <Gift className="size-4" />
            BÍ MẬT MỘT NGÔI SAO
          </ClassroomButton>
        </>
      )}
    </ClassroomCard>
  )
}
