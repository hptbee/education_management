'use client'

import Link from 'next/link'
import { Crown, Star, ArrowRight } from 'lucide-react'
import { useAppData } from '@/src/store/AppDataContext'
import { getStudentAvatar } from '@/src/utils/student'
import { ClassroomCard, EmptyState } from '@/src/components/classroom'

const rankBadge: Record<number, string> = {
  1: 'bg-pastel-yellow text-amber-800 ring-2 ring-amber-200',
  2: 'bg-slate-100 text-slate-600 ring-2 ring-slate-200',
  3: 'bg-pastel-peach text-orange-800 ring-2 ring-orange-200',
}

const rankRow: Record<number, string> = {
  1: 'border-amber-100 bg-pastel-yellow/50',
  2: 'border-slate-100 bg-slate-50',
  3: 'border-orange-100 bg-pastel-peach/40',
}

export function Leaderboard() {
  const { data } = useAppData()
  const students = data?.students || []
  const teams = data?.teams || []

  const topStudents = [...students].sort((a, b) => b.points - a.points).slice(0, 8)

  return (
    <ClassroomCard className="flex flex-col">
      <header className="mb-4 flex items-center gap-2">
        <span className="flex size-8 items-center justify-center rounded-xl bg-pastel-yellow">
          <Crown className="size-4 text-amber-600" />
        </span>
        <h3 className="font-display text-lg font-extrabold text-slate-800">Bảng xếp hạng</h3>
      </header>

      <ul className="flex flex-1 flex-col gap-2 overflow-y-auto pr-1">
        {topStudents.length === 0 ? (
          <li>
            <EmptyState
              compact
              emoji="⭐"
              title="Chưa có dữ liệu xếp hạng"
              description="Tích điểm cho học sinh để bảng xếp hạng hiển thị tại đây."
            />
          </li>
        ) : (
          topStudents.map((s, i) => {
            const rank = i + 1
            const team = teams.find((t) => t.id === s.teamId)

            return (
              <li
                key={s.id}
                className={`flex items-center gap-3 rounded-2xl border px-3 py-2.5 ${
                  rankRow[rank] ?? 'border-sky-50 bg-slate-50/70'
                }`}
              >
                <span
                  className={`flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-extrabold ${
                    rankBadge[rank] ?? 'bg-white text-slate-500'
                  }`}
                >
                  {rank}
                </span>
                <img
                  src={getStudentAvatar(s)}
                  alt={s.name}
                  className="size-9 shrink-0 rounded-full object-cover ring-2 ring-white"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-extrabold text-slate-800">{s.name}</p>
                  <p className="truncate text-[11px] font-bold text-slate-500">
                    {team ? team.name : 'Chưa có tổ'}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1 rounded-full bg-white/80 px-2 py-1">
                  <Star className="size-3.5 fill-star text-star" />
                  <span className="font-display text-sm font-extrabold text-slate-800">{s.points}</span>
                </div>
              </li>
            )
          })
        )}
      </ul>

      <Link
        href="/points"
        className="mt-4 flex items-center justify-center gap-1.5 border-t border-sky-100 pt-4 text-sm font-bold text-brand transition hover:text-brand-dark"
      >
        Tích điểm ngay
        <ArrowRight className="size-4" />
      </Link>
    </ClassroomCard>
  )
}
