'use client'

import Link from 'next/link'
import { ArrowRight, Star, Trophy } from 'lucide-react'
import { useAppData } from '@/src/store/AppDataContext'
import { getStudentAvatar } from '@/src/utils/student'
import { ClassroomCard, EmptyState } from '@/src/components/classroom'

const TOP_COUNT = 4

export function PointsChallengeStrip() {
  const { data } = useAppData()
  const students = data?.students ?? []

  const topStudents = [...students].sort((a, b) => b.points - a.points).slice(0, TOP_COUNT)

  return (
    <ClassroomCard>
      <header className="mb-4 flex items-start gap-3">
        <span className="flex size-10 items-center justify-center rounded-xl bg-pastel-yellow">
          <Trophy className="size-5 text-amber-600" />
        </span>
        <div className="flex-1">
          <h2 className="font-display text-xl font-black text-slate-800">Thử thách cộng điểm</h2>
          <p className="mt-1 text-sm font-semibold text-slate-500">
            Học sinh tích cực tham gia các hoạt động sẽ được cộng điểm.
          </p>
        </div>
        <Link
          href="/points"
          className="flex shrink-0 items-center gap-1 rounded-2xl bg-brand-purple px-4 py-2 text-xs font-bold text-white transition hover:bg-brand-purple-dark"
        >
          Tích điểm
          <ArrowRight className="size-3.5" />
        </Link>
      </header>

      {topStudents.length === 0 ? (
        <EmptyState
          compact
          emoji="🏅"
          title="Chưa có học sinh"
          description="Tích điểm để xem bảng thử thách tại đây."
        />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {topStudents.map((student, index) => (
            <div
              key={student.id}
              className="flex flex-col items-center rounded-2xl border border-slate-100 bg-slate-50/80 p-4 text-center"
            >
              <img
                src={getStudentAvatar(student)}
                alt={student.name}
                className="size-16 rounded-full object-cover ring-4 ring-white"
              />
              <p className="mt-3 w-full truncate text-base font-extrabold text-slate-700">{student.name}</p>
              <p className="mt-1 flex items-center gap-1 text-lg font-black text-amber-600">
                <Star className="size-4 fill-amber-400 text-amber-400" />
                {student.points}
              </p>
              {index === 0 ? (
                <span className="mt-2 rounded-full bg-pastel-yellow px-2 py-0.5 text-[10px] font-bold text-amber-700">
                  Dẫn đầu
                </span>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </ClassroomCard>
  )
}
