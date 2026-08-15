'use client'

import { useMemo, useState } from 'react'
import { Gift, Star } from 'lucide-react'
import type { Student } from '@/src/types/models'
import { useAppData } from '@/src/store/AppDataContext'
import { getStudentAvatar } from '@/src/utils/student'

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
    <section className="flex flex-col rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <header className="mb-4">
        <h2 className="font-display text-base font-extrabold text-slate-800">Ngôi sao may mắn</h2>
        <p className="mt-1 text-xs font-semibold text-slate-500">Chọn một ngôi sao để bất ngờ.</p>
      </header>

      {students.length === 0 ? (
        <p className="py-10 text-center text-sm font-semibold text-slate-400">Chưa có học sinh</p>
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
                  className={`flex aspect-square items-center justify-center rounded-2xl border-2 text-3xl transition ${
                    isPicked
                      ? 'border-amber-400 bg-amber-50 shadow-md'
                      : isDisabled
                        ? 'border-slate-100 bg-slate-50 opacity-40'
                        : 'border-amber-100 bg-amber-50/60 hover:border-amber-300 hover:bg-amber-50'
                  }`}
                >
                  ⭐
                </button>
              )
            })}
          </div>

          {revealedStudent ? (
            <div className="mt-4 flex flex-col items-center gap-2 rounded-2xl bg-violet-50 p-4">
              <img
                src={getStudentAvatar(revealedStudent)}
                alt={revealedStudent.name}
                className="size-14 rounded-full object-cover ring-4 ring-violet-200"
              />
              <p className="text-sm font-extrabold text-slate-800">{revealedStudent.name}</p>
              <p className="flex items-center gap-1 text-xs font-semibold text-violet-600">
                <Star className="size-3 fill-amber-400 text-amber-400" />
                Bất ngờ!
              </p>
            </div>
          ) : null}

          <button
            type="button"
            onClick={resetRound}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-purple py-3 text-sm font-extrabold text-white transition hover:bg-brand-purple-dark"
          >
            <Gift className="size-4" />
            BÍ MẬT MỘT NGÔI SAO
          </button>
        </>
      )}
    </section>
  )
}
