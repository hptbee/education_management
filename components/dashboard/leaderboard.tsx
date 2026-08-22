'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import { Crown, Star, ArrowRight } from 'lucide-react'
import { useAppData } from '@/src/store/AppDataContext'
import { StudentAvatar } from '@/src/components/StudentAvatar'
import {
  buildStudentRanking,
  RANK_BADGE_CLASS,
  RANK_ROW_CLASS,
} from '@/src/utils/ranking'
import { ClassroomCard, EmptyState, ClassroomButton } from '@/src/components/classroom'

export function Leaderboard() {
  const { data } = useAppData()
  const classroomId = data?.metadata.id
  const students = data?.students || []
  const teams = data?.teams || []
  const pointHistory = data?.pointHistory || []

  const topStudents = useMemo(
    () => buildStudentRanking(students, pointHistory, 'all-time').slice(0, 8),
    [students, pointHistory],
  )

  return (
    <ClassroomCard className="flex flex-col">
      <header className="mb-4 flex items-center gap-2">
        <span className="flex size-8 items-center justify-center rounded-xl bg-pastel-yellow">
          <Crown className="size-4 text-amber-600" />
        </span>
        <h3 className="font-display text-lg font-extrabold text-slate-800">Bảng xếp hạng</h3>
      </header>

      <ul className="flex flex-1 flex-col gap-2 overflow-y-auto pr-1">
        {students.length === 0 ? (
          <li>
            <EmptyState
              compact
              icon={Star}
              title="Chưa có dữ liệu xếp hạng"
              description="Tích điểm cho học sinh để bảng xếp hạng hiển thị tại đây."
              action={
                <Link href="/students">
                  <ClassroomButton size="sm">Thêm học sinh</ClassroomButton>
                </Link>
              }
            />
          </li>
        ) : (
          topStudents.map(({ student: s, rank, points }) => {
            const team = teams.find((t) => t.id === s.teamId)

            return (
              <li
                key={s.id}
                className={`flex items-center gap-3 rounded-2xl border px-3 py-2.5 ${
                  RANK_ROW_CLASS[rank] ?? 'border-sky-50 bg-slate-50/70'
                }`}
              >
                <span
                  className={`flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-extrabold ${
                    RANK_BADGE_CLASS[rank] ?? 'bg-white text-slate-500'
                  }`}
                >
                  {rank}
                </span>
                <StudentAvatar
                  student={s}
                  classroomId={classroomId}
                  alt={s.name}
                  className="size-9 shrink-0 rounded-full ring-2 ring-white"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-extrabold text-slate-800">{s.name}</p>
                  <p className="truncate text-[11px] font-bold text-slate-500">
                    {team ? team.name : 'Chưa có tổ'}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1 rounded-full bg-white/80 px-2 py-1">
                  <Star className="size-3.5 fill-star text-star" />
                  <span className="font-display text-sm font-extrabold text-slate-800">{points}</span>
                </div>
              </li>
            )
          })
        )}
      </ul>

      <Link
        href="/ranking"
        className="mt-4 flex items-center justify-center gap-1.5 border-t border-sky-100 pt-4 text-sm font-bold text-brand transition hover:text-brand-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
      >
        Xem bảng xếp hạng đầy đủ
        <ArrowRight className="size-4" />
      </Link>
    </ClassroomCard>
  )
}
