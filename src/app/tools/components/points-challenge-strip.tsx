'use client'

import Link from 'next/link'
import { ArrowRight, Star, Trophy } from 'lucide-react'
import { useAppData } from '@/src/store/AppDataContext'
import { StudentAvatar } from '@/src/components/StudentAvatar'
import { rankStudents } from '@/src/utils/ranking'
import { ClassroomCard, EmptyState, AnimatedEntrance } from '@/src/components/classroom'

const TOP_COUNT = 4

export function PointsChallengeStrip() {
  const { data } = useAppData()
  const classroomId = data?.metadata.id
  const students = data?.students ?? []

  const topStudents = rankStudents(students)
    .slice(0, TOP_COUNT)
    .map((entry) => entry.student)

  return (
    <AnimatedEntrance variant="random" staggerIndex={0}>
      <ClassroomCard>
      <header className="mb-4 flex flex-wrap items-start gap-3">
        <span className="flex size-10 items-center justify-center rounded-xl bg-pastel-yellow">
          <Trophy className="size-5 text-amber-600" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-lg font-extrabold text-slate-800">Thử thách cộng điểm</h2>
          <p className="mt-1 text-sm font-semibold text-slate-500">
            Học sinh tích cực tham gia các hoạt động sẽ được cộng điểm.
          </p>
        </div>
        <Link
          href="/points"
          className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-2xl bg-brand-purple px-4 py-2 text-xs font-bold text-white transition hover:bg-brand-purple-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          Tích điểm
          <ArrowRight className="size-3.5" />
        </Link>
      </header>

      {topStudents.length === 0 ? (
        <EmptyState
          compact
          icon={Trophy}
          title="Chưa có học sinh"
          description="Tích điểm để xem bảng thử thách tại đây."
        />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {topStudents.map((student, index) => (
            <div
              key={student.id}
              className={`flex min-h-[11.5rem] flex-col items-center rounded-2xl border p-4 text-center ${
                index === 0
                  ? 'border-amber-100 bg-pastel-yellow/70'
                  : 'border-slate-100 bg-slate-50/80'
              }`}
            >
              <StudentAvatar
                student={student}
                classroomId={classroomId}
                alt={student.name}
                className="size-16 rounded-full ring-4 ring-white"
              />
              <p className="mt-3 w-full truncate text-base font-extrabold text-slate-700">{student.name}</p>
              <p className="mt-1 flex items-center gap-1 text-lg font-black text-amber-600">
                <Star className="size-4 fill-amber-400 text-amber-400" />
                {student.points}
              </p>
              {index === 0 ? (
                <span className="mt-auto rounded-full bg-pastel-yellow px-2 py-0.5 text-[10px] font-bold text-amber-700">
                  #1 · Dẫn đầu
                </span>
              ) : (
                <span className="mt-auto text-[10px] font-bold text-slate-400">#{index + 1}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </ClassroomCard>
    </AnimatedEntrance>
  )
}
